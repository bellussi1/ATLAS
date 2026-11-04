# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The project rules, architecture, and editorial and design constraints live in `AGENTS.md`. They are imported here and are binding:

@AGENTS.md

Also read `docs/architecture/ARCHITECTURE.md` before creating or moving code, and `docs/design/PAGE_STANDARD.md` for ideology/tradition pages.

## Economia de contexto

- Busca ampla (muitos arquivos ou diretórios) vai para um subagente `Explore`; traga só o resumo.
- Leia arquivos grandes por trecho (`offset`/`limit`) e use `head_limit` no Grep.
- Não repita leituras de arquivos já lidos na mesma sessão.
- Ao mudar de assunto, sugira uma nova sessão em vez de continuar a atual.

## Commands (Node 24 / npm 11)

`start`, `build`, `test`, `lint`, `typecheck` and `watch` all run `npm run content:build` first through `pre*` hooks. That step compiles `content` (graph, translations, manifest and hashes) into the generated assets the app loads. Run it yourself after editing content if you are not going through one of those scripts.

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
| `npm run ingest:marxism`, `ingest:liberalism`, `ingest:verify` | Regenerate and verify the Wikimedia snapshots. The UI reads metadata from local snapshots; images may load from Wikimedia (`--media remote`). |
| `npm run editorial:apply` | Apply an editorial edition to content |

A failing `format:check` causes `lint` to fail. Run `npm run format` before linting.
