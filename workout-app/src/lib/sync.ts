import type { AppData, Exercise, Plan, Session, Settings } from "./types";

/*
 * Keeps her data in her Claude account through the artifact's `db` capability, so it survives a new
 * phone and stays the same across devices. Each person's data lives in their own private folder
 * (data/users/<id>/): one "profile" document (plan, own exercises, settings) and one document per
 * workout ("s_2026-10-26"). The app always runs from the copy on the device; this mirrors it.
 */

/* The parts of the claude.ai artifact runtime used here (runtime contract 0.2.91). */
interface DbError {
  code: string;
  message: string;
}
interface DocSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}
interface QuerySnapshot {
  docs: DocSnapshot[];
  metadata: { fromCache: boolean; hasPendingWrites: boolean };
}
interface DocumentReference {
  set(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
}
interface CollectionReference {
  doc(id: string): DocumentReference;
  onSnapshot(next: (snap: QuerySnapshot) => void, error?: (e: DbError) => void): () => void;
}
interface Db {
  collection(path: string): CollectionReference;
}
interface UserNs {
  id(): Promise<string | null>;
  can(name: string): Promise<boolean | null>;
}
interface Runtime {
  use(name: string): Promise<unknown>;
}

export type SyncState =
  | "preview" // sample data, never saved to an account
  | "connecting"
  | "synced"
  | "saving"
  | "retrying" // a save failed for a passing reason and will be tried again
  | "signed-out" // no account here: this device only
  | "no-access" // signed in, but this page does not let her save (needs Editor access)
  | "local" // no account storage on this view: this device only
  | "full"; // the account storage for this page is full

const SYNC_KEY = "my-training.sync.v1";

type Bodies = Map<string, Record<string, unknown>>;

/** 53-bit string hash (cyrb53), enough to tell whether a document changed. */
function hash(str: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Key order and dropped `undefined`s differ between the device and the store; compare a sorted form. */
function sorted(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sorted);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) if (o[k] !== undefined) out[k] = sorted(o[k]);
    return out;
  }
  return v;
}

const fingerprint = (v: unknown) => hash(JSON.stringify(sorted(v)));

function fingerprints(b: Bodies): Map<string, string> {
  return new Map([...b].map(([id, body]) => [id, fingerprint(body)]));
}

export function split(data: AppData): Bodies {
  const m: Bodies = new Map();
  m.set("profile", { v: 1, plan: data.plan, custom: data.custom, settings: data.settings });
  for (const [date, s] of Object.entries(data.sessions)) m.set(`s_${date}`, s as unknown as Record<string, unknown>);
  return m;
}

function validPlan(p: unknown): p is Plan {
  if (!p || typeof p !== "object") return false;
  const plan = p as Record<string, { items?: unknown }>;
  return ["sat", "sun", "mon", "tue", "wed", "thu", "fri"].every((k) => Array.isArray(plan[k]?.items));
}

export function join(bodies: Bodies, fallback: AppData): AppData {
  const p = bodies.get("profile") as { plan?: unknown; custom?: unknown; settings?: Partial<Settings> } | undefined;
  const plan = p?.plan;
  const custom = p?.custom;
  const sessions: Record<string, Session> = {};
  for (const [id, b] of bodies) {
    if (!id.startsWith("s_")) continue;
    const s = b as unknown as Session;
    if (typeof s.date === "string" && Array.isArray(s.entries)) sessions[s.date] = s;
  }
  return structuredClone({
    v: 1,
    plan: validPlan(plan) ? plan : fallback.plan,
    custom: Array.isArray(custom) ? (custom as Exercise[]) : fallback.custom,
    settings: { ...fallback.settings, ...(p?.settings ?? {}) },
    sessions,
  });
}

interface Saved {
  uid: string;
  mirror: Record<string, string>;
}

/** How the engine reaches the app: read the newest state, adopt a merged one, report status, build defaults. */
interface SyncIO {
  get: () => AppData;
  replace: (d: AppData) => void;
  status: (s: SyncState) => void;
  fresh: () => AppData;
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s && typeof s.uid === "string" && s.mirror && typeof s.mirror === "object" ? s : null;
  } catch {
    return null;
  }
}

export class Sync {
  private col: CollectionReference | null = null;
  private uid: string | null = null;
  /** What the account holds: document id -> fingerprint. */
  private mirror = new Map<string, string>();
  /** The mirror saved on this device by an earlier visit; null on the first visit with this account here. */
  private known: Map<string, string> | null = null;
  /** The copy on this device belongs to a different account. */
  private foreign = false;
  private ready = false;
  private blocked = false;
  private busy = false;
  private again = false;
  private stopped = false;
  private timer = 0;
  private retryMs = 0;
  private unsub: (() => void) | null = null;
  private io: SyncIO;

  constructor(io: SyncIO) {
    this.io = io;
  }

  async start() {
    const rt = (window as unknown as { claude?: Runtime }).claude;
    if (!rt || typeof rt.use !== "function") return this.io.status("local");
    this.io.status("connecting");
    let db: Db | null = null;
    let user: UserNs | null = null;
    try {
      [db, user] = (await Promise.all([rt.use("db"), rt.use("user")])) as [Db | null, UserNs | null];
    } catch {
      /* treated as unavailable below */
    }
    if (this.stopped) return;
    if (!db || !user) return this.io.status("local");
    const uid = await user.id();
    if (this.stopped) return;
    if (!uid) return this.io.status("signed-out");
    this.uid = uid;
    if ((await user.can("data.write")) === false) this.blocked = true;

    const saved = readSaved();
    this.foreign = !!saved && saved.uid !== uid;
    this.known = saved && saved.uid === uid ? new Map(Object.entries(saved.mirror)) : null;
    this.col = db.collection(`data/users/${uid}`);
    this.subscribe();
  }

  stop() {
    this.stopped = true;
    this.unsub?.();
    this.unsub = null;
    window.clearTimeout(this.timer);
  }

  /** Call after every local change; writes are coalesced into one per pause. */
  schedule(ms = 700) {
    if (!this.col || !this.ready || this.blocked || this.stopped) return;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), ms);
  }

  private subscribe() {
    if (!this.col || this.stopped) return;
    this.unsub = this.col.onSnapshot(
      (snap) => this.onSnapshot(snap),
      (e) => {
        this.unsub = null;
        const code = e?.code;
        if (code === "unavailable" || code === "resource_exhausted" || !code) {
          window.setTimeout(() => this.subscribe(), 5000);
          return;
        }
        this.stop();
        this.io.status("local");
      },
    );
  }

  private onSnapshot(snap: QuerySnapshot) {
    if (this.stopped) return;
    const remote: Bodies = new Map();
    for (const d of snap.docs) {
      const body = d.exists ? d.data() : undefined;
      if (body) remote.set(d.id, body);
    }
    if (!this.ready) {
      // Merge only against the account's definitive answer, never a partial first page.
      if (snap.metadata.fromCache) return;
      this.reconcile(remote);
      this.ready = true;
      this.io.status(this.blocked ? "no-access" : "synced");
      this.schedule(0);
      return;
    }
    this.absorb(remote);
  }

  /** First full view of the account this visit: decide, document by document, which side wins. */
  private reconcile(remote: Bodies) {
    const current = this.io.get();
    const local = this.foreign ? split(this.io.fresh()) : split(current);
    const lh = fingerprints(local);
    const rh = fingerprints(remote);
    // An account that comes back empty after holding data is re-filled from here, never used to wipe this device.
    const known = this.known && this.known.size && remote.size === 0 ? null : this.known;
    const merged: Bodies = new Map();
    let fromRemote = this.foreign;
    for (const id of new Set([...local.keys(), ...remote.keys()])) {
      const L = lh.get(id);
      const R = rh.get(id);
      if (L === R) {
        merged.set(id, local.get(id)!);
        continue;
      }
      // With an earlier sync on record, an untouched document takes the account's version;
      // on a first visit the account wins wherever it has the document.
      const takeRemote = known ? L === known.get(id) : R !== undefined;
      if (takeRemote) {
        fromRemote = true;
        if (R !== undefined) merged.set(id, remote.get(id)!);
      } else if (L !== undefined) merged.set(id, local.get(id)!);
    }
    this.mirror = rh;
    this.save();
    if (fromRemote) this.io.replace(join(merged, this.foreign ? this.io.fresh() : current));
  }

  /** A later change from another device: take it unless this device has its own unsaved edit. */
  private absorb(remote: Bodies) {
    if (remote.size === 0 && this.mirror.size > 0) return; // a sudden empty view is not trusted
    const local = split(this.io.get());
    const lh = fingerprints(local);
    const rh = fingerprints(remote);
    const merged: Bodies = new Map(local);
    let changed = false;
    for (const id of new Set([...rh.keys(), ...this.mirror.keys()])) {
      const R = rh.get(id);
      const M = this.mirror.get(id);
      if (R === M) continue;
      const L = lh.get(id);
      if (L === M && L !== R) {
        if (R === undefined) merged.delete(id);
        else merged.set(id, remote.get(id)!);
        changed = true;
      }
      if (R === undefined) this.mirror.delete(id);
      else this.mirror.set(id, R);
    }
    this.save();
    if (changed) this.io.replace(join(merged, this.io.get()));
    this.schedule();
  }

  private pending(): [string, Record<string, unknown> | null, string | null][] {
    const local = split(this.io.get());
    const out: [string, Record<string, unknown> | null, string | null][] = [];
    const untouched = fingerprint(split(this.io.fresh()).get("profile"));
    for (const [id, body] of local) {
      const h = fingerprint(body);
      if (this.mirror.get(id) === h) continue;
      // The default plan is not worth a write until she changes something.
      if (id === "profile" && !this.mirror.has(id) && h === untouched) continue;
      out.push([id, body, h]);
    }
    for (const id of this.mirror.keys()) if (!local.has(id)) out.push([id, null, null]);
    return out;
  }

  private async flush() {
    if (!this.col || this.blocked || this.stopped) return;
    if (this.busy) {
      this.again = true;
      return;
    }
    this.busy = true;
    try {
      for (;;) {
        const work = this.pending();
        if (!work.length) break;
        this.io.status("saving");
        for (const [id, body, h] of work) {
          // One write at a time, and the store wants plain JSON.
          if (body) await this.col.doc(id).set(JSON.parse(JSON.stringify(body)) as Record<string, unknown>);
          else await this.col.doc(id).delete();
          if (h) this.mirror.set(id, h);
          else this.mirror.delete(id);
          this.save();
        }
      }
      this.retryMs = 0;
      this.io.status("synced");
    } catch (e) {
      this.onWriteError(e as DbError);
    } finally {
      this.busy = false;
      if (this.again) {
        this.again = false;
        this.schedule(0);
      }
    }
  }

  private onWriteError(e: DbError | undefined) {
    const code = e?.code;
    if (code === "invalid_argument" || code === "transform_error") {
      // A well-formed write refused: this person can read the page but not save to it.
      this.blocked = true;
      this.io.status("no-access");
      return;
    }
    if (code === "quota_exceeded") return this.io.status("full");
    if (code === "revoked" || code === "not_granted" || code === "capability_disabled" || code === "capability_removed") {
      this.stop();
      this.io.status("local");
      return;
    }
    this.retryMs = Math.min(60000, this.retryMs ? this.retryMs * 2 : 3000);
    this.io.status("retrying");
    this.schedule(this.retryMs);
  }

  private save() {
    if (!this.uid) return;
    try {
      localStorage.setItem(SYNC_KEY, JSON.stringify({ uid: this.uid, mirror: Object.fromEntries(this.mirror) }));
    } catch {
      /* storage full or blocked: the next visit simply re-checks every document */
    }
  }
}
