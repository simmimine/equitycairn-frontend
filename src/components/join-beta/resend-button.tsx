"use client";

import { useEffect, useRef, useState } from "react";

import { resendVerification } from "@/app/actions/resend-verification";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { attempt } from "@/lib/attempt";
import type { ResendResult } from "@/lib/signup/types";

const SUCCESS_MESSAGE = "If your address is on the list, we've sent a new link";
const ERROR_MESSAGE = "Something went wrong, please try again";

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function ResendButton({
  token,
  initialCooldownSeconds,
  resend = resendVerification,
}: {
  token: string;
  initialCooldownSeconds: number;
  resend?: (token: string) => Promise<ResendResult>;
}) {
  const [start] = useState(() => Date.now());
  const [deadline, setDeadline] = useState(
    () => start + initialCooldownSeconds * 1000,
  );
  const [now, setNow] = useState(start);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);
  const inFlight = useRef(false);

  const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
  const counting = remaining > 0;

  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [counting, deadline]);

  function restart(seconds: number) {
    const start = Date.now();
    setNow(start);
    setDeadline(start + seconds * 1000);
  }

  async function onClick() {
    if (inFlight.current || counting) return;
    inFlight.current = true;
    setPending(true);
    setError(false);
    setSent(false);
    try {
      const result = await attempt(() => resend(token));
      if (result.ok) {
        setSent(true);
        restart(result.retryAfterSeconds);
      } else if (result.error === "cooldown") {
        restart(result.retryAfterSeconds);
      } else {
        setError(true);
      }
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        size="xl"
        disabled={pending || counting}
        aria-busy={pending}
        onClick={onClick}
      >
        {pending && <Spinner data-icon="inline-start" aria-hidden="true" />}
        {counting
          ? `Re-send available in ${formatSeconds(remaining)}`
          : "Resend confirmation email"}
      </Button>
      {error && <FieldError>{ERROR_MESSAGE}</FieldError>}
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {sent ? SUCCESS_MESSAGE : null}
      </p>
    </div>
  );
}
