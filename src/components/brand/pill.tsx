import { cn } from "cn";

export function Pill({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "flex h-6 w-fit min-w-28 items-center gap-1.5 rounded-full bg-secondary px-3 text-[11px] font-bold tracking-wide uppercase",
        className,
      )}
      {...props}
    />
  );
}
