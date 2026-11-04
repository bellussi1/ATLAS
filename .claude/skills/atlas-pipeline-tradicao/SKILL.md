---
name: atlas-pipeline-tradicao
description: Orquestra o pipeline de uma tradição do ATLAS (registro, descoberta, captura, extração Haiku, consolidação no grafo, 12 capítulos, imagens, verificação) em estágios 0 a 12, cada um com contrato, porta de saída e estado retomável. Usar ao criar, ampliar ou retomar a leitura de uma ideologia ou tradição de ponta a ponta, ou ao medir quanto falta para ela chegar ao piso das leituras de referência.
---

# Pipeline de tradições

Este skill é o maestro. Cada estágio tem um skill ou script que faz o trabalho; aqui ficam a **ordem**, as **portas** e os **comandos**. Não duplique as regras deles:

- Descoberta e Wikimedia: `atlas-wiki-discovery`. Extração de texto: `atlas-wiki-extracao`.
- Capítulos e blocos: `atlas-create-ideology` (e `references/chapter-blocks.md`).
- Identidade visual: `atlas-editorial-geometrico`.

O objetivo é **acertar de primeira**: o gargalo é a revisão humana, então cada porta barra o retrabalho antes dela.

## Comandos

```bash
npm run tradicao -- <slug> --status                    # onde cada porta está, sem executar nada
npm run tradicao -- <slug> --stage N --dry-run         # plano do estágio: comandos, custo estimado, porta atual
npm run tradicao -- <slug> --stage N                   # executa o estágio e grava o estado
npm run tradicao -- <slug> --all [--from N] [--to M]   # percorre até a primeira porta aberta
npm run tradicao:coverage -- <slug>...                 # régua de cobertura contra o piso
```

Flags: `--force` refaz mesmo com entradas iguais e ignora a porta anterior; `--full` inclui lint, typecheck e testes no estágio 11; `--json` para máquina. Código de saída: 0 passou, 1 falhou, 2 bloqueado pela porta anterior.

**Estado** em `generated/pipeline/<slug>/state.json` (ignorado pelo Git): hash das entradas e saídas por estágio. Estágio cuja porta fecha e cujas entradas não mudaram é pulado; porta que já fecha sem registro é adotada, sem executar comando. Rodar de novo nunca refaz o que está pronto.

O orquestrador **nunca** executa `content:publish`, `publish-drafts`, `ingest:publish-raw` nem `git push`. Publicar é decisão humana (estágio 12).

## Estágios, contratos e portas

| N | Estágio | Faz | Porta de saída (resumo) |
|---|---|---|---|
| 0 | Régua | mede entidades por tipo, relações, fontes, capítulos, blocos e imagens; piso em `scripts/tradicao/coverage-floor.json` | piso definido e cumprido por /marxismo e /liberalismo |
| 1 | Registro | `content/traditions/<slug>.json` é a única entrada humana; deriva sementes e esqueleto da leitura | registro válido, sementes iguais, descoberta conhece o QID, paleta existe no mosaico |
| 2 | Descoberta | `wiki-extract discover`; escolha dos aceitos | ≥ 8 aceitos, todos com decisor, ≥ 3 tipos, sem catálogo sem decisor nomeado |
| 3 | Captura | `wiki-extract fetch --candidates`; manifesto por captura | todo aceito com artigo local; manifestos válidos com SHA-256 |
| 4 | Extração | `wiki-extract extract` (Haiku 5.5, effort low, Batch) | 0 citações rejeitadas **na reverificação**, revisão `assistant`, cobertura registrada |
| 5 | Consolidação | `wiki-drafts-to-collections.mjs` | todo aceito é entidade (ou unido por QID), grafo válido, ≥ 1 relação tipada |
| 6 | Redação | agente Haiku 5.5 low preenche os 12 capítulos | dossiê válido, ≤ 1 capítulo pendente (com motivo), capítulo preenchido tem fonte |
| 7 | Edição | agente revisa tom, pergunta e ponte | sem texto de reserva, pergunta e ponte presentes |
| 8 | Identidade | paleta, acento, assinatura, ícone por tipo | paleta declarada e igual à do registro |
| 9 | Imagens | licença **por arquivo**, miniatura remota, cada imagem uma vez | toda imagem com autor, licença, atribuição, página do arquivo; piso de imagens |
| 10 | Montagem | registro nos seis pontos da aplicação | publicada: registrada; rascunho: **ainda não** registrada |
| 11 | Verificação | `content:build` (+ `--full`: testes, lint, typecheck) | dossiê válido e **piso de cobertura atingido** |
| 12 | Publicação | só humano | revisão `revisado` com pessoa e data; depois, `content:publish` por pessoa |

Os seis pontos do estágio 10 estão em `registrationPoints` (`scripts/tradicao/stages.mjs`): `published-ideologies.ts`, `ideology-readings.ts`, `public-readings.ts`, `declaredDestinations` do e2e, e2e do explorador e o mapa do verbete.

## Fluxo

1. Peça ou escreva `content/traditions/<slug>.json` (slug, tipo, QID raiz, títulos pt/en, paleta, ícone, recorte com o que entra e o que fica de fora, sementes). **Não invente QID nem URL**: confira no Wikidata e na Wikipedia.
2. `--status` para ver a primeira porta aberta; `--stage N --dry-run` antes de executar um estágio de rede ou API.
3. Estágios 2 e 4 têm decisão editorial: quem aceita candidatos deixa `decidedBy` (IA ou pessoa); aceite automático só pelo `--accept-top`, que só vale para tipos com regra.
4. Estágios 6 e 7 são de agente: leia o brief que `--dry-run` imprime (modelo, effort, skill) e siga o `atlas-create-ideology`. Escreva só o que as fontes do grafo sustentam; capítulo sem evidência fica `pending` com `gap`.
5. Pare na primeira porta aberta e relate: o que fechou, o que falta, o custo estimado e o medido, e o que precisa de pessoa.

## Regras que não se negociam

- Nada de fonte, data, citação, imagem ou revisão humana inventada. Revisão de IA é `assistant`.
- Imagem só com licença verificada por arquivo; cada imagem uma vez na narrativa.
- Wikipedia é CC BY-SA 4.0: guarde URL e revisão; texto integral fica em `generated/`.
- Dados do repositório 12axes têm direitos reservados: só a ideia de catálogo, nunca os arquivos.
- Rótulo do Wikidata (P1142, P737) é rótulo, não influência. Relação exige fonte e natureza.
- Uma tradição não vira pública sem aprovação humana explícita; o estágio 12 nunca é automático.

## Custo (Haiku 5.5, US$ 0,10 por MTok de entrada e US$ 0,50 de saída; Batch 50%)

Só o estágio 4 gasta API; `--dry-run` imprime a estimativa a partir do texto dos artigos locais (entrada medida; saída assumida em 2.500 tokens por artigo). Uma tradição de ~16 artigos custa na ordem de centavos. Os estágios 6 e 7 também usam Haiku e dependem do tamanho do grafo. O custo real é a revisão humana, não a API.

## Lacunas conhecidas

- `wiki-drafts-to-collections.mjs` tem a lista de tradições fixa (`TRADITIONS`): uma tradição nova precisa entrar lá até o conversor ler o registro.
- O conversor não transforma as `relations` dos rascunhos em arestas do grafo: a porta 5 e o piso de relações ficam abertos até isso existir.
- O estágio 10 só **verifica** o registro; a escrita automática nos seis pontos ainda é manual.
- A régua mede presença, não qualidade; partido, estado e lugar não são exigidos porque /marxismo e /liberalismo não os têm.
