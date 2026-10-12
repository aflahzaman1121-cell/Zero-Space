// Database access. Production: Postgres via DATABASE_URL. Local/test: built-in PGlite (real Postgres in WASM).
import { SCHEMA_SQL } from "./schema-sql";

export type Row = Record<string, any>;
export interface DB {
  query<T = Row>(text: string, params?: any[]): Promise<T[]>;
  tx<T>(fn: (db: DB) => Promise<T>): Promise<T>;
}

const g = globalThis as unknown as { __zsDb?: Promise<DB> };

async function open(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  let db: DB;
  if (url) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(url, { max: 5, prepare: false, ssl: url.includes("localhost") ? false : "require" });
    const wrap = (s: any): DB => ({
      query: async (text, params = []) => (await s.unsafe(text, params)) as any,
      tx: (fn) => s.begin((t: any) => fn(wrap(t))),
    });
    db = wrap(sql);
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = process.env.PGLITE_DIR ?? (process.env.NODE_ENV === "test" ? undefined : ".data/pglite");
    if (dir) (await import("node:fs")).mkdirSync(dir, { recursive: true });
    const pg = dir ? new PGlite(dir) : new PGlite();
    const wrap = (s: any): DB => ({
      query: async (text, params = []) => (await s.query(text, params)).rows as any,
      tx: (fn) => s.transaction((t: any) => fn(wrap(t))),
    });
    db = wrap(pg);
  }
  await db.query("select 1");
  // Schema is idempotent, so applying it on every cold start is safe.
  for (const stmt of SCHEMA_SQL.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) await db.query(stmt);
  return db;
}

export function getDB(): Promise<DB> {
  if (!g.__zsDb) g.__zsDb = open();
  return g.__zsDb;
}

export async function resetDBForTests() {
  g.__zsDb = undefined;
}
