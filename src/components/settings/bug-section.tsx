"use client";

import { useState, useTransition } from "react";

import type { reportBugAction } from "@/app/actions/bug-report";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { attempt } from "@/lib/attempt";
import { BUG_TEXT_MAX } from "@/lib/bugs/schema";

import {
  ACTION,
  FormStatus,
  GENERIC_ERROR,
  LABEL,
  SettingsCard,
  type Status,
} from "./parts";

const ERRORS: Record<string, string> = {
  invalid: `Tell us what happened, in ${BUG_TEXT_MAX} characters or fewer.`,
  rate_limited: "Too many reports. Please try again later.",
};

const BOX = "rounded-[10px] bg-background";

export function BugSection({
  fromPath,
  report,
}: {
  fromPath: string | null;
  report: typeof reportBugAction;
}) {
  const [whatHappened, setWhatHappened] = useState("");
  const [expected, setExpected] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setStatus(null);
    startTransition(async () => {
      const result = await attempt(() =>
        report({
          whatHappened,
          expected,
          pagePath: fromPath ?? "",
          browser: navigator.userAgent,
          screen: `${window.innerWidth}x${window.innerHeight}`,
        }),
      );
      if (result.ok) {
        setWhatHappened("");
        setExpected("");
        setStatus({ tone: "ok", text: "Thanks, your report was sent." });
      } else if (result.error === "unauthenticated") {
        setStatus({ tone: "ended" });
      } else {
        setStatus({
          tone: "error",
          text: ERRORS[result.error] ?? GENERIC_ERROR,
        });
      }
    });
  }

  return (
    <SettingsCard id="bug" title="Report a bug">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field>
          <FieldLabel htmlFor="setting-bug" className={LABEL}>
            What happened?
          </FieldLabel>
          <Textarea
            id="setting-bug"
            required
            maxLength={BUG_TEXT_MAX}
            placeholder="Tell us what went wrong"
            value={whatHappened}
            onChange={(event) => setWhatHappened(event.target.value)}
            className={`${BOX} min-h-24`}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="setting-bug-expected" className={LABEL}>
            What did you expect? (optional)
          </FieldLabel>
          <Textarea
            id="setting-bug-expected"
            maxLength={BUG_TEXT_MAX}
            placeholder="What should have happened"
            value={expected}
            onChange={(event) => setExpected(event.target.value)}
            className={`${BOX} min-h-18`}
          />
        </Field>
        <p className="text-[0.6875rem] text-muted-foreground">
          We attach the page you came from, your browser and your screen size.
        </p>
        <FormStatus status={status} />
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className={ACTION + " md:self-start md:px-6"}
        >
          Send report
        </Button>
      </form>
    </SettingsCard>
  );
}
