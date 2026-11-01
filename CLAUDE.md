# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The project rules, architecture, and editorial and design constraints live in `AGENTS.md`. They are imported here and are binding:

@AGENTS.md

Also read `docs/architecture/ARCHITECTURE.md` before creating or moving code, and `docs/design/PAGE_STANDARD.md` for ideology/tradition pages.

## Commands (Node 24 / npm 11)

`start`, `build`, `test`, `lint`, `typecheck` and `watch` all run `npm run content:build` first through `pre*` hooks. That step compiles `src/content` (graph, translations, manifest and hashes) into the generated assets the app loads. Run it yourself after editing content if you are not going through one of those scripts.

| Command | Purpose |
| --- | --- |
| `npm start` | `ng serve` |
| `npm run build` | Production build plus prerender, then `scripts/security-headers.mjs` |
| `npm test` | Vitest via `ng test --watch=false` |
| `npm test -- --include src/path/to/file.spec.ts` | Run a single unit spec |
| `npm run test:e2e` | Playwright (`e2e/`), add `-- e2e/pages.spec.ts` for one file |
| `npm run test:content` | `node --test` specs for the content build scripts |
| `npm run test:ingestion` | `node --test` specs for the Wikimedia ingestion |
| `npm run lint` | `ng lint` (including the `architecture/boundaries` rule), boundary-rule tests, Biome, and Prettier check |
| `npm run format` | Prettier write |
| `npm run typecheck` | `ngc` app check plus `tsc` for specs |
| `npm run check:links` / `npm run preview` | Link check / serve the built output |
| `npm run ingest:marxism`, `ingest:liberalism`, `ingest:verify` | Regenerate and verify the Wikimedia snapshots. The UI reads only local snapshots. |
| `npm run editorial:apply` | Apply an editorial edition to content |

A failing `format:check` causes `lint` to fail. Run `npm run format` before linting.
