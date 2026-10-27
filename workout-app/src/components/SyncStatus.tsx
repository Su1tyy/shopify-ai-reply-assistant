import { CloudArrowUp, CloudCheck, CloudSlash, CloudWarning } from "@phosphor-icons/react";
import { useState } from "react";
import { useStore } from "../lib/store";
import type { SyncState } from "../lib/sync";

function copy(s: SyncState): { title: string; detail?: string; tone: "ok" | "busy" | "warn" } {
  switch (s) {
    case "synced":
      return { title: "Saved to your Claude account", tone: "ok" };
    case "saving":
      return { title: "Saving…", tone: "busy" };
    case "connecting":
      return { title: "Connecting to your account…", tone: "busy" };
    case "retrying":
      return { title: "Couldn't reach your account", detail: "Everything is safe on this phone. Trying again shortly.", tone: "warn" };
    case "signed-out":
      return { title: "Saved on this phone only", detail: "Sign in to Claude to keep your workouts in your account too.", tone: "warn" };
    case "no-access":
      return {
        title: "Saved on this phone only",
        detail: "Saving to your account needs Editor access to this page. Ask the person who shared it with you.",
        tone: "warn",
      };
    case "local":
      return {
        title: "Saved on this device only",
        detail: "Sign in to Claude and open this page there to keep your workouts in your account.",
        tone: "warn",
      };
    case "full":
      return { title: "Account storage is full", detail: "New workouts stay on this phone until there is room again.", tone: "warn" };
    case "preview":
      return { title: "Preview with sample data", detail: "Nothing here is saved to an account.", tone: "ok" };
  }
}

// The state the notice was dismissed for, so it stays hidden while switching tabs.
let dismissed: SyncState | null = null;

/** Shown on Today only when her workouts are not reaching her account. */
export function SyncNotice() {
  const { sync } = useStore();
  const [hidden, setHidden] = useState<SyncState | null>(dismissed);
  const warn = sync === "signed-out" || sync === "no-access" || sync === "local" || sync === "full";
  if (!warn || hidden === sync) return null;
  const c = copy(sync);
  return (
    <div className="card flex gap-3 px-4 py-3.5" role="status">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fill text-ink-2">
        <CloudSlash size={18} weight="bold" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="t-headline">{c.title}</div>
        <p className="mt-0.5 t-foot text-ink-2">{c.detail}</p>
      </div>
      <button
        onClick={() => {
          dismissed = sync;
          setHidden(sync);
        }}
        className="press -mr-1 -mt-1 h-9 shrink-0 px-2 t-foot font-semibold text-accent-strong"
      >
        OK
      </button>
    </div>
  );
}

/** Settings row that always says where her data is being kept. */
export function SyncRow() {
  const { sync } = useStore();
  const c = copy(sync);
  const Icon = c.tone === "ok" ? CloudCheck : c.tone === "busy" ? CloudArrowUp : CloudWarning;
  return (
    <div className="group relative flex min-h-[52px] items-center gap-3 px-4 py-2.5" role="status">
      <span className="absolute left-4 right-0 top-0 h-[0.5px] bg-line group-first:hidden" />
      <Icon size={22} weight={c.tone === "warn" ? "regular" : "fill"} className={`shrink-0 ${c.tone === "warn" ? "text-ink-2" : "text-accent"}`} />
      <div className="min-w-0 flex-1">
        <div className="t-body">{c.title}</div>
        {c.detail && <div className="mt-0.5 t-foot text-ink-2">{c.detail}</div>}
      </div>
    </div>
  );
}
