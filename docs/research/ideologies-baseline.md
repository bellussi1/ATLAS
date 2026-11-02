# Baseline das páginas de ideologia (Prompt 00)

Data: 02/11/2026. Commit de referência: `cfe9f23`. Auditoria heurística feita por agente; **não é pesquisa com usuários**.

Legenda: **OBS** = observado no código ou no navegador · **INF** = inferido · **PROP** = proposto.

## Método

- Leitura de `docs/design/PAGE_STANDARD.md`, `AGENTS.md`, `src/content/ideologies/{marxismo,liberalismo}/page.json` e dos componentes em `src/app/features/ideologies/components`.
- Navegador embutido com `ng serve` (porta 4300), larguras 375, 768 e 1280. Por rota, um script coletou navegações (`nav`, `aside`, `select`, `details`), títulos `h2`, imagens (total, únicas e quebradas), contêineres com scroll interno, elementos `sticky`/`fixed` e overflow horizontal.
- Limitações: 1440 foi substituída pela largura do painel (1280). Não houve auditoria `axe` nesta etapa, nem medição de CLS/LCP. Também não houve teste de toque real.

## Divergência de escopo

- **OBS:** `PAGE_STANDARD.md` (linha 3) diz que o escopo público é "home, `/marxismo` e `/liberalismo`". `AGENTS.md` lista também `/conhecimento`, `/entidades`, `/rede`, `/comparar` e outros catálogos, e o build prerenderiza 82 rotas.
- **Resolução PROP:** vale o código, que publica os catálogos. `PAGE_STANDARD.md` deve passar a dizer: "duas tradições publicadas; catálogos e verbetes também existem". A correção fica no Prompt 01, que já altera esse documento.

## Matriz lado a lado (OBS)

| Posição | Marxismo (`id` · título · blocos)                                                                | Liberalismo (`id` · título · blocos)                           | Seção canônica                              |
| ------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------- |
| 1       | `introducao` · Uma tradição em disputa · —                                                       | `introducao` · Liberdade contra o poder · —                    | 01 introdução                               |
| 2       | `origens` · Ler o mundo industrial · entities                                                    | `origens` · Contratos, poderes e comércio · entities           | 02 origens                                  |
| 3       | `conceitos` · Trabalho, valor e sociedade · explorations, entities, argument (+ debate de valor) | `conceitos` · Seis ideias… · explorations                      | 03 princípios **e** 04 conceitos misturados |
| 4       | `pensadores` · entities                                                                          | `pensadores` · entities                                        | 06 pensadores                               |
| 5       | `historia` · timeline                                                                            | — (ausente)                                                    | 05 épocas (duplicado no Marxismo)           |
| 6       | `epocas` · chronology, explorations                                                              | `epocas` · chronology, explorations                            | 05 épocas                                   |
| 7       | `lugares` · explorations                                                                         | `lugares` · explorations                                       | 08 experiências (parcial)                   |
| 8       | `correntes` · explorations, graph, explorations                                                  | `correntes` · explorations, graph                              | 07 vertentes                                |
| 9       | `criticas` · debate, explorations                                                                | `criticas` · explorations (sem bloco `debate`)                 | 09 debates                                  |
| 10      | —                                                                                                | `acervo` · atlas (abas internas: índice, rede, tempo, imagens) | 10 conexões (parcial)                       |
| 11      | `leituras` · reading-path                                                                        | `leituras` · reading-path                                      | 11 leituras                                 |
| 12      | `fontes` · sources                                                                               | `fontes` · sources                                             | 12 fontes                                   |

Resumo: Marxismo tem 11 capítulos e Liberalismo também tem 11, mas não os mesmos. Nenhum dos dois tem `principios`, `experiencias` ou `conexoes` com esses nomes.

## Navegação observada

| Largura | Achado (OBS)                                                                                                                                                                                                                                                                   |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1280    | Quatro faixas de navegação antes do texto: cabeçalho com "Entradas para explorar" (centro-direita), breadcrumb de largura total, índice "Orientação da leitura" à esquerda (y≈960 no Marxismo, sem `sticky` no `aside`) e, no fim, "Continue explorando" e "Mapa do ATLAS".    |
| 1280    | No Liberalismo, o capítulo `acervo` acrescenta um `aside` `sticky` à direita (x≈868, `context-panel`) e uma navegação interna `view-switch` ("Capítulos de exploração"). Isso cria uma segunda navegação e um trilho à direita.                                                |
| 1280    | Há scroll interno no conteúdo principal: `timeline-list` (Marxismo), `context-panel` e uma `ul` do acervo (Liberalismo).                                                                                                                                                       |
| 768     | O índice continua como coluna estreita à esquerda (184 px); o `select` móvel não aparece. Sem overflow horizontal.                                                                                                                                                             |
| 375     | O índice vira `select` em `app-ideology-reading-index` `sticky`. Há outros dois `select` locais (filtros de timeline e correntes) e `.timeline-filters` também `sticky`: são duas faixas fixas competindo. Página com 51.179 px de altura (Marxismo). Sem overflow horizontal. |

## Mídia observada (1280)

| Rota        | `<img>` | URLs únicas | Quebradas | Repetições acima de 2×                                                                                                |
| ----------- | ------- | ----------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| Marxismo    | 42      | 21          | 0         | — (não listadas)                                                                                                      |
| Liberalismo | 44      | 15          | 0         | Locke 5×; Smith, Montesquieu, Tocqueville, Mill e Hayek 4×; Berlin, Declaração de Independência, Tariff e Luís XVI 3× |

INF: as repetições vêm dos mesmos retratos em `entities` (origens/pensadores), `explorations`, `chronology` e no acervo. A causa é não haver uma política de papel visual por imagem.

## Home

- **OBS:** em 768, "Marxismo" tem `h2` próprio e Liberalismo não. Os dois são linkados (7 links), mas com peso visual desigual.
- **INF:** o visitante novo percebe o Marxismo como entrada principal e o Liberalismo como secundário.

## Jornada do iniciante (heurística)

1. Home → clica em Marxismo: ok. Liberalismo é menos evidente (P2).
2. "O que é?": a introdução responde nas duas páginas.
3. "Quais princípios?": no Marxismo, estão junto do debate sobre valor no capítulo 3, sem separar princípio de conceito (P1).
4. "Onde começou / história": o Marxismo divide o tema em `historia` e `epocas`, com conteúdo sobreposto; o Liberalismo só tem `epocas` (P1).
5. "Diferenças internas": `correntes` existe nas duas, ok.
6. "Críticas": só o Marxismo tem o quadro `debate` estruturado (P1).
7. "Conexões / o que mais": as conexões do Liberalismo ficam escondidas em abas do acervo; o Marxismo não tem capítulo de conexões (P1).
8. "O que ler": `leituras` existe nas duas, ok.

Pontos de fricção: no desktop, o índice só aparece depois de cerca de 900 px de cabeçalho e breadcrumb. No celular, duas barras `sticky` disputam espaço. As mesmas imagens reaparecem em capítulos seguidos.

## Problemas priorizados

| P   | Problema                                                                                                                   | Evidência                            | Prompt  |
| --- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------- |
| P0  | Nenhum. Nada impede a leitura: sem imagens quebradas e sem overflow.                                                       | —                                    | —       |
| P1  | As duas rotas não têm o mesmo conjunto nem a mesma ordem de capítulos.                                                     | Matriz acima.                        | 01      |
| P1  | Navegações paralelas: `view-switch` e `context-panel` à direita no acervo, além de `select` e filtros `sticky` no celular. | Tabela de navegação.                 | 01 / 04 |
| P1  | Scroll aninhado no conteúdo principal (`timeline-list`, `context-panel`).                                                  | Script de scrollers.                 | 01 / 06 |
| P1  | Princípios e conceitos misturados; `historia` sobreposto a `epocas`.                                                       | Matriz, posições 3 e 5–6.            | 01 / 02 |
| P1  | Quadro de debate estruturado só no Marxismo.                                                                               | Liberalismo `criticas` sem `debate`. | 02      |
| P2  | Imagens repetidas 3–5× no Liberalismo.                                                                                     | Tabela de mídia.                     | 03      |
| P2  | Home desequilibrada entre as duas tradições.                                                                               | `h2` só para Marxismo.               | 01      |
| P2  | Índice desktop começa abaixo da dobra (y≈830–960).                                                                         | Posição do `aside`.                  | 01      |
| P3  | `PAGE_STANDARD.md` desatualizado quanto às rotas.                                                                          | Linha 3.                             | 01      |
| P3  | Aviso de build `js-comment-in-css`.                                                                                        | Saída de `npm run build`.            | 06      |

## Decisões

- **Recomendada:** contrato semântico com composição livre (ver proposta). Mesmos 12 IDs, ordem, rótulos e affordances; os blocos internos variam com o assunto.
- **Rejeitada:** template rígido com os mesmos blocos por capítulo. Força conteúdo de preenchimento (ex.: um `debate` vazio ou cards genéricos) e contraria `PAGE_STANDARD.md` §2 ("não clones com título e cor trocados").
- **Rejeitada:** manter capítulos livres por ideologia. É a causa direta dos P1 acima.
- **Rejeitada:** abas para o acervo. Escondem conteúdo do scroll, o que contraria `PAGE_STANDARD.md` §1.

## Referências externas

As referências já registradas em `PAGE_STANDARD.md` §0 (Rosmarie Tissi, Yemen Peace Project e a publicação sobre a Revolução Cultural) foram usadas como critério. **Não foram revisitadas nesta etapa**; seus comportamentos não foram reverificados. A comparação externa com interações observadas fica para o Prompt 08.
