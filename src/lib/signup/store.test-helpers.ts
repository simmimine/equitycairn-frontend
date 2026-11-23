/**
 * Minimal in-memory fake of the Supabase query-builder calls used by the
 * signup store. Unsupported calls throw loudly instead of being ignored.
 */
type Row = Record<string, unknown>;
type Result = {
  data: unknown;
  error: { code?: string; message: string } | null;
};
type Predicate = (row: Row) => boolean;

const UNIQUE_HASH_COLUMNS = ["verify_token_hash", "manage_token_hash"];

function time(value: unknown): number {
  return new Date(String(value)).getTime();
}

function parseOr(expr: string): Predicate {
  const clauses = expr.split(",").map((clause): Predicate => {
    const m = /^([a-z_]+)\.(is|lte|gt)\.(.+)$/.exec(clause);
    if (!m) throw new Error(`fake: unsupported or() clause: ${clause}`);
    const [, col, op, val] = m;
    if (op === "is") {
      if (val !== "null") throw new Error(`fake: unsupported is value ${val}`);
      return (r) => r[col] == null;
    }
    if (op === "lte") return (r) => r[col] != null && time(r[col]) <= time(val);
    return (r) => r[col] != null && time(r[col]) > time(val);
  });
  return (row) => clauses.some((c) => c(row));
}

export class FakeDb {
  rows: Row[] = [];
  rpcImpl: (fn: string, args: Record<string, unknown>) => Result["data"] =
    () => {
      throw new Error("fake: rpc not configured");
    };
  rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  private nextId = 1;

  from(table: string) {
    if (table !== "beta_signups")
      throw new Error(`fake: unknown table ${table}`);
    return new FakeQuery(this);
  }

  rpc(fn: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ fn, args });
    return Promise.resolve({ data: this.rpcImpl(fn, args), error: null });
  }

  insertRow(row: Row): Result {
    const email = String(row.email ?? "").toLowerCase();
    if (this.rows.some((r) => String(r.email).toLowerCase() === email)) {
      return {
        data: null,
        error: { code: "23505", message: "duplicate email" },
      };
    }
    for (const col of UNIQUE_HASH_COLUMNS) {
      if (row[col] != null && this.rows.some((r) => r[col] === row[col])) {
        return {
          data: null,
          error: { code: "23505", message: `duplicate ${col}` },
        };
      }
    }
    this.rows.push({
      id: `00000000-0000-4000-8000-${String(this.nextId++).padStart(12, "0")}`,
      verify_token_hash: null,
      verify_expires_at: null,
      verified_at: null,
      manage_token_hash: null,
      last_email_sent_at: null,
      ...row,
    });
    return { data: null, error: null };
  }
}

class FakeQuery implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | null = null;
  private payload: Row = {};
  private preds: Predicate[] = [];
  private returning = false;
  private single = false;

  constructor(private db: FakeDb) {}

  select() {
    if (this.op === null) this.op = "select";
    else this.returning = true;
    return this;
  }
  insert(row: Row) {
    this.op = "insert";
    this.payload = row;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  eq(col: string, val: unknown) {
    this.preds.push((r) => r[col] === val);
    return this;
  }
  is(col: string, val: null) {
    if (val !== null) throw new Error("fake: is() supports null only");
    this.preds.push((r) => r[col] == null);
    return this;
  }
  lte(col: string, val: string) {
    this.preds.push((r) => r[col] != null && time(r[col]) <= time(val));
    return this;
  }
  gt(col: string, val: string) {
    this.preds.push((r) => r[col] != null && time(r[col]) > time(val));
    return this;
  }
  or(expr: string) {
    this.preds.push(parseOr(expr));
    return this;
  }
  maybeSingle() {
    this.single = true;
    return this;
  }

  private run(): Result {
    if (this.op === null) throw new Error("fake: no operation");
    if (this.op === "insert") return this.db.insertRow(this.payload);
    const matched = this.db.rows.filter((r) => this.preds.every((p) => p(r)));
    let out = matched;
    if (this.op === "update") {
      for (const row of matched) {
        for (const col of UNIQUE_HASH_COLUMNS) {
          const next = this.payload[col];
          if (
            next != null &&
            this.db.rows.some((r) => r !== row && r[col] === next)
          ) {
            return {
              data: null,
              error: { code: "23505", message: `duplicate ${col}` },
            };
          }
        }
      }
      for (const row of matched) Object.assign(row, this.payload);
      if (!this.returning) return { data: null, error: null };
      out = matched;
    }
    out = out.map((r) => ({ ...r }));
    if (this.single) {
      if (out.length > 1) {
        return {
          data: null,
          error: { code: "PGRST116", message: "multiple rows" },
        };
      }
      return { data: out[0] ?? null, error: null };
    }
    return { data: out, error: null };
  }

  then<A = Result, B = never>(
    onfulfilled?: ((value: Result) => A | PromiseLike<A>) | null,
    onrejected?: ((reason: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }
}
