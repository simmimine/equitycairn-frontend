import { useId } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

/**
 * Single-choice pill cards (design step 2). Built on shadcn's radio-card pattern:
 * the card is the label, the radio itself is visually hidden but keyboard-operable.
 */
export function OptionCards({
  legend,
  value,
  onValueChange,
  options,
  className,
  clearable = true,
  legendClassName,
  cardClassName,
}: {
  legend: string;
  value: string;
  onValueChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  className?: string;
  /** False where one of the options already means "no answer". */
  clearable?: boolean;
  legendClassName?: string;
  cardClassName?: string;
}) {
  const legendId = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p
          id={legendId}
          className={cn("text-sm font-semibold", legendClassName)}
        >
          {legend}
        </p>
        {clearable && value && (
          <Button
            type="button"
            variant="link"
            size="xs"
            aria-label={`Clear answer: ${legend}`}
            onClick={() => onValueChange("")}
          >
            Clear
          </Button>
        )}
      </div>
      <RadioGroup
        aria-labelledby={legendId}
        value={value}
        onValueChange={(v) => onValueChange(String(v))}
        className={cn("flex flex-wrap gap-3", className)}
      >
        {options.map(([v, label]) => (
          <FieldLabel key={v} className={cn("!w-auto", cardClassName)}>
            <Field orientation="horizontal" className="!w-auto rounded-xl px-4">
              <FieldContent>
                <FieldTitle className="text-sm font-medium">{label}</FieldTitle>
              </FieldContent>
              <RadioGroupItem value={v} className="sr-only" />
            </Field>
          </FieldLabel>
        ))}
      </RadioGroup>
    </div>
  );
}
