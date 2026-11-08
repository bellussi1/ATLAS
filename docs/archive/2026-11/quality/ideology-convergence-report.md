# Convergência Marxismo × Liberalismo (Prompt 08)

Data: 02/11/2026. Baseline `cfe9f23` (antes da sequência) × atual (após os prompts 01–07). Auditoria por agente com navegador embutido e Playwright, a 375 e 1440 px. **Revisão heurística, não pesquisa com pessoas.**

## Matriz das 12 seções (observado, 1440 px)

Formato: cobertura · blocos · imagens.

| # | `id` | Marxismo | Liberalismo |
|---|---|---|---|
| 01 | introducao | completa · abertura · 0 | completa · abertura · 0 |
| 02 | origens | completa · entidades · 1 | completa · entidades · 3 |
| 03 | principios | completa · explorações · 0 | completa · explorações · 0 |
| 04 | conceitos | completa · entidades + argumento Smith × Marx · 3 | completa · explorações · 0 |
| 05 | epocas | parcial · timeline + cronologia · 2 | parcial · cronologia · 2 |
| 06 | pensadores | completa · retratos · 13 | completa · retratos · 4 |
| 07 | vertentes | parcial · explorações + grafo · 0 | completa · explorações + grafo · 1 |
| 08 | experiencias | parcial · explorações · 0 | parcial · explorações · 1 |
| 09 | debates | parcial · 2 quadros + críticas · 0 | parcial · 1 quadro + críticas · 1 |
| 10 | conexoes | parcial · acervo · 21 | parcial · acervo · 12 |
| 11 | leituras | completa · roteiro · 0 | completa · roteiro · 0 |
| 12 | fontes | completa · fontes (**pergunta corrigida**) | completa · fontes (**pergunta corrigida**) |

**Variações justificadas:** o Marxismo tem timeline e argumento Smith × Marx pelos dados disponíveis; o Liberalismo tem menos retratos (7 pensadores × 14).

**Falta de padrão encontrada:** `fontes` sem pergunta nas duas rotas. **Corrigido**; o schema spec agora exige pergunta em todos os capítulos.

## Navegação

| Critério | Baseline | Atual |
|---|---|---|
| Mesmos capítulos, ordem e âncoras | não (11 × 11, conjuntos diferentes) | sim (12, validado por schema) |
| Navegações visíveis na leitura | índice + `view-switch` + `context-panel` fixo à direita | só o índice "Capítulos" (cabeçalho e rodapé do site à parte) |
| Elementos fixos (`sticky`/`fixed`) no main | índice + filtros da timeline (celular) + painel do acervo | só o índice |
| Scroll aninhado no conteúdo | `timeline-list`, `context-panel`, listas do acervo | nenhum (E2E) |
| Deep link e âncoras antigas | sim · não | sim · redirecionadas (`#correntes` → `#vertentes` etc.) |
| Celular | `select` plano | `select` com grupos Entender / Situar / Avaliar e continuar |

O cabeçalho do site (logo e "Entradas para explorar") e o breadcrumb continuam acima da leitura. O logo é área protegida. Integrar tudo numa barra lateral única fica como proposta (P2), não como correção.

## Redundância

- **Texto:** nenhum parágrafo de narrativa ou resumo de card (mais de 60 caracteres) se repete em nenhuma rota (script DOM).
- **Imagem:** 0 repetições na narrativa (Prompt 03). Só o acervo repete, por ser catálogo.
- **Componentes:** as duas rotas usam o mesmo `IdeologyPageComponent`, sem cópia por ideologia. `app-marx-atlas-page` no capítulo de conceitos é componente específico de um debate documentado, permitido por `AGENTS.md`.
- **Interação:** a mesma em toda parte. Cards abrem ficha contextual; debates usam abas de fase; grafo e épocas selecionam sem mudar de rota; roteiro expande no lugar.

## Percursos heurísticos

| Pergunta | Leigo | Estudante | Avançado |
|---|---|---|---|
| O que é? | 01 nas duas | 01 + recorte | classificação em "Recorte e classificação" |
| Quais princípios? | 03 (separado de conceitos) | 03 → 04 | fontes por card |
| Onde começou? | 02 | 02 + 05 | cronologia com registros datados |
| Diferenças internas? | 07 | grafo com legenda | tabela de relações e fontes |
| Principais críticas? | 09 | quadros defesa → crítica → resposta → limites | lacunas declaradas (P1 do Prompt 02) |
| O que ler depois? | "Primeiro passo sugerido" | etapas e filtro | tipos primária, estudo e crítica |

Fricção restante: o índice desktop só aparece abaixo do cabeçalho e do breadcrumb (cerca de 830–960 px). Não impede a leitura (P2).

## Pontuação (0–5, fundamentada)

| Critério | Baseline | Atual | Evidência |
|---|---|---|---|
| Navegação | 2 | 4 | contrato de 12 capítulos, um índice, sem scroll aninhado; −1 pelo cabeçalho acima do índice |
| Pedagogia | 3 | 4 | perguntas em todos os capítulos, princípios separados, roteiro com primeiro passo |
| Consistência | 2 | 4 | mesmas seções e status de cobertura coerente; profundidade ainda desigual |
| Mídia | 2 | 4 | 0 repetições, licença por arquivo, tamanho reservado |
| Descobribilidade | 3 | 4 | legenda do grafo, registros por época, acervo nas duas rotas |
| Performance (lab) | ? | 4 | CLS 0, LCP de 156 a 536 ms; INP não medido |
| Fontes | 4 | 4 | fontes por capítulo e por posição; lacunas declaradas |
| Acessibilidade | 3 | 4 | axe A/AA zerado, alvos de 24 px; sem auditoria completa de WCAG |

## Prioridades e casos de teste

| P | Item | Caso de teste |
|---|---|---|
| P0 | Nenhum | — |
| P1 | Respostas documentadas às críticas do Liberalismo e críticas liberais ao Marxismo (conteúdo) | schema spec: `debates` com pelo menos 2 quadros por rota quando houver fontes |
| P1 | Periodização não europeia nas épocas (conteúdo) | revisão editorial com bibliografia |
| P2 | Barra lateral global única integrando marca e índice | E2E: nenhuma `nav` visível acima do primeiro capítulo além da lateral |
| P2 | `palette` e `companion` fixos por slug impedem uma terceira leitura | unit: página nova sem branch por slug |
| P3 | `temporalExtent.precision` ignorado no gráfico | unit: data aproximada marcada como "c." |

## Referências externas

Não revisitadas nesta etapa. As referências de `PAGE_STANDARD.md` §0 seguem como critério declarado, sem observação nova de comportamento.

## Suítes executadas

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:e2e`, incluindo `quality.spec.ts` e os testes de contrato, mídia, épocas e roteiro.
