---
name: Drizzle push TTY workaround
description: drizzle-kit push requires a TTY terminal for interactive prompts (e.g. adding unique constraints to tables with data). Use a raw SQL script via pool.query() instead.
---

## Rule
Never run `pnpm --filter @workspace/db run push` in CI or agent contexts — it will fail with "Interactive prompts require a TTY terminal" when there is any schema change that needs confirmation (adding unique constraints, renaming columns, etc.).

**Why:** drizzle-kit push uses interactive prompts to confirm destructive or risky operations (like adding a unique constraint to a non-empty table). These prompts require a real TTY, which agents/CI don't have.

**How to apply:** Use a raw SQL migration script that connects via `@workspace/db`'s exported `pool`:

```typescript
import { pool } from "@workspace/db";

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}
main();
```

Add the script to `scripts/src/migrate.ts` and run via:
`pnpm --filter @workspace/scripts run migrate`

Use `IF NOT EXISTS` and `DO $$ BEGIN ... END $$` blocks to make the script idempotent.
