"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

export type CooldownResult =
  | { ok: true; retryAfterSeconds: number }
  | { ok: false; error: string; retryAfterSeconds?: number };

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}

/** Re-send button whose countdown comes from the server; the server enforces the cooldown. */
export function CooldownButton({
  initialCooldownSeconds,
  onResend,
}: {
  initialCooldownSeconds: number;
  onResend: () => Promise<CooldownResult>;
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
    const t = Date.now();
    setNow(t);
    setDeadline(t + seconds * 1000);
  }

  async function onClick() {
    if (inFlight.current || counting) return;
    inFlight.current = true;
    setPending(true);
    setError(false);
    setSent(false);
    try {
      const result = await onResend();
      if (result.ok) {
        setSent(true);
        restart(result.retryAfterSeconds);
      } else if (result.retryAfterSeconds) {
        restart(result.retryAfterSeconds);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
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
      {error && <FieldError>Something went wrong, please try again</FieldError>}
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {sent ? "If that was needed, we've sent a new email" : null}
      </p>
    </div>
  );
}
