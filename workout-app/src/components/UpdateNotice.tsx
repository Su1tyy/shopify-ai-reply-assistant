import { Sparkle } from "@phosphor-icons/react";
import { useState } from "react";
import { useNav } from "../lib/nav";
import { clearUpgradeNotice, upgradeNoticePending } from "../lib/store";

/** Says once what changed when her saved plan was brought up to date. */
export function UpdateNotice() {
  const { push } = useNav();
  const [show, setShow] = useState(upgradeNoticePending);
  if (!show) return null;
  const dismiss = () => {
    clearUpgradeNotice();
    setShow(false);
  };
  return (
    <div className="card flex gap-3 px-4 py-4" role="status">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-strong">
        <Sparkle size={18} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="t-headline">Your back day got an upgrade</div>
        <p className="mt-0.5 t-foot text-ink-2">
          Sunday now trains every part of your back: lats, mid back, upper back and lower back. Monday adds bird dogs for a
          stronger lower back.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => {
              dismiss();
              push({ name: "dayEditor", key: "sun" });
            }}
            className="press h-9 rounded-full bg-btn px-3.5 t-foot font-semibold text-btn-fg"
          >
            See Sunday
          </button>
          <button onClick={dismiss} className="press h-9 rounded-full px-3 t-foot font-semibold text-ink-2">
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
