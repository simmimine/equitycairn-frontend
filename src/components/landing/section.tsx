import { cn } from "cn";

import { EYEBROW } from "@/components/brand/styles";

/** A below-the-fold section with the hero's eyebrow, bold heading and spacing. */
export function Section({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "mx-auto w-full max-w-[1440px] scroll-mt-20 px-5 py-6 md:px-8 lg:px-16",
        className,
      )}
    >
      <p className={EYEBROW}>{eyebrow}</p>
      <h2
        id={`${id}-title`}
        className="mt-3 text-[17px] font-bold md:text-[22px]"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}
