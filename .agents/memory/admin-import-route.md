---
name: Admin import route body format
description: POST /api/admin/participants/import expects a raw JSON array body, not a wrapped object.
---

## Rule
The import endpoint reads `req.body as Array<{name?,email?,phone?}>` directly — it is NOT wrapped in a `{rows:[...]}` envelope.

**Why:** The route was written to accept a raw array for simplicity. Frontend must send `JSON.stringify(importRows)`, not `JSON.stringify({rows: importRows})`.

**How to apply:** When consuming this endpoint from the frontend, confirm the response with `res.ok` before destructuring, and handle the error shape `{error: string}` gracefully since it differs from the success shape `{created,updated,failed,errors}`.
