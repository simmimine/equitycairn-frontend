import { CheckIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function OnboardingStepper({
  labels,
  current,
  className,
}: {
  labels: readonly string[];
  current: number;
  className?: string;
}) {
  return (
    <div className={cn("flex-col gap-5", className)}>
      <p className="mt-2 text-xs font-semibold tracking-wide text-foreground uppercase">
        Your onboarding
      </p>
      <ol className="flex flex-col gap-4">
        {labels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-3"
            >
              <Badge
                variant={active ? "default" : done ? "secondary" : "outline"}
                className="size-[30px] rounded-full p-0 text-[10px] font-bold"
              >
                {done ? (
                  <CheckIcon aria-hidden="true" className="text-primary" />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </Badge>
              <span
                className={cn(
                  "text-xs",
                  active
                    ? "font-bold text-foreground"
                    : "font-medium text-muted-foreground",
                )}
              >
                {label}
                {done && <span className="sr-only"> (completed)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
