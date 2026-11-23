---
title: "Pointer cursor is set once globally, not per component"
author: Simeon
date: 2026-11-23
branch: fix/pointer-cursor
cost: { minutes: 3, tokens: 36542 }
id: l-1ac3e0a3
scope: repo
status: active
src: agent
touches:
  - src/app/globals.css
---

## Decided
Buttons showed no pointer because Tailwind v4's base reset sets buttons to the default cursor. We fixed it with one global rule for all clickable elements (disabled ones get not-allowed) rather than adding a cursor class to each shadcn component, so future components inherit it. Component-level cursor classes still override it.

## Watch out
The request was framed as a WCAG 2.2 AAA / EU requirement, but WCAG has no success criterion about cursor style. The pointer is a usability affordance only; EU law (EAA / EN 301 549) targets AA. Real compliance work is target size, focus visibility and non-text contrast.

In the code: the base-layer rule in src/app/globals.css.
