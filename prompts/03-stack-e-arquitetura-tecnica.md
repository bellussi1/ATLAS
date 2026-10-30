# PROMPT 03 — IMPLEMENTE arquitetura Angular static-first e contratos tipados

A aplicação **Angular 22 (ou versão estável compatível instalada) já existe**. Não reinstale a aplicação, não proponha React/Next.js e não encerre com ADR abstrato.

1. Use arquitetura Angular idiomática: componentes standalone, Angular Router com lazy loading, services injetáveis (`inject`), Signals/`computed` para estado local, TypeScript strict, `@if`/`@for` com tracking e `@defer` quando houver benefício real. Evite RxJS onde Signals são suficientes; use RxJS para fluxos assíncronos apropriados.
2. Modele tipos TypeScript e valide com Zod ou JSON Schema: `Atlas`, `Entity`, `Person`, `Concept`, `Event`, `Article`, `Source`, `Claim`, `Relationship`, `LearningPath`. Comece somente com campos usados.
3. Crie `src/app/core`, `src/app/shared`, `src/app/features`, `src/content` (ou estrutura equivalente coerente) com código real, não pastas vazias. Implemente `ContentRepository` ou serviço equivalente que carregue dados estruturados do build/assets sem backend.
4. Integre um registro real sobre a **metodologia do ATLAS** à rota Angular `/verbete/:slug`. Valide IDs, slugs, relações e fontes. Exiba 404 para slug inválido.
5. Configure SSG/prerender Angular para **rotas conhecidas**, se suportado no setup, registrando como gerar parâmetros para rotas dinâmicas; não afirme que todas as rotas dinâmicas foram prerenderizadas sem verificar os arquivos de saída. Desacople as experiências interativas que precisam de browser APIs (SSR seguro).
6. Implemente testes do carregador, esquema e rotas, usando o test runner integrado ao Angular (Vitest quando suportado). Execute lint, typecheck, test e build; corrija erros.
7. Documente em `docs/ARCHITECTURE.md` somente as decisões realmente implementadas, incluindo limites do static-first e estratégia futura para conteúdo.

**Aceite:** contratos tipados, carregamento estático, rota real, testes e build funcionando. Não avance ao Prompt 04.
