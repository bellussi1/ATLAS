---
name: atlas-pipeline-tradicao
description: Orquestra o pipeline de uma tradição do ATLAS (registro, descoberta por expansão e pontuação no Wikidata, captura, calibração de modelo, extração rica, consolidação no grafo, glossário e hovers, 12 capítulos, imagens, verificação) em estágios 0 a 14, cada um com contrato, porta de saída e estado retomável. Usar ao criar, ampliar ou retomar a leitura de uma ideologia ou tradição de ponta a ponta, ou ao medir quanto falta para ela chegar ao piso das leituras de referência.
---

# Pipeline de tradições

Este skill é o maestro. Cada estágio tem um skill ou script que faz o trabalho; aqui ficam a **ordem**, as **portas** e os **comandos**. Não duplique as regras deles:

- Descoberta e Wikimedia: `atlas-wiki-discovery`. Extração de texto: `atlas-wiki-extracao`.
- Capítulos e blocos: `atlas-create-ideology` (e `references/chapter-blocks.md`).
- Identidade visual: `atlas-editorial-geometrico`.

O objetivo é **acertar de primeira**: o gargalo é a revisão humana, então cada porta barra o retrabalho antes dela.

## Princípios do plano

1. **Um grafo só.** Tradições são lentes (etiqueta e cor da paleta), não coleções separadas. Entidade reconciliada por QID; o mesmo QID em pt e en é uma entidade com duas fontes.
2. **Sem sementes escolhidas por pessoa.** A descoberta parte da raiz Wikidata do registro (ideologia política e subclasses) e expande por anéis de 1 a 3 saltos, com teto por anel. Semente no registro é só dica opcional.
3. **Pontuação de importância** (`scripts/tradicao/scoring.mjs`): global primeiro (idiomas, nós já aceitos que citam, posição do link no artigo); bônus regional por regra explícita (Brasil e América Latina, Guerra Fria) com limiar menor. Acima do limite alto aceita; faixa do meio vira lista curta (≤ 30) para a pessoa decidir; abaixo, descarta. Listas, desambiguações e anos genéricos nunca entram.
4. **Conteúdo rico por entidade** (`scripts/tradicao/rich.mjs`): linha de hover (≤ 140), resumo de folha (≤ 600), seções com citação literal (origem, ideias centrais, contexto, controvérsias, bibliografia), glossário pt/en para ligar palavras-chave e relações em frase com fonte e natureza.
5. **Aresta só por relação histórica documentada**, nunca por semelhança ou associação temática.
6. **Modelo fixado por medição**, não por palpite (estágio 4).
7. **Visual:** ícone por tipo (`kind-icon`), cor por tradição; imagem do Commons só com licença conferida por arquivo e miniatura remota; sem licença clara, só ícone; ideologia usa símbolo ou bandeira livre, ou o motivo geométrico da paleta. Nunca copiar dados do 12axes (direitos reservados): só o método.

## Comandos

```bash
npm run tradicao -- <slug> --status                    # onde cada porta está, sem executar nada
npm run tradicao -- <slug> --stage N --dry-run         # plano do estágio: comandos, custo estimado, porta atual
npm run tradicao -- <slug> --stage N                   # executa o estágio e grava o estado
npm run tradicao -- <slug> --all [--from N] [--to M]   # percorre até a primeira porta aberta
npm run tradicao:coverage -- <slug>...                 # régua de cobertura contra o piso
```

Flags: `--force` refaz mesmo com entradas iguais e ignora a porta anterior; `--full` inclui lint, typecheck e testes no estágio 13; `--json` para máquina. Código de saída: 0 passou, 1 falhou, 2 bloqueado pela porta anterior.

**Estado** em `generated/pipeline/<slug>/state.json` (ignorado pelo Git): hash das entradas e saídas por estágio. Estágio cuja porta fecha e cujas entradas não mudaram é pulado; porta que já fecha sem registro é adotada, sem executar comando. Rodar de novo nunca refaz o que está pronto.

**README de retomada** em `generated/pipeline/<slug>/README.md`: reescrito a cada execução com o próximo estágio, a tabela de portas e os comandos exatos. Uma sessão nova começa por ele, sem depender desta conversa.

O orquestrador **nunca** executa `content:publish`, `publish-drafts`, `ingest:publish-raw` nem `git push`. Publicar é decisão humana (estágio 14).

## Estágios, contratos e portas

| N | Estágio | Faz | Porta de saída (resumo) |
|---|---|---|---|
| 0 | Régua | mede entidades por tipo, relações, fontes, capítulos, blocos e imagens; piso em `coverage-floor.json` | piso definido e cumprido por /marxismo e /liberalismo |
| 1 | Registro | `content/traditions/<slug>.json` é a única entrada humana; deriva sementes opcionais e esqueleto da leitura | registro válido, descoberta conhece o QID, paleta existe no mosaico |
| 2 | Descoberta | expansão por anéis a partir da raiz Wikidata, com pontuação e faixas | ≥ 8 aceitos, sem genérico, sem duplicata no mesmo idioma, teto por anel, faixa do meio curta |
| 3 | Captura | `wiki-extract fetch --candidates`; manifesto por captura | todo aceito com artigo local; manifestos válidos com SHA-256 |
| 4 | Calibração | Haiku 5.5 low, Haiku 5.5 medium e um modelo maior na mesma amostra (10+ entidades); mede relevância, relações e classificação | `scripts/tradicao/model-choice.json` válido e com modelo fixado por estágio |
| 5 | Extração rica | linha, resumo, seções, glossário e relações em frase, com citação literal, revisão `assistant` | 0 citações rejeitadas na reverificação, conteúdo rico completo, cobertura registrada |
| 6 | Consolidação | `wiki-drafts-to-collections.mjs` | todo aceito é entidade (ou unido por QID), grafo válido, ≥ 1 relação tipada |
| 7 | Glossário e hovers | índice de termos pt/en e linha e resumo por entidade | hover em ≥ 90% das entidades, termo ambíguo não é ligado sozinho |
| 8 | Redação | agente preenche os 12 capítulos | dossiê válido, ≤ 1 capítulo pendente (com motivo), capítulos com blocos no piso |
| 9 | Edição | agente revisa tom, pergunta e ponte | sem texto de reserva, pergunta e ponte presentes |
| 10 | Identidade | paleta, acento, assinatura, ícone por tipo | paleta declarada e igual à do registro |
| 11 | Imagens | licença **por arquivo**, miniatura remota, cada imagem uma vez | toda imagem com autor, licença, atribuição, página do arquivo; piso de imagens |
| 12 | Montagem | registro nos seis pontos da aplicação | publicada: registrada; rascunho: **ainda não** registrada |
| 13 | Verificação | `content:build` (+ `--full`: testes, lint, typecheck) | dossiê válido e **piso de cobertura atingido** |
| 14 | Publicação | só humano | revisão `revisado` com pessoa e data; depois, `content:publish` por pessoa |

Os seis pontos do estágio 12 estão em `registrationPoints` (`scripts/tradicao/stages.mjs`): `published-ideologies.ts`, `ideology-readings.ts`, `public-readings.ts`, `declaredDestinations` do e2e, e2e do explorador e o mapa do verbete.

## Método do 12axes (só o método)

- Progresso numa fonte única (`state.json`), com `pending`/`done` por estágio; o próximo passo é um estágio de plano, não uma lembrança. Por tipo de entidade, o mesmo registro é o próximo incremento (ainda por estágio, não por entidade).
- README autossuficiente para retomar em sessão nova (gerado).
- Um skill por tipo de entidade (pessoa, partido, evento, conceito, obra, instituição, estado, lugar): o estágio 5 deve usar prompts por tipo, montados e guardados por entidade em `generated/pipeline/<slug>/prompts/`.
- Saída temporária e validação **antes** do merge: a extração grava em `generated/`; só a consolidação (estágio 6) toca `content/`.
- Relatórios de cobertura (`tradicao:coverage`) e catálogos processados **um tipo por vez**.

## Fluxo

1. Peça ou escreva `content/traditions/<slug>.json` (slug, tipo, QID raiz, títulos pt/en, paleta, ícone, recorte). **Não invente QID**: confira no Wikidata.
2. Leia `generated/pipeline/<slug>/README.md` se existir; senão, `--status`. Antes de um estágio de rede ou API, `--stage N --dry-run`.
3. Estágio 2: aceite automático só pela pontuação; a lista do meio é para pessoa decidir e fica com `decidedBy`.
4. Estágio 4 antes de escalar a extração: meça na mesma amostra, em Haiku 5.5 low e medium e num modelo maior, relevância, relações e classificação (o 12axes relata queda de qualidade do Haiku em julgamento; na extração literal a citação já é verificada por máquina). Registre em `model-choice.json`.
5. Estágios 8 e 9 são de agente: leia o brief que `--dry-run` imprime e siga o `atlas-create-ideology`. Capítulo sem evidência fica `pending` com `gap`.
6. Pare na primeira porta aberta e relate: o que fechou, o que falta, custo estimado e medido, e o que precisa de pessoa.

## Regras que não se negociam

- Nada de fonte, data, citação, imagem ou revisão humana inventada. Revisão de IA é `assistant`.
- Imagem só com licença verificada por arquivo; cada imagem uma vez na narrativa.
- Wikipedia é CC BY-SA 4.0: guarde URL e revisão; texto integral fica em `generated/`.
- Dados do repositório 12axes têm direitos reservados: só a ideia e o método, nunca os arquivos.
- Rótulo do Wikidata (P1142, P737) é rótulo, não influência. Relação exige fonte e natureza.
- Uma tradição não vira pública sem aprovação humana explícita; o estágio 14 nunca é automático.

## Custo (Haiku 5.5, US$ 0,10 por MTok de entrada e US$ 0,50 de saída; Batch 50%)

Só os estágios de IA gastam API; `--dry-run` imprime a estimativa do estágio 5 a partir do texto dos artigos locais (entrada medida; saída assumida em 2.500 tokens por artigo, para o conteúdo rico pode subir). O custo real é a revisão humana, não a API.

## Lacunas conhecidas

- **Coletor de expansão ao vivo** (Wikidata, anéis 1 a 3): o núcleo puro está em `scoring.mjs` com testes, mas a coleta de vizinhos (links do texto e propriedades influenciado por, parte de, participante, país) ainda não existe. Hoje o estágio 2 roda o `discover` por links, e candidatos legados passam pela porta como "legado".
- **Extrator rico**: `richExtractionSchema` e a verificação de citação existem; o prompt e o `extract` em lote do conteúdo rico ainda não (o `extraction.mjs` atual produz o rascunho enxuto).
- **Calibração de modelo**: só o contrato e a porta; a medição precisa de chave de API e de rótulos de referência.
- `wiki-drafts-to-collections.mjs` tem a lista de tradições fixa (`TRADITIONS`) e não transforma `relations` dos rascunhos em arestas: as portas 6 e o piso de relações ficam abertos até isso existir.
- Coletor de imagens do Commons por entidade e escrita automática do registro (estágio 12) não existem; o gate só verifica.
- A régua mede presença, não qualidade; partido, estado e lugar não são exigidos porque /marxismo e /liberalismo não os têm.
