import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Right-hand explainer card from the design: a title, supporting text and a callout. */
export function InfoCard({
  title,
  children,
  callout,
}: {
  title: string;
  children: ReactNode;
  callout: ReactNode;
}) {
  return (
    <Card className="min-h-[550px] gap-5">
      <CardHeader>
        <CardTitle>
          <h2 className="text-lg font-semibold">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          {children}
        </div>
        <div className="rounded-xl border bg-background p-4 text-xs text-muted-foreground">
          {callout}
        </div>
      </CardContent>
    </Card>
  );
}
