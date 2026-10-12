import { readFileSync, writeFileSync } from "node:fs";
const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
writeFileSync(new URL("../lib/schema-sql.ts", import.meta.url), "// Generated from db/schema.sql by scripts/gen-schema.mjs. Do not edit.\nexport const SCHEMA_SQL = " + JSON.stringify(sql) + ";\n");
