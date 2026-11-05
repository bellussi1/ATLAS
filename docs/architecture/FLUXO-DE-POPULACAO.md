# Fluxo de população e extração

Como uma tradição sai do Wikidata e chega ao grafo. Orquestrador: `npm run tradicao -- <slug> --status`. Portas em `scripts/tradicao/stages.mjs`; regras no skill `atlas-pipeline-tradicao`. Estágio é "grátis" salvo indicação; só 4 e 5 gastam API.

## Estágios

| N   | Estágio              | Entrada                     | Saída                                                     | Comando                                                                  | Porta de saída                                             | Situação                                                           |
| --- | -------------------- | --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 0   | Régua                | `content/`                  | `coverage.json`                                           | `npm run tradicao:coverage -- <slug>`                                    | piso definido e cumprido pelas referências                 | funciona                                                           |
| 1   | Registro             | pessoa                      | `content/traditions/<slug>.json`                          | `--stage 1` valida                                                       | registro válido, paleta existe                             | funciona; arquivo escrito à mão                                    |
| 2   | Descoberta           | QID raiz                    | `candidates/<slug>.json`, `wikidata-labels.json`, captura | `npm run tradicao:discover -- <slug>`                                    | ≥ 8 aceitos, teto por anel, lista curta ≤ 30, sem genérico | funciona; lento (minutos por anel); faixa do meio é decisão humana |
| 3   | Captura              | aceitos                     | `generated/wiki-extract/<slug>/articles/`, manifesto      | `node scripts/wiki-extract.mjs fetch <slug> --candidates [--refresh]`    | todo aceito com artigo; SHA-256                            | funciona; Wikipedia devolve 429 com várias sessões                 |
| 4   | Avaliação (paga)     | ~20 artigos                 | `generated/eval/<id>/`, `model-choice.json`               | `npm run tradicao:eval -- run --from a,b --sample 20`, `report`, `score` | modelo de extração fixado                                  | executada; ver resultado abaixo                                    |
| 5   | Extração rica (paga) | artigos                     | `extracts/<id>.json`, respostas cruas, `STATE.json`       | `npm run tradicao:extract -- <slug> --dry-run`, depois `--max-usd N`     | conteúdo rico, citações literais, relações confirmadas     | validada na amostra; `extract` lê o modelo de `model-choice.json`  |
| 6   | Consolidação         | rascunhos, rótulos, imagens | coleção no manifesto, com arestas                         | `node scripts/content/wiki-drafts-to-collections.mjs`                    | grafo válido, ≥ 1 relação tipada                           | funciona; aresta depende do estágio 5                              |
| 7   | Glossário            | rascunhos ricos             | `glossary.json`                                           | `--stage 7`                                                              | hover em ≥ 90%, ambíguo não liga                           | funciona; UI de hover ainda não lê este arquivo                    |
| 8   | Redação              | grafo                       | `content/ideologies/<slug>/page.json`                     | agente, `atlas-create-ideology`                                          | dossiê válido, ≤ 1 capítulo pendente                       | manual                                                             |
| 9   | Edição               | dossiê                      | dossiê revisado                                           | agente                                                                   | sem texto de reserva                                       | manual                                                             |
| 10  | Identidade           | registro                    | paleta, assinatura                                        | `--stage 10` verifica                                                    | paleta igual à do registro                                 | funciona                                                           |
| 11  | Imagens              | QIDs                        | `images.json`, `assetLicenses`                            | `npm run tradicao:images -- <slug>`                                      | autor, licença, atribuição, uma vez cada; piso             | funciona; ícone por tipo sem licença                               |
| 12  | Montagem             | leitura                     | seis pontos da aplicação                                  | manual                                                                   | registrada se publicada                                    | a porta só verifica                                                |
| 13  | Verificação          | tudo                        | build                                                     | `--stage 13 [--full]`                                                    | dossiê válido, piso de cobertura                           | funciona; hoje barra social-democracia por relações                |
| 14  | Publicação           | revisão humana              | R2                                                        | só pessoa: `npm run content:publish`                                     | revisão com pessoa e data                                  | nunca automática                                                   |

## O que o extrator entrega

Por entidade, em `extracts/<id>.json` (`contract: rich-v1`, revisão `assistant`, URL, revisão do artigo e licença CC BY-SA):

- `oneLine` (≤ 140, hover) e `summary` (≤ 600, folha lateral);
- `sections` com citação literal: origem, ideias centrais, contexto, controvérsias, bibliografia;
- `glossary` com termos e apelidos pt/en, que viram `aliases` para ligar palavras-chave;
- `dates`, `claims`, `relations`, além de `rejected` (o que as travas tiraram, com motivo) e `counts`.

## Travas das relações

Uma relação só vira aresta se passar por todas, nesta ordem (`guards.mjs`, `wiki-drafts-to-collections.mjs`):

1. Tipo da lista fechada e direção declarada (`entidade-para-alvo` ou `alvo-para-entidade`).
2. Citação literal do que o modelo leu, com ao menos 20 caracteres e 3 palavras. Só tipografia é normalizada.
3. Alvo nomeado na própria citação; verbo compatível com o tipo; voz passiva coerente com a direção.
4. Segunda passada: o modelo lê o parágrafo e responde `confirma`, `inverte` ou `nao-sustenta`. Só `confirma` fica; silêncio é rejeição. Seções, datas e afirmações passam por conferência igual, contra a citação e o parágrafo.
5. Alvo com QID, resolvido pelos links do artigo, presente no grafo. Sem isso fica no relatório do conversor, não vira palpite.

A aresta guarda a citação como evidência, a fonte Wikipedia e `editorialStatus: pending`. Rótulo do Wikidata (P737, P1142) vira `associated_with`, com aviso de que não documenta influência.

## Controle de custo

- `--dry-run` não chama a API: mostra tokens e dólares, esperado e pior caso. Tokens são estimados por 2,7 caracteres por token, do lado que superestima; a saída esperada é hipótese até a primeira medição.
- `--max-usd` aborta (saída 3) antes do primeiro pedido se o **pior caso** não couber: todo `max_tokens`, toda escrita de cache. Lote enviado não para no meio, então o teto vem antes. `--max-total-usd` (padrão 10) soma todo `STATE.json` do checkout.
- Lote por padrão (50%); prompt fixo com cache de 1 hora, marcado só com 3 pedidos ou mais; o prompt da segunda passada está abaixo do mínimo cacheável e não leva marca.
- Retomada: lote aberto é reaproveitado; resposta paga fica crua em `responses/` antes de qualquer análise; falha só volta com `--retry-failed`; envio interrompido antes de registrar o lote para e pede conferência, para não pagar duas vezes.
- `generated/pipeline/<slug>/STATE.json` é a fonte única: estágios, passadas por entidade, lotes e razão de gasto. Cada braço da avaliação tem o seu em `generated/eval/<id>/<braço>/`.

## Avaliação e regra de decisão

`run` executa a amostra em Haiku 5.5 `low` e `medium`. `reguard` reaplica as travas às respostas já pagas, sem API, reaproveitando vereditos; relação que só agora passa fica à espera da segunda passada e não vai para a conferência nem para o grafo. `report` mede citações e relações rejeitadas e gera `revisao.md` e `revisao.json`, com toda relação aceita e dois itens de texto por artigo, sem marca. A pessoa marca `ok`, e pode conferir uma configuração só, com `pending --arm` e `marks --file`, que traz as marcas item a item sem substituir o arquivo principal. `false` é erro do modelo: o trecho não sustenta o item. `true` com nota começando por `FONTE:` é erro da fonte: o item repete fielmente um artigo errado. Esse erro não conta para os 5% e vai para `correcoes-fonte.json`, para a revisão editorial; citação literal não detecta erro do próprio artigo. `score` calcula o erro restante do modelo:

- abaixo de 5% em relações e em texto, no braço mais barato que passar: Haiku fica (`haiku-fica`);
- texto abaixo de 5% e relações acima nos dois: só relações sobe, para Sonnet 5.5, com `--relation-model` (`so-relacoes-sobe`). Isso troca o modelo da segunda passada; a proposta das relações continua no Haiku, então uma cobertura ruim de relações pede outra medição;
- texto acima nos dois: revisar prompt e travas (`revisar-prompt`), sem fixar modelo;
- menos de 40 itens conferidos por braço: `insuficiente`.

## Resultado da avaliação (05/11/2026)

Gasto até aqui: US$ 0,12. Decisão da regra: `so-relacoes-sobe`, gravada em `scripts/tradicao/model-choice.json`: extração em Haiku 5.5 `medium` e segunda passada das relações em Sonnet 5.5, sem medição própria ainda.

- Erro restante do modelo, em `medium`: texto 2,6% (1 de 38) e relações 7,1% (3 de 42). Erros de fonte à parte: 3.
- A conferência foi feita em dois tempos: 14 marcas herdadas de uma conferência com fontes externas e 66 por IA, a pedido do usuário. Só a IA julgou a versão final, e não houve segunda leitura humana.
- A conferência do texto tirou 66 de 257 itens. Dos que tinham marca, removeu 5 dos 6 errados e 7 de 34 certos, então perde conteúdo verdadeiro. 9 saíram por falta de veredito.

## Depois da coleção: o que aparece onde

| Saída                                        | Como nasce                                                            | Quem decide                       |
| -------------------------------------------- | --------------------------------------------------------------------- | --------------------------------- |
| `/verbete/:slug` e `/conhecimento`           | Automático: toda entidade da coleção entra no grafo (`content:build`) | ninguém; vale o que está no grafo |
| Página de ideologia (dossiê de 12 capítulos) | Manual, estágios 8 e 9, só para famílias                              | agente redige, pessoa revisa      |
| Publicação no R2                             | `npm run content:publish`                                             | só pessoa; nunca automática       |

Ordem: descoberta, captura, extração, conversão para coleção, `content:build` e testes, commit local, **revisão humana**, publicação.

## Ideologias principais

Coleção curada (`content/traditions/ideologias-principais.json` e `candidates/ideologias-principais.json`) para dar ficha, relações e lugar no mapa a cerca de 60 ideologias com artigo próprio, de várias famílias. Não leva descoberta por anéis nem dossiê: os candidatos vêm de lista curada (decisor `curadoria`), cada nome é conferido contra a Wikipédia, e o que não tem artigo próprio fica de fora. Os estágios de dossiê (8 e 9) valem só para as famílias. O cheque de tipos do estágio 2 não se aplica a essa coleção.

## Quebrado ou manual

- **Artigos antigos de marxismo e liberalismo não têm `links` nem `targets`.** Sem eles nenhuma relação resolve QID. Rode `fetch <slug> --candidates --refresh` (grátis) antes de extrair; por isso a amostra usa social-democracia e anarquismo.
- **Relação cujo alvo não é link no artigo fica sem QID** e não vira aresta. Não há resolução por título depois da extração.
- **Rascunhos enxutos já feitos no chat seguem sem aresta:** a natureza é texto livre e a direção é desconhecida, então continuam como afirmações. Viram arestas só reprocessados.
- **Snapshots Wikimedia publicados mantêm P737 como `influenced_by`,** com rótulo explícito de Wikidata, em `transform.mjs`. Trocar para associação muda o resultado e exige nova captura; o conversor novo já usa associação.
- **`npm run ingest:verify` para em `Corpo ausente` num checkout novo:** as capturas `wiki-extract` guardam corpos só na máquina que coletou. As capturas Wikimedia reproduzem (8 de 8); as `wiki-extract` dependem de `ingest:fetch-raw` e de os corpos terem sido publicados com `ingest:publish-raw` (decisão humana).
- **A configuração `social-democracy` de `ingest-wikimedia-atlas` usa o mesmo id `atlas-social-democracia`** dos rascunhos e sobrescreveria a coleção.
- **Estágio 12 é manual.** Nenhum componente lê `glossary.json`: a ligação de palavras-chave e o hover ainda precisam de UI. A linha de definição já aparece no verbete, por `discoveryMetadata.description`.
- **Saída estruturada não garante lista fechada:** o auxiliar do SDK transforma `enum` em descrição. A lista é aplicada por código, e o esquema real só será testado pela API na primeira rodada.
- **Descoberta validada ao vivo só no anel 1** (social-democracia, cerca de 8 minutos, 92 respostas): 30 aceitos, 23 na lista curta. Entraram Partido dos Trabalhadores e PDT, e "Política" e "Estado" foram para a lista curta. Ainda há ruído no nicho regional (Clarín, Huber Matos), aceito sem passar por pessoa, e tipo errado vindo do Wikidata ("Capitalismo" como movimento). Anéis 2 e 3 só têm teste com dublê.
- **Recusas do Haiku** em temas como fascismo ficam como falha no `STATE.json`, sem substituto automático.
