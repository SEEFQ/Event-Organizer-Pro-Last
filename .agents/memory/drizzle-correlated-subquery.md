---
name: Drizzle correlated subquery parameterization bug
description: Using ${tableObj.column} inside a Drizzle sql`` tagged template in a correlated subquery produces a fixed bound parameter, not a per-row column reference.
---

## Rule
Inside a Drizzle `sql` tagged template used as a **correlated subquery** in a SELECT, never write `${sponsorsTable.id}` or `${eventsTable.id}`. Write the raw SQL alias instead: `sponsors.id`, `events.id`, etc.

**Why:** Drizzle parameterizes `${column}` as a bound `$N` parameter at query compile time. In a correlated subquery, that parameter is bound to a fixed value (not the current row), so all rows get the same count — silently wrong.

**How to apply:**
- OK for outer WHERE clause: `.where(eq(sponsorsTable.id, id))` — Drizzle handles this correctly
- BROKEN in subquery template: `WHERE si.sponsor_id = ${sponsorsTable.id}` → use `WHERE si.sponsor_id = sponsors.id`

## Example fix
```ts
// WRONG — produces fixed parameter
sql<number>\`(SELECT COUNT(*) FROM sponsor_impressions WHERE sponsor_id = \${sponsorsTable.id})::int\`

// CORRECT — correlated per-row
sql<number>\`(SELECT COUNT(*) FROM sponsor_impressions si WHERE si.sponsor_id = sponsors.id)::int\`
```

Applied in both sponsors.ts (5 subqueries) and events.ts (confirmed-registrations count).
