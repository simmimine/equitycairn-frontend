import { cn } from "cn";
import { CheckIcon, MailIcon, type LucideIcon } from "lucide-react";

import { Pill } from "@/components/brand/pill";
import { SURFACE } from "@/components/brand/styles";

const ICONS = { mail: MailIcon, check: CheckIcon } satisfies Record<
  string,
  LucideIcon
>;

/** The form card on the right of every sign-up and login board. */
export function AuthCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon?: keyof typeof ICONS;
  children?: React.ReactNode;
}) {
  const Icon = icon && ICONS[icon];
  return (
    <div
      data-testid="auth-card"
      className={cn(
        SURFACE,
        "flex flex-col rounded-[18px] p-[18px] md:p-10 lg:min-h-[708px]",
      )}
    >
      <Pill className="text-link">EquityCairn</Pill>
      <h1 className="mt-6 text-[22px] font-bold md:text-[25px]">{title}</h1>
      {description && (
        <p className="mt-3 max-w-72 text-xs leading-5 text-muted-foreground md:max-w-80">
          {description}
        </p>
      )}
      {Icon && (
        <span
          aria-hidden="true"
          className="mt-6 flex size-[54px] items-center justify-center self-center rounded-full bg-secondary text-link"
        >
          <Icon className="size-6" />
        </span>
      )}
      <div className="mt-5 flex flex-1 flex-col gap-4">{children}</div>
    </div>
  );
}

/** The pale inset box used for notices and the chosen email address. */
export function AuthNotice({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-h-9 items-center justify-between gap-3 rounded-[9px] border border-secondary bg-background px-4 py-3 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
