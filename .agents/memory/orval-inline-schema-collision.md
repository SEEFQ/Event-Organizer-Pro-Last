---
name: Orval split-mode inline schema collision
description: Inline requestBody schemas in OpenAPI (not using $ref) cause duplicate TypeScript export errors when using Orval's split mode with both Zod client and TypeScript schema output.
---

## Rule
Always use `$ref: "#/components/schemas/NamedSchema"` for request body schemas in the OpenAPI spec. Never use inline `type: object` schemas directly in requestBody for the Orval-generated codebase.

**Why:** Orval in `mode: "split"` with `schemas: { type: "typescript" }` generates:
1. A Zod schema in `generated/api.ts` (e.g. `AdminChangeParticipantPhoneBody`)
2. A TypeScript type in `generated/types/adminChangeParticipantPhoneBody.ts`

When `api-zod/src/index.ts` does `export * from './generated/api'` and `export * from './generated/types'`, TypeScript sees the same name exported from two modules and throws TS2308.

**How to apply:** For any endpoint that needs a request body with an inline schema:
1. Define the schema in `components/schemas` (e.g. `ChangePhoneInput`)
2. Reference it via `$ref: "#/components/schemas/ChangePhoneInput"` in the requestBody
3. This makes Orval generate it consistently as a named schema without duplication.

This project's orval config: `lib/api-spec/orval.config.ts` → `lib/api-spec/openapi.yaml`.
