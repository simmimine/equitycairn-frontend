import { cn } from "cn";

import { Pill } from "@/components/brand/pill";
import { SURFACE } from "@/components/brand/styles";
import { SignupForm, type SignupAction } from "@/components/signup-form";

/** The "Join the beta" card from the hero, reused for the closing sign-up. */
export function BetaCard({
  inputId,
  action,
  className,
  ...props
}: React.ComponentProps<"section"> & {
  inputId: string;
  action?: SignupAction;
}) {
  const headingId = `${inputId}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(SURFACE, "flex flex-col p-[18px] md:p-8", className)}
      {...props}
    >
      <Pill>
        <span
          aria-hidden="true"
          className="size-[7px] rounded-full bg-primary"
        />
        Private beta
      </Pill>
      <h2 id={headingId} className="mt-5 text-xl font-bold md:text-2xl">
        Join the beta
      </h2>
      <p className="mt-2 mb-6 max-w-64 text-xs text-muted-foreground md:text-sm">
        Leave your email and we’ll let you know when your place is ready.
      </p>
      <SignupForm id={inputId} action={action} />
    </section>
  );
}
