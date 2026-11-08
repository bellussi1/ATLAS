Status: plano
Última verificação: 08/11/2026

# Plano de expansão com Haiku e Sonnet

**Data:** 07/11/2026

**Escopo:** quatro leituras publicadas (Marxismo, Liberalismo, Social-democracia e Anarquismo), grafo compartilhado, 53 leituras de ideologias ainda não publicadas e futuros verbetes.

**Objetivo:** extrair mais entidades, fontes, afirmações e relações, revisar o que já existe e elevar a qualidade editorial sem trocar rigor por volume.

---

## 1. Diagnóstico de partida

### Conteúdo e grafo

| Leitura           | Entidades | Relações no grafo | Fontes | Fontes citadas | Capítulos com blocos | Capítulos completos | Blocos / tipos | Piso      |
| ----------------- | --------: | ----------------: | -----: | -------------: | -------------------: | ------------------: | -------------: | --------- |
| Marxismo          |        42 |               122 |    123 |             29 |                11/12 |                   7 |        19 / 10 | cumprido  |
| Liberalismo       |        31 |                75 |     98 |             27 |                11/12 |                   7 |         14 / 8 | cumprido  |
| Social-democracia |        54 |                35 |     70 |             16 |                 8/12 |                   0 |          8 / 5 | 4 lacunas |
| Anarquismo        |        46 |                10 |     56 |             10 |                 8/12 |                   0 |          8 / 5 | 5 lacunas |

Total do grafo: **1.158 entidades, 833 relações, 1.261 fontes, 9.594 afirmações e 10.287 evidências**.

### O que está bloqueando

1. **Captura incompleta:** faltam 57 artigos em Social-democracia e 51 em Anarquismo. Sem eles, o estágio 5 não roda, o glossário não nasce e a cobertura continua abaixo do piso.
2. **Relações fracas:** Social-democracia tem 35 relações e Anarquismo tem 10, contra um piso de 37 que foi medido nas duas leituras maduras. O problema não é só quantidade: faltam tipos, direção e evidência.
3. **Capítulos vazios de interação:** as duas leituras têm 8/12 capítulos com blocos e nenhum capítulo completo. Faltam cronologia, debate estruturado, grafo de vertentes e blocos de origens/conceitos.
4. **Glossário e hovers:** o estágio 7 está bloqueado porque não há conteúdo rico. O glossário já existe no contrato, mas não chega à interface.
5. **Avaliação de Sonnet incompleta:** o Haiku 5.5 medium foi medido para texto (2,6% de erro restante) e relações (7,1%). O Sonnet 5.5 foi escolhido para a segunda passada das relações, mas **não tem medição própria**.
6. **Release público atrasado:** o ponteiro público está atrás do conteúdo local. Nada disso aparece no site até a publicação humana.

### O que já está pronto

- Pipeline com estágios, portas, estado retomável, `--dry-run`, teto de gasto, lote e cache.
- Travas de código: citação literal, tipo fechado, direção, alvo com QID, segunda passada e deduplicação.
- Modelo já fixado: **Haiku 5.5 medium** para extração e **Sonnet 5.5 low** para verificar relações.
- Custo medido: aproximadamente **US$ 0,004 por entidade** no ciclo extração + verificação de texto + verificação de relações. O orçamento disponível é **US$ 10**.

---

## 2. Princípios do plano

1. **Haiku para cobertura, Sonnet para julgamento.** O Haiku propõe em escala; o Sonnet verifica, compara e resolve conflito. Nenhum modelo aprova a própria saída.
2. **Toda relação nasce de um trecho.** Sem citação literal, alvo nomeado, tipo fechado e QID existente, não há aresta.
3. **Precisão antes de volume.** Uma relação errada custa mais que dez relações ausentes. O alvo é precisão ≥ 95% na amostra humana, não “o máximo de arestas”.
4. **Nada de entidade inventada.** O modelo só pode ligar registros que já existem no grafo ou que tenham QID e artigo verificável. Nome sem QID vira fila de revisão, não entidade.
5. **Rótulo do Wikidata não é influência.** P737 e P1142 continuam como associação de catálogo, com aviso.
6. **Humano é a última porta.** O modelo prepara a fila; a pessoa aprova o meio, o conflito e a publicação.
7. **Custo é parte do contrato.** Cada onda tem `--dry-run`, `--max-usd` e `--max-total-usd`. O teto compara o pior caso, não a esperança.
8. **Uma onda, um commit.** Não misturar extração, consolidação, redação e publicação no mesmo diff.

---

## 3. Papéis dos modelos

| Trabalho                                                                            | Modelo                                         | Por quê                                                      | Saída                           |
| ----------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ | ------------------------------- |
| Extração rica (linha, resumo, seções, glossário, datas, claims, relações propostas) | **Haiku 5.5 medium**                           | Melhor custo por volume; texto já medido em 2,6% de erro     | JSON rico com citações          |
| Proposta de relações por parágrafo                                                  | **Haiku 5.5 medium**                           | Cobre muitos parágrafos barato; erro é filtrado depois       | Relações candidatas             |
| Verificação de relação (confirma, inverte, não sustenta)                            | **Sonnet 5.5 low**                             | O Haiku rejeitou 48,8% das relações; julgamento fino importa | Veredito por relação            |
| Resolução de conflito e deduplicação                                                | **Sonnet 5.5 low/medium**                      | Duas fontes, duas direções, dois tipos: exige comparação     | Aresta única com fontes         |
| Extração de candidatos a entidade (obra, evento, instituição, lugar)                | **Haiku 5.5 medium**                           | Nomes e funções vêm do texto; sem criar QID                  | Lista de nomes + trecho         |
| Reconciliação de candidatos com Wikidata                                            | **Haiku** para buscar; **Sonnet** para decidir | Busca é barata; decisão de identidade é cara                 | QID ou fila                     |
| Revisão editorial de capítulo                                                       | **Sonnet 5.5 medium**                          | Coerência, voz, lacuna e repetição exigem leitura longa      | Relatório + sugestões           |
| Pergunta, resposta e ponte de capítulo                                              | **Sonnet 5.5 low**                             | Precisa do capítulo inteiro, não de um parágrafo             | Texto curto para revisão humana |
| Auditoria de fonte × afirmação                                                      | **Haiku** em massa; **Sonnet** nos contestados | Grande volume, com escalada                                  | `ok`, `fraco`, `não sustenta`   |
| Relatório final de qualidade                                                        | **Sonnet 5.5 medium**                          | Compara quatro leituras e detecta contradição                | Lista priorizada                |

**Regra de ouro:** o Haiku nunca verifica o que ele mesmo propôs na mesma passada. A segunda passada é sempre Sonnet, com o parágrafo e a citação, não com a resposta anterior como única verdade.

---

## 4. Ondas de trabalho

### Onda 0 — Destravar e medir (grátis, 1 a 2 dias)

**Objetivo:** colocar as quatro leituras na mesma linha de partida.

1. Capturar os artigos faltantes:
   ```bash
   npm run tradicao -- social-democracia --stage 3
   npm run tradicao -- anarquismo --stage 3
   ```
   Se a Wikipedia devolver 429, repetir com pausa e cache local. Não pagar API antes de ter artigos.
2. Atualizar links e alvos dos artigos antigos de Marxismo e Liberalismo:
   ```bash
   node scripts/wiki-extract.mjs fetch marxismo --candidates --refresh
   node scripts/wiki-extract.mjs fetch liberalismo --candidates --refresh
   ```
3. Medir a linha de base:
   ```bash
   npm run tradicao:coverage -- marxismo liberalismo social-democracia anarquismo
   ```
4. Gerar o inventário de relações:
   - relações por tipo e por leitura;
   - entidades órfãs;
   - pessoas sem obra ou papel;
   - eventos sem data ou participante;
   - conceitos sem definição;
   - fontes sem citação;
   - afirmações sem evidência;
   - relações com alvo ausente.
5. Criar o **gold set** inicial:
   - 100 relações estratificadas (25 por leitura), escolhidas por tipo e por dificuldade;
   - 40 afirmações de texto;
   - 20 pares fonte × afirmação;
   - cada item marcado por pessoa com `ok`, `inverte`, `não sustenta` ou `fonte errada`.
6. Definir a política de modelo em `scripts/tradicao/model-choice.json`: papéis, limites e critérios de parada.

**Porta de saída:** 100% dos aceitos com artigo local; inventário publicado em `generated/expansion/baseline/`; gold set versionado; nenhuma chamada paga.

### Onda 1 — Calibrar Sonnet e relações (paga, ~US$ 1 a 2)

**Objetivo:** saber se o Sonnet realmente melhora as relações antes de usá-lo em escala.

1. Estender `eval.mjs` com um braço **Sonnet 5.5 low** para relações, mantendo os braços Haiku.
2. Rodar a amostra em duas frentes:
   ```bash
   npm run tradicao:eval -- run --from social-democracia,anarquismo --sample 20 --dry-run
   npm run tradicao:eval -- run --from social-democracia,anarquismo --sample 20 --max-usd 0.50
   ```
3. Medir:
   - precisão e recall contra o gold set;
   - taxa de inversão de direção;
   - alvo sem QID;
   - citação que não nomeia o alvo;
   - tipo de relação errado;
   - custo por relação aceita.
4. Comparar três desenhos:
   - **A:** Haiku propõe, Sonnet verifica (atual).
   - **B:** Haiku propõe duas vezes, Sonnet desempata.
   - **C:** Sonnet propõe e verifica apenas nos casos difíceis (eventos, instituições, relações cruzadas).
5. Escolher o desenho com melhor precisão por dólar. Se o Sonnet não superar o Haiku na verificação, manter Haiku e investir o orçamento em mais cobertura.

**Porta de saída:** `model-choice.json` com medição Sonnet; precisão ≥ 95% na amostra; custo por relação aceita documentado; nenhuma aresta consolidada ainda.

### Onda 2 — Relações em escala (paga, ~US$ 2 a 4)

**Objetivo:** elevar as quatro leituras acima do piso e enriquecer o grafo com relações úteis, não decorativas.

**Metas por leitura:**

| Leitura | Documentadas atuais | Meta documentada | Tipos que faltam |
| ----------------- | --------------: | ----: | --------------------------------------------------------------------------- |
| Social-democracia |              34 | ≥ 70 | autoria, participação, fundação, filiação, crítica, cisão, governo, eleição |
| Anarquismo        |              10 | ≥ 50 | participação, autoria, fundação, crítica, ruptura, sindicato, experiência   |
| Marxismo          |              33 | ≥ 70 | obra/conceito, evento/participante, tradução, recepção brasileira           |
| Liberalismo       |              11 | ≥ 35 | obra/autor, evento/participante, constituição, crítica, continuidade        |

As metas foram recalibradas em 08/11/2026 para contar **relações documentadas**, não
`encyclopedic-link`, `editorial-link` ou `related_to`. A linha de base anterior (122/75/35/10)
incluía links de navegação; a régua documentada é 33/11/34/10. Ver
[`EXPANSAO-BASELINE-2026-11.md`](EXPANSAO-BASELINE-2026-11.md).

1. Rodar extração rica para Social-democracia e Anarquismo:
   ```bash
   npm run tradicao:extract -- social-democracia --dry-run
   npm run tradicao:extract -- social-democracia --max-usd 1
   npm run tradicao:extract -- anarquismo --dry-run
   npm run tradicao:extract -- anarquismo --max-usd 1
   ```
2. Criar uma fase **relations-only** em `extract.mjs` que reaproveita artigos e extratos já pagos:
   - lê o parágrafo;
   - propõe somente relações;
   - não regenera resumo, seções ou glossário;
   - passa pelo mesmo guarda e pela segunda passada.
3. Aplicar um plano por tipo:
   - **pessoa → obra:** autoria, coautoria, tradução, edição;
   - **pessoa → instituição:** fundação, filiação, direção, expulsão;
   - **pessoa → evento:** participação, liderança, prisão, exílio;
   - **ideologia → ideologia:** crítica, continuidade, divergência, cisão, influência documentada;
   - **ideologia → evento:** experiência histórica, governo, derrota, fundação;
   - **obra → conceito:** desenvolve, critica, sistematiza;
   - **lugar → evento:** sede, contexto, exílio.
4. Relações cruzadas entre as quatro tradições:
   - usar as conexões curadas de `ideologyReadings` como hipótese;
   - exigir fonte de cada lado;
   - Sonnet compara as duas leituras e propõe o tipo;
   - human aprova.
5. Deduplicar e consolidar:
   - mesma aresta com fontes diferentes vira uma aresta com várias fontes;
   - mesma aresta com tipos incompatíveis vai para a fila humana;
   - aresta sem QID não entra.
6. Consolidar em modo parcial para não tocar no que já está pronto:
   ```bash
   node scripts/content/wiki-drafts-to-collections.mjs --partial --only <id> --dry-run
   ```

**Porta de saída:** Social-democracia ≥ 70 e Anarquismo ≥ 50 relações documentadas; Marxismo ≥ 70 e Liberalismo ≥ 35; zero aresta sem QID; precisão ≥ 95% na amostra humana.

### Onda 3 — Entidades, fontes e caso brasileiro (paga, ~US$ 1 a 2)

**Objetivo:** preencher os buracos que impedem capítulos completos.

1. Extrair candidatos a entidade dos parágrafos que ainda não têm ficha:
   - obras citadas sem `work-*`;
   - eventos sem `event-*`;
   - instituições e partidos;
   - conceitos e lugares.
2. Reconciliar com Wikidata:
   - só aceitar QID com artigo e link;
   - nome sem QID vai para `generated/expansion/entity-queue.md`;
   - nunca criar entidade a partir de nome solto.
3. Priorizar o caso brasileiro:
   - Nabuco, Brizola, PDT, PTB, PCB, CLT, Constituição de 1988;
   - greve de 1917, Colônia Cecília, Comuna de Paris, Ucrânia de Makhno, Espanha de 1936;
   - trabalhismo, liberalismo social, social-democracia e anarquismo no Brasil.
4. Completar fontes:
   - autor, edição, volume, páginas, DOI, `oldid` e data de consulta;
   - substituir Wikipédia por estudo acadêmico ou fonte primária quando a afirmação for empírica;
   - manter a Wikipédia como descoberta, com rótulo explícito.
5. Deduplicar fontes compartilhadas entre leituras.

**Porta de saída:** Social-democracia e Anarquismo com ≥ 20 fontes citadas; Marxismo e Liberalismo com ≥ 35; nenhuma afirmação histórica sem fonte; nenhuma entidade sem QID.

### Onda 4 — Conteúdo e capítulos (paga, ~US$ 1 a 3)

**Objetivo:** transformar grafo em leitura, sem inventar prosa.

1. Gerar glossário e hovers a partir dos extratos ricos.
2. Para Social-democracia e Anarquismo, criar os blocos que faltam:
   - cronologia com datas e fontes;
   - debate com defesa, crítica, resposta e limites;
   - grafo de vertentes com arestas documentadas;
   - blocos de origens e conceitos.
3. Sonnet como editor:
   - lê o capítulo inteiro;
   - aponta repetição, lacuna, contradição e promessa não cumprida;
   - sugere pergunta, resposta e ponte;
   - devolve uma fila com trecho e justificativa, não texto final.
4. Haiku como rascunhador:
   - uma linha, resumo, seção e glossário com citação literal;
   - sem opinião e sem processo;
   - toda saída entra como `rascunho`/`assistant`.
5. Human revisa e aprova. Nenhum capítulo publicado sem revisão registrada.

**Porta de saída:** 10/12 capítulos com blocos, ≥ 6 completos, ≥ 7 tipos de bloco nas duas leituras; glossário/hover em ≥ 90%; nenhuma promessa de capítulo sem entrega.

### Onda 5 — Verificação e publicação (humana)

1. `npm run tradicao -- <slug> --stage 13 --full`.
2. `npm run tradicao:coverage -- <slug>`.
3. `npm test`, `npm run test:content`, `npm run lint`, `npm run typecheck`, `npm run build`, e2e.
4. Revisão humana do dossiê e do selo editorial.
5. `npm run content:publish` e atualização do ponteiro, só por pessoa.

---

## 5. Tipos de relação e regras

### Lista fechada inicial

- `author_of` / `coauthor_of`
- `founded` / `cofounded`
- `member_of` / `leader_of` / `expelled_from`
- `participated_in` / `led` / `imprisoned` / `exiled`
- `criticized` / `split_from` / `continued` / `influenced`
- `published` / `translated` / `edited`
- `experienced` / `governed` / `created`
- `develops` / `criticizes` / `systematizes`
- `associated_with` (catálogo, nunca influência)

### Regras de aceitação

1. Tipo na lista fechada.
2. Direção declarada (`entidade → alvo` ou `alvo → entidade`).
3. Citação literal de pelo menos 20 caracteres e 3 palavras.
4. Alvo nomeado na citação.
5. Verbo compatível com o tipo.
6. Alvo com QID existente no grafo.
7. Segunda passada Sonnet: `confirma`, `inverte` ou `nao-sustenta`. Silêncio é rejeição.
8. Deduplicação por `from + type + to`; fontes múltiplas na mesma aresta.
9. Nenhuma aresta de um nó para ele mesmo.
10. Nenhuma aresta baseada apenas em rótulo Wikidata.

### Relações que não entram

- “Influenciou” a partir de P737/P1142 sem texto.
- “Participou” porque o nome aparece na mesma página.
- “Criou” porque é citado como autor de uma ideia.
- “É a mesma pessoa” por semelhança de nome.
- “Descendência” sem fonte histórica.
- Qualquer relação cujo alvo não tenha QID.

---

## 6. Avaliação e gold set

### Métricas

| Métrica                               | Meta                            |
| ------------------------------------- | ------------------------------- |
| Precisão de relação na amostra humana | ≥ 95%                           |
| Recall contra o gold set              | ≥ 70%                           |
| Citação que não sustenta              | < 5%                            |
| Inversão de direção                   | < 2%                            |
| Alvo sem QID                          | 0                               |
| Aresta duplicada                      | < 1%                            |
| Afirmação sem fonte                   | < 5%                            |
| Fonte citada / fonte usada            | ≥ 90%                           |
| Capítulos com blocos                  | ≥ 10/12                         |
| Capítulos completos                   | ≥ 6/12                          |
| Tipos de bloco                        | ≥ 7                             |
| Custo por relação aceita              | registrar e reduzir a cada onda |

### Gold set

- 25 relações por leitura, escolhidas por tipo e dificuldade.
- 10 afirmações por leitura.
- 5 pares fonte × afirmação por leitura.
- Marcação humana: `ok`, `inverte`, `nao-sustenta`, `fonte-errada`.
- O gold set não é gerado por modelo. Ele é a régua.

### Comparação de modelos

- Haiku medium vs Sonnet low na verificação.
- Haiku medium vs Sonnet low na proposta de relações difíceis.
- Sonnet medium apenas nos casos em que low não decidir.
- Registrar custo, tempo e precisão por braço.
- Se o Sonnet não melhorar a precisão, não usar em escala.

---

## 7. Orçamento

Estimativas a confirmar com `--dry-run` e com o estado real:

| Onda      | Trabalho                                 |     Estimativa |
| --------- | ---------------------------------------- | -------------: |
| 0         | Captura, baseline, gold set              |          US$ 0 |
| 1         | Calibração Sonnet, 20 artigos            |      US$ 1 a 2 |
| 2         | Extração e relações das quatro leituras  |      US$ 2 a 4 |
| 3         | Entidades, fontes e caso brasileiro      |      US$ 1 a 2 |
| 4         | Glossário, capítulos e revisão editorial |      US$ 1 a 3 |
| **Total** |                                          | **US$ 5 a 11** |

O teto disponível é **US$ 10**. Se a onda 1 ou 2 chegar perto do teto, parar e reavaliar antes da onda 3. O custo real é a revisão humana, não a API.

---

## 8. Cronograma sugerido

### Semana 1 — Destravar

- Onda 0 completa.
- Captura dos 108 artigos faltantes.
- Inventário de relações.
- Gold set inicial.
- Nenhum custo de API.

### Semana 2 — Calibrar

- Onda 1.
- Medir Sonnet.
- Ajustar prompts e travas.
- Relatório de precisão e custo.
- Porta: só seguir se a precisão for ≥ 95%.

### Semana 3 — Relações

- Onda 2 para Social-democracia e Anarquismo.
- Consolidação parcial.
- Cobertura e revisão humana da amostra.
- Meta: as duas leituras acima do piso de relações.

### Semana 4 — Conteúdo

- Onda 3 e Onda 4.
- Fontes, entidades, glossário, cronologia, debate.
- Revisão editorial.
- Meta: 10/12 capítulos com blocos e 6 completos.

### Semana 5 — Fechar

- Verificação completa.
- Publicação humana.
- Relatório final de qualidade.
- Comparação antes/depois e lições.

---

## 9. Entregáveis

1. `docs/research/PLANO-EXPANSAO-HAIKU-SONNET-2026-11.md` (este documento).
2. `generated/expansion/baseline/` com inventário, lacunas e linha de base.
3. `scripts/tradicao/gold-relations.json` ou `generated/expansion/gold/` com o gold set.
4. `scripts/tradicao/model-choice.json` atualizado com a medição Sonnet.
5. `generated/expansion/<onda>/report.json` e `review-queue.md`.
6. Relatórios de cobertura por leitura.
7. Dossiês revisados e, se aprovado, release publicado.

---

## 10. Riscos e mitigação

| Risco                          | Mitigação                                                    |
| ------------------------------ | ------------------------------------------------------------ |
| Relação inventada              | citação + QID + segunda passada + amostra humana             |
| Inversão de direção            | verbo e voz passiva no guarda; Sonnet confirma               |
| Duplicação de arestas          | chave `from + type + to`; fontes múltiplas                   |
| Custo fora de controle         | `--dry-run`, `--max-usd`, `--max-total-usd`, lote e cache    |
| Wikipedia 429                  | pausa, cache local, captura em lotes pequenos                |
| Excesso de entidades genéricas | lista curta humana; tipo e QID obrigatórios                  |
| Prosa de processo              | guia de voz; Sonnet revisa; humano aprova                    |
| Fonte fraca                    | marcar `partial`, substituir por acadêmica, registrar lacuna |
| Sonnet não medido              | onda 1 antes de qualquer escala                              |
| Publicação acidental           | estágio 14 sempre humano                                     |

---

## 11. Primeiras dez ações

1. Rodar `npm run tradicao -- social-democracia --stage 3` e `npm run tradicao -- anarquismo --stage 3`.
2. Rodar `npm run tradicao:coverage -- marxismo liberalismo social-democracia anarquismo` e salvar a linha de base.
3. Gerar o inventário de relações e entidades órfãs.
4. Criar o gold set de 100 relações.
5. Estender `eval.mjs` com o braço Sonnet low para relações.
6. Rodar `npm run tradicao:eval -- run --from social-democracia,anarquismo --sample 20 --dry-run`.
7. Aprovar e rodar a amostra paga com `--max-usd 0.50`.
8. Medir precisão, recall e custo por relação.
9. Rodar `npm run tradicao:extract -- social-democracia --dry-run` e `--max-usd 1`.
10. Consolidar em modo parcial e revisar a amostra antes de repetir para Anarquismo.

---

## 12. Critério de conclusão

A expansão não termina quando o modelo aceita mais relações. Termina quando:

- as quatro leituras atingem o piso de cobertura;
- a precisão humana da amostra fica ≥ 95%;
- não há relação sem citação, QID e fonte;
- Social-democracia e Anarquismo têm cronologia, debate e capítulos completos;
- o visitante consegue conferir cada afirmação e voltar ao texto;
- a publicação foi aprovada por pessoa e o ponteiro público aponta para o release revisado.

Enquanto isso não acontecer, o trabalho é expansão em rascunho, não publicação.
