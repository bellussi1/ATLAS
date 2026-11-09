Status: atual
Última verificação: 08/11/2026

# Enciclopédia explorável: diagnóstico e contrato inicial

**Status das fases**
- **Fases 1 e 2:** entregues. Contratos e validação em [Knowledge Explorer(../archive/2026-11/quality/KNOWLEDGE-EXPLORER.md).
- **Fase 3:** autorizada pelo pedido de Knowledge Explorer, que amplia as três rotas originais para catálogos e páginas permanentes.
- **Fase 4:** `/grafos` e o comparador aposentado (`/comparar` redireciona para `/acervo`), layouts compilados por coleção e globais, filtros comuns e timeline compartilhada. Comparações históricas ou conceituais preservam fontes, estados e limites; não são sínteses nem escores automáticos. Ver [Rede e comparadores(../archive/2026-11/quality/REDE-E-COMPARADORES.md).
- **Fase 5:** contratos específicos de país e regime, sete catálogos adicionais, oito registros constitucionais e internacionalização inicial pt-BR/en. Quatro traduções têm revisão assistida por IA, distinta de revisão humana. Cobertura mundial e tradução integral de interface e dossiês seguem em aberto. Ver [Entrega e limites(../archive/2026-11/quality/AMPLIACAO-EDITORIAL-E-IDIOMAS.md).

O diagnóstico e as restrições abaixo documentam a base histórica da migração.

**Data:** 01/11/2026. Base ATLAS local e `origin/HEAD`: `5c5bfc707f0c425eab70a712260eb2f3b5ca95d9` (confirmado por `git ls-remote`). Este documento propõe a evolução; não autoriza rotas além de Home, Marxismo e Liberalismo. Auditoria independente do outro repositório: [12axes](../research/12axes-audit.md). Nenhuma memória externa foi usada.

## Diagnóstico verificável do ATLAS

| Responsabilidade | Evidência no repositório | Decisão |
|---|---|---|
| Contratos e integridade | `core/content/models/content-schema.ts`: Entity discriminada em 12 tipos, Relation, Claim, Citation, Evidence, Source, Review, AssetLicense; Zod valida referências globais | Preservar; evitar schemas paralelos |
| Base comum | `src/content/atlas.json`, 223.843 bytes, 5 atlas, 48 entidades e 66 relações neste commit | Preservar IDs; separar armazenamento depois de medir carregamento |
| Editorial | `ideology-page.schema.ts`, snapshots em `src/content/ideologies`, `published-ideologies.ts` | Preservar EditorialPage como IdeologyPage da feature; relacionar IDs do grafo explicitamente |
| Consultas | `knowledge-graph.ts` filtra tipo, período e direção; `entity-context.ts` monta fichas | Melhorar a projeção contextual: não perder direção, relação ou fonte |
| Descoberta | `discovery-index.ts` tem busca normalizada, aliases e backlinks; a Home pesquisa só duas leituras | Não confundir índice interno com catálogo público |
| Destinos | Índice interno produz `/verbete/*` e `/acervo/fontes`; as antigas rotas de catálogo redirecionam para `/acervo/<catálogo>` | Expor os destinos do Router real; manter os 301 das URLs antigas |
| Hipertexto | `KnowledgeTextComponent`, vocabulário e segmentador puro na feature ideologies | Reutilizar no Liberalismo; termos apontam para registros existentes |
| Contexto | Diretiva de abertura separada do CDK Dialog; `KnowledgeContextComponent` mantém histórico, scroll e foco | Preservar; identificar cada relação, inclusive duas para o mesmo destino |
| Rede e tempo | `IdeologyAtlasComponent` reutilizado; posições determinísticas no cliente, SVG e alternativas textuais | Layout antecipado independente por coleção no futuro; não inferir genealogia |
| Ingestão | `scripts/ingest-wikimedia-atlas.mjs`; cliente, config e normalização compartilhados | Preservar; IDs Wikidata explícitos e rejeição de duplicados; ainda consulta a rede atual |
| Estático e lazy | Angular `outputMode` static; prerender de três rotas; `loadComponent`; TransferState nos dossiês | Preservar; grafo importado por `ContentRepository` também entra no bundle cliente |
| Internacionalização | Texto editorial pt-BR; sem catálogo completo de traduções | Projetar fallback e idioma da fonte antes de ampliar; não traduzir automaticamente alegações |
| QA e CI | Vitest, Playwright + axe, ESLint boundaries, Biome, Prettier, build, links; `.github/workflows/ci.yml` | Ampliar comportamento observável no percurso; manter a infraestrutura |

**Lacunas da projeção antiga:** deduplicação por entidade apagava relações distintas; limite de oito conexões escondia percursos; direção e `reverseLabel` eram descartados; fontes de relações não acompanhavam a ficha; estado do cabeçalho era sempre "em revisão". Os contratos já guardavam mais informação do que a UI mostrava. Não há justificativa para substituir a arquitetura inteira.

## Alternativas e escolha

1. **Evolução do mecanismo existente (escolhida):** fortalecer projeção e diálogo compartilhados, demonstrados no texto das duas tradições. IDs, estrutura dos snapshots e URLs preservados. Corrigidos 11 rótulos direcionais P737 existentes, no snapshot e no importador, conforme a [definição do Wikidata](https://www.wikidata.org/wiki/Property:P737): a propriedade descreve o sujeito como influenciado pelo objeto. Isso não constitui revisão historiográfica humana.
2. **Nova feature Explorer e novas rotas agora:** daria catálogos imediatamente, mas duplicaria contexto e contrariaria a validação prévia pedida. Adiada.
3. **Backend e grafo remoto:** custo recorrente e dependências sem necessidade demonstrada para snapshots públicos. Descartada nesta etapa.

## Arquitetura-alvo

```text
ingestão Wikimedia + curadoria historiográfica
  → normalização/reconciliação por IDs externos → validação Zod
  → snapshots canônicos versionados + manifesto de revisão/licenças
  → build: índice de busca + adjacência reversa + layouts por coleção
  → ContentRepository (assets estáticos / pacote SSR)
  → consultas puras de entidades, evidências e contextos
  → shared (hipertexto/ficha/timeline) e features (narrativa/explorer)
  → páginas e Router
```

- **Core:** infraestrutura, entidades, relações, evidência, contratos editoriais globais e consultas.
- **Feature ideologies:** dossiês, composição e vocabulário. **Feature exploration:** catálogos, comparadores e redes quando houver jornadas publicadas.
- **Shared:** apresentação reutilizável e diretivas; não importa features. Design system em tokens globais e primitivas shared.
- Ingestão não é dependência do runtime. Não criar uma segunda aplicação.

O build deve gerar artefatos derivados determinísticos: ordenação por ID, versão do schema, hash do snapshot e idioma no manifesto. Busca usa IDs, títulos, aliases e resumos normalizados. Adjacência guarda `relationId` e `direction`, sem inventar relações. Layouts são projeção separada dos fatos. Falha referencial ou licença insuficiente bloqueia a publicação do artefato correspondente. O índice atual é calculado em runtime; antecipá-lo no build é fase futura, não entrega desta fatia.

## Modelo de conhecimento

| Conceito | Contrato reutilizado ou evolução proposta |
|---|---|
| Entity | `entitySchema`: ID interno estável, slug, aliases, recorte, revisão. `externalIds` e `editorialStatus` hoje opcionais; novos registros devem informar procedência e estado. Tornar obrigatório exige migração |
| Ideology, Person, Work, Event, Institution, Party | Schemas discriminados já existentes, sem duplicação |
| País | `place` é lugar genérico. Propor subtipo `country` e historicidade só com fontes; não usar `government` como país |
| HistoricalRegime | `historical-polity` e `government` são aproximações, não equivalência automática a regime. Futuro schema discriminado com recorte temporal e classificação atribuída |
| Relation | Reutilizar IDs, extremidades, `label`/`reverseLabel`, contexto, incerteza, evidências, estado e proveniência existentes |
| Claim | Classificação (documentada, atribuída, interpretação, hipótese, inferência, controversa, não verificada) e estado separados |
| Evidence / Source | Evidence com `sourceId`, localizador e data; Citation separa sustenta, contesta, contextualiza; Source com edição e URL opcional |
| MediaAsset | `assetLicenseSchema` já registra arquivo, entidade, autor, licença, atribuição e autorização. Não renomear consumidores por cosmética |
| EditorialPage | `IdeologyPage` permanece na feature. Contrato geral só quando uma segunda família editorial exigir; referências ao grafo por ID |

**Taxonomia-alvo de relações:** influência documentada, divergência atribuída, associação documentada, vínculo editorial, vínculo enciclopédico e similaridade analítica. Os tipos legados (`influenced_by`, `reacted_against`, `documented-association` etc.) permanecem intactos nesta fatia. Migração com tabela explícita e revisão: Wikidata P737 não vira influência comprovada; "analisa criticamente" não vira causalidade. Similaridade analítica ainda não existe no schema e precisa declarar método, dimensões, incerteza e fontes antes de entrar. Proximidade visual não é evidência.

## Contratos de componentes e primeira fatia

- `KnowledgeTextComponent(text)`: usa o vocabulário da feature, preserva texto e pontuação, limita a quatro entidades e uma ocorrência por entidade em cada trecho. Hover e foco mostram pista; clique, Enter ou toque abrem a mesma ficha.
- `KnowledgeContextDirective(ContextRequest)`: aceita `entityId` ou registro editorial explícito; abre CDK Dialog com título, tamanho reservado, Escape, bloqueio de scroll e restauração do gatilho.
- `entityContext(repository, id)`: projeta o grafo sem alterar registros. Contexto ausente tem mensagem e arrays vazios. Conexões mantêm `relationId`, entidade destino, direção, rótulo orientado, tipo, contexto, estado, evidência e procedência. Nada vira "validado" por ter URL.
- `KnowledgeContextComponent`: mostra ficha e referências, permite seguir relação e voltar ao registro, ao scroll e ao controle anteriores, sem mudar a URL nem a narrativa. O histórico pertence à sessão do diálogo, não é rastreamento persistente.
- `IdeologyAtlasComponent` continua responsável por rede e tempo; reutiliza o hipertexto no resumo da entidade. Sem copiar árvore por tradição.

**Critérios de aceite:** Marx → relação com obra → obra → contexto anterior → Escape devolve foco e scroll. Locke → Smith → volta pelo mesmo contrato no Liberalismo. Relações de entrada usam `reverseLabel`. Múltiplas relações entre o mesmo par continuam distintas. Fontes sem URL permanecem legíveis. Ausência de relações e entidade desconhecida são explícitas. Diálogo funciona em 320/390 px e desktop, com teclado, toque e reduced motion.

Permalinks de verbetes e páginas específicas ficam para a fase de rotas, após validação. Esta fatia mantém as URLs editoriais e não reativa `/verbete/*` silenciosamente. Filtros e âncoras existentes continuam.

## Evolução do design system

Manter papel quente, preto, vermelho, fontes locais e tokens atuais. Referências locais inspecionadas: cartaz suíço (hierarquia e geometria), atlas impresso (leitura e documentos), arquivo experimental (metadados e descoberta); nenhuma é publicada como ativo. Preservar as composições distintas de Marxismo e Liberalismo.

Conexão apresenta destino, verbo orientado, natureza e estado; evidência, localizador e procedência ficam em detalhes expansíveis. Confiabilidade não é codificada só por cor. Sublinhado e indicador `+` no hipertexto, foco visível e alvos de toque existentes. Diálogo mantém dimensões durante a navegação; conteúdo rola internamente. Reutilizar o motion atual, sem animação nova de parágrafos nem loops.

## Migração, dependências, riscos e rollback

- **Fase 1:** captura, replay, reconciliação e publicação validada em [Ingestão reproduzível](INGESTAO-REPRODUZIVEL.md). Os riscos de ingestão ao vivo do diagnóstico são tratados pelo replay arquivado; nova coleta online não vira operação determinística.
- **Fase 2:** [Dados e carregamento](DADOS-E-CARREGAMENTO.md) implementa coleções com manifesto, índices e layouts de build, e carregamento com cache e TransferState. As descrições de `atlas.json` e de processamento em runtime do diagnóstico são históricas.

| Fase | Entrega e dependência | Verificação | Rollback |
|---|---|---|---|
| 0: auditoria + fatia atual | Projeção fiel e hipertexto nas duas páginas; depende só dos dados existentes | Unitários, integração CDK, E2E, axe, lint, typecheck, build, links; desktop e mobile | Reverter o diff da fatia; IDs, estrutura e URLs preservados; correção dos rótulos P737 pode ser mantida separadamente |
| 1: dados reproduzíveis | Fixtures brutas versionadas com hash, modo offline, reconciliação global por QID e aliases, validação antes da escrita atômica | Executar duas vezes offline e comparar hashes; rejeitar duplicados e referências quebradas | Preservar último snapshot validado e manifesto |
| 2: índices e shards | Manifesto por versão; entidades, fontes e relações em shards; adjacência, busca e layout antecipados; depende da fase 1 | Equivalência de consultas e resultados; bytes e gzip; hidratação; integridade entre shards | Adaptador carrega o JSON monolítico anterior |
| 3: catálogos e URLs | Entidades, ideologias, pessoas, obras; busca global real e permalinks; depende da fase 2 e da aprovação do escopo público | Links contra Router e prerender; teclado; filtros vazios; Back e Forward; retorno editorial | Retirar rotas pelo registro publicado; manter IDs |
| 4: rede e comparadores | Layouts antecipados, filtros e timelines; comparação histórica atribuída; depende de contratos e fontes | Alternativa textual; mobile; estabilidade; método e limites visíveis | Voltar à lista e à ficha; preservar dados canônicos |
| 5: cobertura e idiomas | Países, regimes, partidos, instituições, eventos e narrativas; traduções revisadas | QA editorial e de licenças por registro; fallback linguístico; testes de cobertura | Despublicar versões, sem apagar histórico |

**Riscos:** grafo empacotado e asset HTTP duplicam transporte; índices antigos contêm destinos despublicados; a ingestão atual depende de respostas mutáveis da rede e não garante replay; metadados de autoria de dados não substituem revisão humana; o Liberalismo tem menos profundidade narrativa. Nenhum se resolve copiando catálogos proprietários ou acrescentando backend automaticamente.

Resultados observados e capturas: [validação da fatia(../archive/2026-11/quality/EXPLORACAO-CONTEXTUAL.md).
