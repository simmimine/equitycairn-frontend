---
title: "Use pnpm for the web app, not npm"
author: Simeon
date: 2026-11-22
standing: true
id: l-4d5271c8
scope: repo
status: active
src: init-sessions
---

## Decided

- The user explicitly asked for pnpm after it was installed, though the machine also had npm available.
- In the code: Use pnpm for all install, run and test commands in equitycairn-frontend. Do not generate package-lock.json or use npm/bun.

_From past Claude sessions here, Nov 22._
