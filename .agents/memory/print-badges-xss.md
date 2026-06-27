---
name: printBadges XSS pattern
description: Interpolating user data into document.write() HTML without escaping is an XSS vector; always escapeHtml() first.
---

## Rule
Any function that writes user-controlled strings into a new window via `document.write()` or `innerHTML` must escape the values first.

**Why:** In the admin context, a crafted participant name like `<script>...` would execute in the admin's browser when printing badges.

**How to apply:** Use an `escapeHtml()` helper:
```ts
function escapeHtml(s: string): string {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}
```
Apply to all participant-sourced fields before template-literal interpolation into HTML strings.
