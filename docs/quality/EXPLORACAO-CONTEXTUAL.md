# Validação da primeira fatia de exploração

Executada em 01/11/2026 no workspace Windows, Node `24.13.0`, npm `11.6.2`, Chromium do Playwright instalado no projeto. Código-base ATLAS: `5c5bfc7`; este relatório acompanha o diff da fatia. Sem push, merge ou deploy.

## Entregáveis e escopo

1. [Auditoria real do 12axes](../research/12axes-audit.md): commit auditado, caminhos de código, funcionalidades, dados, build, teia, licenças e interação desktop/mobile com API bloqueada.
2. [Diagnóstico e arquitetura-alvo](../architecture/EXPLORACAO-CONTEXTUAL.md): responsabilidades atuais, preservar/alterar/adiar, contratos existentes e lacunas do modelo, opções consideradas, evolução do design system e matriz de migração/rollback.
3. [Plano da fatia](../superpowers/plans/2026-11-01-exploracao-contextual.md): sequência executada e verificações.
4. Implementação em `KnowledgeContext`/`entityContext`/`KnowledgeContextComponent`: cada relação preserva identidade, direção, rótulo, contexto, estado, incerteza, fontes/localizadores e procedência. Histórico restaura registro, detalhes abertos, foco e scroll.
5. Reutilização do hipertexto em `/liberalismo`, com Locke e Smith, e no resumo do atlas. `/marxismo` usa o mesmo diálogo e contrato. Nenhuma rota nova.

## Resultados observados

| Comando | Resultado final |
| --- | --- |
| `npm test` | **119 testes passaram em 24 arquivos**, execução única; inclui regressões da projeção, vocabulário e componente contextual |
| `npm run typecheck` | **Passou**, aplicação e testes |
| `npm run lint` | **Passou**: Angular/TypeScript/templates, 5 testes de boundaries/ciclos, Biome e Prettier |
| `npm run build` | **Passou**, 3 rotas prerenderizadas, saída estática; headers/CSP gerados |
| `npm run check:links` | **Passou**, links internos de 4 HTMLs estáticos verificados (3 rotas e fallback); não equivale a testar todos os destinos externos |
| `npm run test:e2e` | **21 testes passaram**, 31,3s na rodada final, 4 workers |
| `git diff --check` | **Passou**, sem erro de whitespace |

O build final informou **337,45 kB iniciais brutos / 92,79 kB estimados para transferência**. O chunk compartilhado lazy maior ficou em **725,10 kB / 119,62 kB estimados**. Esses são números do bundler, não medição de rede nem Core Web Vitals. O grafo global ainda pode ser transportado no bundle; separar snapshots e índices permanece trabalho futuro.

## Interações e acessibilidade exercitadas

- Home, Marxismo e Liberalismo em **1440×900, 390×900 e 320×900**: h1 visível, documento sem overflow horizontal, capturas completas e de abertura. Axe automatizado sem violações **serious/critical** nesses estados.
- Percurso de ficha em **1440×1000, 390×844 e 320×844**: Marx → O capital: volume I → voltar; Locke → Smith → voltar. Seis cenários com verificações de foco, título, evidência/procedência e estado de detalhes expandidos. Desktop usa Enter para abrir/seguir/voltar e Escape para fechar; mobile usa toque e botão Fechar. Axe também exercitado dentro dos diálogos de destino.
- Ao voltar: scroll interno restaurado com diferença inferior a 2px; após fechar, foco no termo original e scroll/posição vertical do gatilho com diferença inferior a 2px. Altura do diálogo permaneceu igual na troca de entidade e suas bordas horizontais ficaram dentro da viewport nas três larguras. URL editorial permaneceu estável.
- Casos existentes de busca vazia, fontes, seleção de timeline/rede, capítulos, licenças, fallback de rotas removidas e reabertura da ficha passaram na suíte completa. Falhas JavaScript de página foram monitoradas nos seis percursos novos e não ocorreram.
- Unitários cobrem entidade inexistente, fonte sem URL, registro editorial sem conexões, rótulo reverso, múltiplas relações para o mesmo destino, ausência de corte arbitrário após oito conexões, IDs do vocabulário e parágrafos duplicados.

Não foi realizada auditoria WCAG integral, teste com leitor de tela ou dispositivo móvel físico. O mobile acima usa emulação de viewport/toque do Chromium. Não foram medidos CLS/LCP/INP; as asserções geométricas não os substituem.

## Falhas encontradas e correções

- As regressões da projeção falharam antes da correção: relação reversa/evidência ausente, vínculos agrupados e procedência omitida. Depois passaram com os snapshots existentes.
- Revisão independente apontou `verified` sem prova de revisor humano: a UI agora diz “Marcado como verificado”, sem inventar validação. Todos os graus de incerteza são apresentados.
- **11 rótulos P737** estavam semanticamente invertidos. Corrigido “influência de” para “influenciado por” no snapshot e no importador; reverseLabel continua “influência para”. Regressão foi observada falhar e depois passar. A [definição primária do Wikidata](https://www.wikidata.org/wiki/Property:P737) confirma que o sujeito recebe influência do objeto. IDs, extremidades, evidências, estado pendente e datas não foram alterados.
- Detalhes de evidência abertos inicialmente se perderiam na troca de registro. O histórico agora registra IDs abertos e os restaura antes do scroll/foco; E2E confirma o retorno.
- Captura revelou repetição do resumo/contexto nos parágrafos: projeção agora elimina duplicatas literais e resumo repetido sem editar a narrativa canônica. Regressão falhou antes e passou depois.
- O primeiro teste novo de componente precisou corrigir sua configuração TestBed e o título esperado para coincidir com o registro real; a suíte foi repetida e passou.
- O lint inicial falhou em imports dos testes novos e na formatação preexistente do checkout Windows: 144 arquivos estavam divergentes apenas por CRLF. Finais de linha foram normalizados sem alteração textual; cinco arquivos preexistentes precisaram apenas de quebra/indentação (`pages.spec.ts`, spec do atlas, HTML/TS do contêiner de ideologia e SCSS do Liberalismo). Imports foram ordenados. Lint completo repetido e aprovado; nenhuma regra foi desabilitada.

## Evidência visual

Capturas geradas pela suíte em `output/playwright`, preservadas localmente, fora dos assets publicados. `audit-<home|marxismo|liberalismo>-<1440|390|320>.png` contém a página completa; `audit-opening-...` contém sua abertura. `context-<marxismo|liberalismo>-<1440|390|320>.png` contém o retorno ao contexto com evidência expandida.

Inspeção visual direta das aberturas desktop e 320px das três páginas e das fichas desktop/mobile: hierarquia, navegação entre as três rotas e termos permanecem legíveis; diálogos mantêm margem e scroll interno. Capturas anteriores e adicionais de 390px também foram preservadas; não são screenshots de produção.

Exemplos:

- [Ficha Marxismo 320px](../../output/playwright/context-marxismo-320.png)
- [Ficha Liberalismo 390px](../../output/playwright/context-liberalismo-390.png)
- [Home desktop](../../output/playwright/audit-opening-home-1440.png)
- [Liberalismo desktop](../../output/playwright/audit-opening-liberalismo-1440.png)

Os arquivos de evidência não fazem parte do conteúdo histórico e não são garantia de persistência em um checkout novo; execute a suíte para regenerá-los. Capturas de referência do 12axes permanecem temporárias, conforme o relatório específico.

## Limites e próxima decisão

A entrega valida o mecanismo contextual existente nas duas tradições. A migração completa não foi executada. Busca universal pública, catálogos novos, permalinks de verbetes, schema próprio de regime/país, comparadores gerais, internacionalização, ingestão offline reproduzível, shards, índices de build e geometria antecipada estão descritos por fases e dependências, aguardando validação do contrato.

Nenhum dado/código/modelo proprietário do 12axes foi incorporado; sua API não foi consumida. Não foi executada uma nova ingestão Wikimedia: foram reutilizados registros e fontes locais, com correção direcional pontual verificada. A revisão editorial humana desses registros continua pendente quando assim registrada. A busca da Home continua limitada às duas leituras publicadas; o índice interno legado possui destinos despublicados e não deve ser exposto diretamente.
