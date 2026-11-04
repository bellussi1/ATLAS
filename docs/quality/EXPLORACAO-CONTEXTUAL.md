# Validação da primeira fatia de exploração

Executada em 01/11/2026 no workspace Windows, Node `24.13.0`, npm `11.6.2`, Chromium do Playwright do projeto. Código-base: `5c5bfc7`. Acompanha o diff da fatia. Sem push, merge ou deploy.

## Entregáveis

1. [Auditoria do 12axes](../research/12axes-audit.md): commit auditado, caminhos de código, funcionalidades, dados, build, teia, licenças e interação desktop e mobile com API bloqueada.
2. [Diagnóstico e arquitetura-alvo](../architecture/EXPLORACAO-CONTEXTUAL.md): responsabilidades atuais, o que preservar, alterar ou adiar, contratos existentes, lacunas do modelo, opções, evolução do design system e matriz de migração e rollback.
3. [Plano da fatia](../superpowers/plans/2026-11-01-exploracao-contextual.md): sequência executada e verificações.
4. **Implementação** em `KnowledgeContext`, `entityContext` e `KnowledgeContextComponent`: cada relação preserva identidade, direção, rótulo, contexto, estado, incerteza, fontes, localizadores e procedência. O histórico restaura registro, detalhes abertos, foco e scroll.
5. **Reuso do hipertexto** em `/liberalismo` (Locke e Smith) e no resumo do atlas. `/marxismo` usa o mesmo diálogo e contrato. Nenhuma rota nova.

## Resultados

| Comando | Resultado |
|---|---|
| `npm test` | **119 testes em 24 arquivos**, execução única; inclui regressões de projeção, vocabulário e componente contextual |
| `npm run typecheck` | **Passou**, aplicação e testes |
| `npm run lint` | **Passou**: Angular, TypeScript e templates; 5 testes de boundaries e ciclos; Biome e Prettier |
| `npm run build` | **Passou**: 3 rotas prerenderizadas; headers e CSP gerados |
| `npm run check:links` | **Passou**: links internos de 4 HTMLs estáticos (3 rotas e fallback); não testa destinos externos |
| `npm run test:e2e` | **21 testes em 31,3 s**, 4 workers |
| `git diff --check` | **Passou** |

Build final: **337,45 kB iniciais brutos e 92,79 kB estimados para transferência**. Maior chunk lazy compartilhado: **725,10 kB e 119,62 kB estimados**. São números do bundler, não medição de rede nem de Core Web Vitals. O grafo global ainda pode ir no bundle; separar snapshots e índices segue como trabalho futuro.

## Interações e acessibilidade

- **Páginas:** Home, Marxismo e Liberalismo em 1440×900, 390×900 e 320×900: h1 visível, sem overflow horizontal, capturas completas e de abertura. Axe sem violações serious ou critical.
- **Percurso de ficha** em 1440×1000, 390×844 e 320×844: Marx → O capital: volume I → voltar; Locke → Smith → voltar. Seis cenários com verificação de foco, título, evidência, procedência e estado dos detalhes. Desktop usa Enter para abrir, seguir e voltar, e Escape para fechar; mobile usa toque e o botão Fechar. Axe também dentro dos diálogos de destino.
- **Ao voltar:** scroll interno restaurado com diferença inferior a 2 px; ao fechar, foco no termo original e posição do gatilho com diferença inferior a 2 px. Altura do diálogo estável na troca de entidade; bordas horizontais dentro da viewport nas três larguras. URL editorial estável.
- Casos existentes (busca vazia, fontes, seleção na timeline e na rede, capítulos, licenças, fallback de rotas removidas, reabertura da ficha) passaram na suíte completa. Falhas JavaScript monitoradas nos seis percursos novos: nenhuma.
- **Unitários:** entidade inexistente, fonte sem URL, registro editorial sem conexões, rótulo reverso, múltiplas relações para o mesmo destino, ausência de corte arbitrário após oito conexões, IDs do vocabulário e parágrafos duplicados.

Sem auditoria WCAG integral, leitor de tela ou dispositivo físico; o mobile usa emulação de viewport e toque do Chromium. CLS, LCP e INP não medidos; as asserções geométricas não os substituem.

## Falhas encontradas e correções

- **Projeção:** regressões de relação reversa, evidência ausente, vínculos agrupados e procedência omitida. Passaram após a correção, com os snapshots existentes.
- **Verificado sem prova:** revisão independente apontou `verified` sem revisor humano. A UI passou a dizer "Marcado como verificado", sem inventar validação. Todos os graus de incerteza são apresentados.
- **11 rótulos P737 invertidos:** "influência de" trocado por "influenciado por" no snapshot e no importador; `reverseLabel` segue "influência para". Regressão observada antes e depois. A [definição do Wikidata](https://www.wikidata.org/wiki/Property:P737) confirma que o sujeito recebe influência do objeto. IDs, extremidades, evidências, estado pendente e datas não mudaram.
- **Detalhes abertos** se perdiam na troca de registro. O histórico agora registra os IDs abertos e os restaura antes do scroll e do foco; E2E confirma.
- **Repetição** do resumo e do contexto nos parágrafos: a projeção elimina duplicatas literais e resumos repetidos, sem editar a narrativa canônica. Regressão antes e depois.
- **Teste de componente:** configuração do TestBed e título esperado corrigidos para o registro real.
- **Lint:** 144 arquivos divergiam só por CRLF, no checkout Windows. Finais de linha normalizados sem alteração textual; cinco arquivos preexistentes precisaram de quebra ou indentação (`pages.spec.ts`, spec do atlas, HTML e TS do contêiner de ideologia, SCSS do Liberalismo). Imports ordenados. Lint completo aprovado; nenhuma regra desabilitada.

## Evidência visual

Capturas em `output/playwright`, locais e fora dos assets publicados: `audit-<home|marxismo|liberalismo>-<1440|390|320>.png` (página completa), `audit-opening-...` (abertura) e `context-<marxismo|liberalismo>-<1440|390|320>.png` (retorno ao contexto com evidência expandida).

Inspeção visual das aberturas em desktop e 320 px das três páginas e das fichas em desktop e mobile: hierarquia, navegação entre as três rotas e termos legíveis; diálogos com margem e scroll interno. Não são screenshots de produção.

Exemplos: [Ficha Marxismo 320 px](../../output/playwright/context-marxismo-320.png), [Ficha Liberalismo 390 px](../../output/playwright/context-liberalismo-390.png), [Home desktop](../../output/playwright/audit-opening-home-1440.png), [Liberalismo desktop](../../output/playwright/audit-opening-liberalismo-1440.png).

Evidências não são garantia de persistência num checkout novo; a suíte as regenera. Capturas de referência do 12axes são temporárias, conforme o relatório específico.

## Limites e próxima decisão

A entrega valida o mecanismo contextual existente nas duas tradições. A migração completa não foi executada. Busca universal pública, catálogos, permalinks de verbetes, schema de regime e país, comparadores, internacionalização, ingestão reproduzível, shards, índices de build e geometria antecipada estão descritos por fases e dependências, aguardando validação do contrato.

Nenhum dado, código ou modelo do 12axes foi incorporado; a API não foi consumida. Não houve nova ingestão Wikimedia: reutilizaram-se registros e fontes locais, com correção direcional pontual verificada. A revisão editorial humana desses registros segue pendente. A busca da Home continua limitada às duas leituras; o índice interno legado tem destinos despublicados e não deve ser exposto diretamente.
