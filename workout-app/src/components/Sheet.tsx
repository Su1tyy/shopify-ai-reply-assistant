import type { ReactNode } from "react";
import { Drawer } from "vaul";

/** Bottom sheet with drag-to-dismiss (vaul). `tall` gives lists a near full-height sheet. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  tall = false,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  tall?: boolean;
  children: ReactNode;
}) {
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[70]" style={{ background: "var(--scrim)" }} />
        <Drawer.Content
          className="fixed inset-x-0 bottom-0 z-[71] mx-auto flex max-w-[560px] flex-col rounded-t-[22px] bg-bg outline-none"
          style={{ height: tall ? "calc(100dvh - 44px)" : undefined, maxHeight: "calc(100dvh - 44px)" }}
        >
          <div aria-hidden="true" className="mx-auto mb-1 mt-2 h-[5px] w-9 shrink-0 rounded-full bg-fill-strong" />
          <Drawer.Title className="sr-only">{title}</Drawer.Title>
          <Drawer.Description className="sr-only">{description ?? title}</Drawer.Description>
          {children}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
