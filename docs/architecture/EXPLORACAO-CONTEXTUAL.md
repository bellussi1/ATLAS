# Enciclopédia explorável: diagnóstico e contrato inicial

Atualização: as fases 1 e 2 foram entregues e o pedido de Knowledge Explorer autorizou a fase 3, ampliando as três rotas originais para catálogos e páginas permanentes. Contratos e validação em [Knowledge Explorer](../quality/KNOWLEDGE-EXPLORER.md). O diagnóstico e as restrições iniciais abaixo documentam a base histórica da migração.

Atualização posterior: a fase 4 acrescenta `/rede` e `/comparar`, layouts compilados por coleção e globais, filtros comuns e timeline compartilhada. Comparações históricas/conceituais preservam fontes, estados e limites; não são sínteses ou escores automáticos. Contratos e evidências em [Rede e comparadores](../quality/REDE-E-COMPARADORES.md). A fase 5 continua pendente.

Atualização da fase 5: contratos específicos de país/regime, sete catálogos adicionais, oito registros constitucionais e internacionalização inicial do conteúdo pt-BR/en estão implementados. Quatro traduções têm revisão assistida por IA, explicitamente distinta de revisão humana. A cobertura editorial mundial e a tradução integral da interface/dossiês permanecem trabalho contínuo. [Entrega e limites](../quality/AMPLIACAO-EDITORIAL-E-IDIOMAS.md).

Data: 01/11/2026. Base ATLAS local e `origin/HEAD`: `5c5bfc707f0c425eab70a712260eb2f3b5ca95d9` (confirmado por `git ls-remote`). Este documento propõe a evolução; não autoriza publicar rotas além de Home, Marxismo e Liberalismo. A auditoria independente do outro repositório está em [12axes](../research/12axes-audit.md). Nenhuma memória externa foi usada.

## Diagnóstico verificável do ATLAS

| Responsabilidade | Evidência no repositório | Decisão |
| --- | --- | --- |
| Contratos e integridade | `core/content/models/content-schema.ts`: Entity discriminada em 12 tipos, Relation, Claim, Citation, Evidence, Source, Review, AssetLicense; Zod valida referências globais | Preservar; evitar schemas paralelos |
| Base comum | `src/content/atlas.json`, 223.843 bytes, 5 atlas, 48 entidades e 66 relações neste commit | Preservar IDs; separar armazenamento depois de medir carregamento |
| Editorial | `ideology-page.schema.ts`, snapshots `src/content/ideologies`, `published-ideologies.ts` | Preservar EditorialPage como IdeologyPage da feature; relacionar IDs do grafo explicitamente |
| Consultas | `knowledge-graph.ts` filtra tipo, período e direção; `entity-context.ts` monta fichas | Melhorar projeção contextual: não perder direção, relação ou fonte |
| Descoberta | `discovery-index.ts` possui busca normalizada, aliases e backlinks; Home pesquisa só duas leituras | Não confundir índice interno com catálogo público disponível |
| Destinos | Índice interno ainda produz `/verbete/*` e `/fontes`, removidos do Router | Não expor esses destinos; migrar por fases com teste contra Router real |
| Hipertexto | `KnowledgeTextComponent`, vocabulário e segmentador puro na feature ideologies | Reutilizar no Liberalismo; termos apontam a registros existentes |
| Contexto | Diretiva de abertura separada do CDK Dialog; `KnowledgeContextComponent` mantém histórico, scroll e foco | Preservar; identificar cada relação, inclusive duas para o mesmo destino |
| Rede e tempo | `IdeologyAtlasComponent` reutilizado; posições determinísticas no cliente, SVG e alternativas textuais | Futuro layout antecipado independente por coleção; não inferir genealogia |
| Ingestão | `scripts/ingest-wikimedia-atlas.mjs`, cliente/config/normalização compartilhados | Preservar; IDs Wikidata explícitos e rejeição de duplicados; ainda consulta rede atual |
| Estático e lazy | Angular outputMode static, prerender de três rotas, loadComponent, TransferState nos dossiês | Preservar; grafo importado por ContentRepository também entra no bundle cliente |
| Internacionalização | Texto editorial pt-BR, sem catálogo completo de traduções | Projetar fallback e idioma da fonte antes de ampliar; não traduzir automaticamente alegações |
| QA/CI | Vitest, Playwright + axe, ESLint boundaries, Biome, Prettier, build, links; `.github/workflows/ci.yml` | Ampliar comportamento observável no percurso e manter infraestrutura |

Lacunas concretas da projeção antiga: deduplicação por entidade apagava relações distintas; limite de oito conexões escondia percursos; direção e reverseLabel eram descartados; fontes de relações não acompanhavam a ficha; estado do cabeçalho era sempre “em revisão”. Contratos de dados já guardam mais informação do que a UI mostrava. Não há justificativa para substituir a arquitetura inteira.

## Alternativas e escolha

1. **Evolução do mecanismo existente (escolhida):** fortalecer projeção e diálogo compartilhados e demonstrar no texto das duas tradições. IDs, estrutura dos snapshots e URLs preservados; corrigidos 11 rótulos direcionais P737 existentes, no snapshot e no importador, conforme [definição do Wikidata](https://www.wikidata.org/wiki/Property:P737). A propriedade descreve o sujeito como influenciado pelo objeto; isso não constitui revisão historiográfica humana.
2. Criar uma nova feature Explorer e novas rotas agora: fornece catálogos imediatamente, mas duplicaria contexto e contrariaria a validação prévia pedida. Adiada.
3. Backend e grafo remoto: custo recorrente e novas dependências sem necessidade demonstrada para snapshots públicos. Descartada nesta etapa.

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

Core possui infraestrutura, entidades, relações, evidência, contratos editoriais globais e consultas. A feature ideologies mantém dossiês, composição e vocabulário; exploration possuirá catálogos, comparadores e redes quando houver jornadas publicadas. Shared fornece apresentação reutilizável e diretivas; não importa features. Design system permanece em tokens globais e primitivas shared. Ingestão não é dependência do runtime. Não criar uma segunda aplicação.

O build futuro deverá gerar artefatos derivados determinísticos: ordenação por ID, versão do schema, hash do snapshot e idioma no manifesto. Busca usa IDs/títulos/aliases/resumos normalizados; adjacência armazena relationId e direction, sem inventar relações; layouts são uma projeção separada dos fatos históricos. Falha referencial ou licença insuficiente bloqueia publicação do artefato correspondente. O índice atual é calculado em runtime: antecipá-lo no build é fase futura, não entrega fictícia desta fatia.

## Modelo de conhecimento

| Conceito pedido | Contrato reutilizado / evolução proposta |
| --- | --- |
| Entity | `entitySchema`: ID interno estável, slug, aliases, recorte, revisão; externalIds e editorialStatus hoje opcionais. Novos registros devem informar procedência e estado; tornar obrigatório exige migração |
| Ideology, Person, Work, Event, Institution, Party | Schemas discriminados já existentes, sem duplicação |
| País | `place` é lugar genérico; propor subtipo country e historicidade só com fontes; não usar government como país |
| HistoricalRegime | `historical-polity` e `government` são aproximações, não equivalência automática a regime. Futuro schema discriminado com recorte temporal e classificação atribuída |
| Relation | Reutilizar IDs, extremidades, label/reverseLabel, contexto, incerteza, evidências, estado e proveniência existentes |
| Claim | Classificação documentada/atribuída/interpretação/hipótese/inferência/controversa/não verificada e estado separados |
| Evidence / Source | Evidence contém sourceId/localizador/data; Citation separa sustenta/contesta/contextualiza; Source possui edição e URL opcional |
| MediaAsset | `assetLicenseSchema` já registra arquivo, entidade, autor, licença, atribuição e autorização. Não renomear todos os consumidores por cosmética |
| EditorialPage | `IdeologyPage` permanece na feature. Futuro contrato geral só quando uma segunda família editorial o exigir; referências ao grafo por ID |

Taxonomia-alvo de relações: influência documentada, divergência atribuída, associação documentada, vínculo editorial, vínculo enciclopédico e similaridade analítica. Os tipos legados `influenced_by`, `reacted_against`, `documented-association` etc. continuam intactos nesta fatia. Migrar com tabela explícita e revisão: Wikidata P737 não vira influência comprovada; “analisa criticamente” não vira causalidade. Similaridade analítica ainda não existe no schema e precisa declarar método, dimensões, incerteza e fontes antes de ser adicionada. Proximidade visual não é evidência.

## Contratos de componentes e primeira fatia

- `KnowledgeTextComponent(text)` usa vocabulário da feature, preserva literalmente texto e pontuação, limita a quatro entidades e uma ocorrência por entidade em cada trecho. Hover/foco mostram pista; clique/Enter/toque abrem a mesma ficha.
- `KnowledgeContextDirective(ContextRequest)` aceita entityId ou registro editorial explícito; abre CDK Dialog com título, tamanho reservado, Escape, bloqueio de scroll e restauração do gatilho.
- `entityContext(repository, id)` projeta o grafo sem alterar registros. Contexto ausente tem mensagem e arrays vazios. Conexões mantêm relationId, entidade destino, direção, rótulo orientado, tipo, contexto, estado, evidência e procedência. Nada é promovido a validado por possuir URL.
- `KnowledgeContextComponent` mostra ficha e referências, permite seguir relação e voltar ao registro/scroll/controle anteriores, sem mudar URL nem a narrativa por baixo. Histórico é da sessão do diálogo, não rastreamento persistente.
- `IdeologyAtlasComponent` continua responsável por rede/tempo; reutiliza o hipertexto no resumo da entidade. Sem copiar árvore por tradição.

Critérios: Marx → relação com obra → obra → contexto anterior → Escape devolve foco e scroll; Locke → Smith → volta pelo mesmo contrato no Liberalismo; relações de entrada usam reverseLabel; múltiplas relações entre o mesmo par continuam distintas; fontes sem URL permanecem legíveis; ausência de relações e entidade desconhecida são explícitas; diálogo funciona a 320/390px e desktop, teclado, toque e reduced motion.

Links permanentes de verbetes e páginas específicas serão tratados na fase de rotas, após validação. Esta fatia mantém URLs editoriais e não reativa `/verbete/*` silenciosamente. Filtros e âncoras existentes continuam disponíveis.

## Evolução do design system

Manter papel quente, preto, vermelho, fontes locais e tokens atuais. Referências locais inspecionadas: cartaz suíço (hierarquia e geometria), atlas impresso (leitura e documentos), arquivo experimental (metadados e descoberta); nenhuma será publicada como ativo. Preservar composições distintas de Marxismo e Liberalismo.

Conexão deve apresentar destino + verbo orientado + natureza + estado; evidência/localizador e procedência ficam em detalhes expansíveis. Não codificar confiabilidade apenas em cor. Usar sublinhado e indicador + no hipertexto, foco visível e alvos de toque existentes. Diálogo mantém dimensões durante navegação; conteúdo rola internamente. Reutilizar motion atual, sem animação nova de parágrafos nem loops.

## Migração, dependências, riscos e rollback

Atualização da fase 1: a implementação de captura/replay, reconciliação e publicação validada está em [Ingestão reproduzível](INGESTAO-REPRODUZIVEL.md). Naquela entrega, fases 2–5 permaneciam pendentes. Os riscos de ingestão ao vivo descritos no diagnóstico original são tratados pelo replay arquivado, sem transformar uma nova coleta online em operação determinística.

Atualização posterior da fase 2: [Dados e carregamento](DADOS-E-CARREGAMENTO.md) implementa as coleções com manifesto, índices/layouts de build e carregamento/cache/TransferState. Fases 3–5 continuam pendentes; as descrições de `atlas.json` e processamento em runtime no diagnóstico inicial são históricas.

| Fase | Entrega e dependência | Verificação | Rollback |
| --- | --- | --- | --- |
| 0: auditoria + fatia atual | projeção fiel e hipertexto nas duas páginas; depende apenas de dados existentes | unitários, integração CDK, E2E, axe, lint/typecheck/build/links, desktop/mobile | reverter diff da fatia; IDs/estrutura/URLs preservados, correção dos rótulos P737 pode ser mantida separadamente |
| 1: dados reproduzíveis | fixtures brutas versionadas/hash, modo offline, reconciliação global QID/aliases, validação no comando de ingestão antes de escrita atômica | executar duas vezes offline e comparar hashes; rejeitar duplicados/referências quebradas | preservar último snapshot validado e manifesto |
| 2: índices e shards | manifesto por versão; entidades/fontes/relações separadas por responsabilidade, adjacência/search/layout antecipados; depende da fase 1 | equivalência de consultas e resultados, bytes/gzip e hidratação, integridade entre shards | adaptador carrega JSON monolítico anterior |
| 3: catálogos + URLs | entidades/ideologias/pessoas/obras, busca global real e permalinks; depende da fase 2 e aprovação do escopo público | links contra Router/prerender, teclado, filtros vazios, Back/Forward, retorno editorial | retirar rotas pelo registro publicado, manter IDs |
| 4: rede/comparadores | layouts antecipados, filtros e timelines, comparação histórica atribuída; depende de contratos e fontes | alternativa textual, mobile, estabilidade, método e limites visíveis | voltar à lista/ficha, preservar dados canônicos |
| 5: cobertura e idiomas | países/regimes/partidos/instituições/eventos e narrativas, traduções revisadas | QA editorial/licenças por registro, fallback linguístico e testes de cobertura | despublicar versões, sem apagar histórico |

Não executar fases 1–5 antes de validar esta fatia. Riscos: grafo empacotado e asset HTTP duplicam transporte; índices antigos contêm destinos despublicados; ingestão atual depende de respostas mutáveis da rede e não garante replay; metadados de autoria de dados não substituem revisão humana; Liberalismo tem menos profundidade narrativa. Nenhum deles se resolve copiando catálogos proprietários ou acrescentando backend automaticamente.

Resultados observados e capturas ficam em [validação da fatia](../quality/EXPLORACAO-CONTEXTUAL.md).
