import { cn } from "cn";

import { CONTAINER } from "@/components/brand/styles";

export function SiteFooter() {
  return (
    <footer className={cn(CONTAINER, "py-8 text-[11px] text-muted-foreground")}>
      <p>
        EquityCairn organizes company news and links to publishers; it doesn’t
        provide investment advice.
      </p>
    </footer>
  );
}
