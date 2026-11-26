import { cn } from "cn";
import Link from "next/link";

import { SURFACE, TEXT_LINK } from "@/components/brand/styles";

/** One settings card; `id` is what the section links point to. */
export function SettingsCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      tabIndex={-1}
      className={cn(
        SURFACE,
        "flex flex-col gap-4 rounded-[14px] p-[18px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:p-6",
      )}
    >
      <h2 id={`${id}-title`} className="text-base font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

export type Status = { tone: "ok" | "error" | "ended"; text?: string } | null;

/** Announces how a form action went. */
export function FormStatus({ status }: { status: Status }) {
  return (
    <div role="status" className="empty:hidden">
      {status?.tone === "ended" ? (
        <p className="flex flex-wrap gap-2 text-sm text-destructive">
          Your session has ended.
          <Link href="/login" className={TEXT_LINK}>
            Log in
          </Link>
        </p>
      ) : status ? (
        <p
          className={cn(
            "text-sm",
            status.tone === "error" && "text-destructive",
          )}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
}

/** Buttons are full width and taller on phones, as on the design boards. */
export const ACTION = "h-11 w-full text-xs font-semibold md:h-9 md:w-auto";
export const LABEL = "text-xs font-semibold";
export const FIELD = "h-11 rounded-[10px] bg-background md:h-10";
export const GENERIC_ERROR = "Something went wrong, please try again.";
