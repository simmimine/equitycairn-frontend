"use client";

import { Popover } from "@base-ui/react/popover";
import { cn } from "cn";
import { User } from "lucide-react";
import Link from "next/link";
import { useLayoutEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";

/** The first letter of the name on a disc; a person icon without a name. */
export function UserInitial({
  firstName,
  className,
}: {
  firstName: string | null;
  className?: string;
}) {
  const [initial] = firstName?.trim() ?? "";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-[1.875rem] shrink-0 items-center justify-center rounded-full bg-secondary text-[0.8125rem] font-bold text-link md:size-[2.125rem]",
        className,
      )}
    >
      {initial ? initial.toUpperCase() : <User className="size-4" />}
    </span>
  );
}

export function AccountMenu({
  firstName,
  signOutAction,
  settingsHref = "/settings?from=/feed",
}: {
  firstName: string | null;
  signOutAction: () => void | Promise<void>;
  settingsHref?: string;
}) {
  const [open, setOpen] = useState(false);
  // A hidden route keeps its state (Activity): do not come back with this open.
  useLayoutEffect(() => () => setOpen(false), []);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label="Account menu"
        className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserInitial firstName={firstName} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner align="end" sideOffset={8} className="z-30">
          <Popover.Popup className="flex w-56 flex-col gap-3 rounded-[14px] border bg-popover p-3 text-popover-foreground shadow-lg outline-none">
            <Popover.Title className="truncate text-sm font-semibold">
              {firstName?.trim() || "Your account"}
            </Popover.Title>
            <Link
              href={settingsHref}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Settings
            </Link>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
