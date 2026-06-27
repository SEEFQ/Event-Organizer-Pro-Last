---
name: React form component scope
description: FormFields components defined inside parent render functions cause focus loss bugs; must be lifted to module scope.
---

## Rule
Never define a reusable form-fields component (e.g. `function FormFields(...)`) inside another component's function body.

**Why:** Every parent re-render creates a new function reference for the inner component, causing React to unmount and remount it. For input-heavy forms this means the focused input loses focus on every keystroke.

**How to apply:** Define helper form components at module scope (top-level in the file). Pass state/setters as props. This is the pattern used in `admin-media-banners.tsx` (BannerFormFields) and `admin-completed-events.tsx` (CompletedEventFormFields) after the fix in this project.
