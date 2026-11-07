---
name: atlas-pipeline-tradicao
description: Orquestra o pipeline de uma tradição do ATLAS (registro, descoberta por expansão e pontuação no Wikidata, captura, avaliação de modelo, extração rica com travas, consolidação no grafo, glossário e hovers, 12 capítulos, imagens, verificação) em estágios 0 a 14, cada um com contrato, porta de saída e estado retomável. Usar ao criar, ampliar ou retomar a leitura de uma ideologia ou tradição de ponta a ponta, ou ao medir quanto falta para ela chegar ao piso das leituras de referência.
---

# Pipeline de tradições

Este skill é o maestro. Cada estágio tem um skill ou script que faz o trabalho; aqui ficam a **ordem**, as **portas** e os **comandos**. O mapa completo, com o que funciona e o que está quebrado, é `docs/architecture/FLUXO-DE-POPULACAO.md`. Não duplique as regras dos skills:

- Descoberta e Wikimedia: `atlas-wiki-discovery`. Extração de texto: `atlas-wiki-extracao`.
- Capítulos e blocos: `atlas-create-ideology` (e `references/chapter-blocks.md`).
- Leituras de pessoa, acontecimento, instituição, período ou conceito: `atlas-create-reading`; decide se o assunto merece leitura, adapta os capítulos e exige caso brasileiro e até cinco conexões.
- Identidade visual: `atlas-editorial-geometrico`.

O objetivo é **acertar de primeira**: o gargalo é a revisão humana, então cada porta barra o retrabalho antes dela.

## Princípios do plano

1. **Um grafo só.** Tradições são lentes (etiqueta e cor da paleta), não coleções separadas. Entidade reconciliada por QID; o mesmo QID em pt e en é uma entidade com duas fontes.
2. **Sem sementes escolhidas por pessoa.** `tradicao:discover` parte da raiz Wikidata do registro e expande por anéis de 1 a 3 saltos, com teto por anel. Lugar e conceito entram, mas não abrem o anel seguinte.
3. **Pontuação de importância** (`scoring.mjs`): global primeiro (idiomas, nós já aceitos que citam, posição do link); bônus regional por regra (Brasil, América Latina, Guerra Fria). Acima do limite alto aceita; faixa do meio vira lista curta (≤ 30) para a pessoa decidir; abaixo, descarta. Famoso sem sinal de relevância vai para a lista curta. Tipo fora do escopo (catálogos, registros de autoridade), listas, desambiguações e anos nunca entram.
4. **Modelo barato com travas de código** (`guards.mjs`): citação literal ou o item some; relação com tipo de lista fechada, direção e alvo nomeado no próprio trecho; uma segunda passada confere cada relação contra o parágrafo.
5. **Aresta só por relação histórica documentada.** Rótulo do Wikidata (P737, P1142) vira associação, nunca influência. Menção não é relação.
6. **Modelo fixado por medição** (`tradicao:eval`): Haiku fica se o erro restante depois das travas ficar abaixo de 5%; se não, só a etapa de relações sobe.
7. **Visual:** ícone por tipo, cor por tradição; imagem do Commons só com licença conferida por arquivo e miniatura remota; sem licença clara, só ícone. Nunca copiar dados do 12axes (direitos reservados): só o método.

## Comandos

```bash
npm run tradicao -- <slug> --status                    # onde cada porta está, sem executar nada
npm run tradicao -- <slug> --stage N --dry-run         # plano do estágio: comandos, custo estimado, porta atual
npm run tradicao -- <slug> --stage N                   # executa o estágio e grava o estado
npm run tradicao -- <slug> --all [--from N] [--to M]   # percorre até a primeira porta aberta
npm run tradicao:coverage -- <slug>...                 # régua de cobertura contra o piso
npm run tradicao:discover -- <slug> [--max-ring N]     # expansão a partir do Wikidata (grátis)
npm run tradicao:extract -- <slug> --dry-run           # custo em dólar antes de rodar
npm run tradicao:extract -- <slug> --max-usd 1         # extração em lote, com teto
npm run tradicao:images -- <slug>                      # licença por arquivo (grátis)
npm run tradicao:eval -- run --from a,b --sample 20 --dry-run
```

Flags do pipeline: `--force` refaz mesmo com entradas iguais e ignora a porta anterior; `--full` inclui lint, typecheck e testes no estágio 13; `--json` para máquina. Código de saída: 0 passou, 1 falhou, 2 bloqueado pela porta anterior. `tradicao:extract` e `tradicao:eval` saem com 3 quando o teto aborta.

**Estado** em `generated/pipeline/<slug>/STATE.json` (ignorado pelo Git), fonte única: hash por estágio, passadas por entidade, lotes abertos e razão de gasto. Rodar de novo nunca refaz o que está pronto e nunca paga duas vezes pela mesma resposta.

**README de retomada** em `generated/pipeline/<slug>/README.md`: reescrito a cada execução com o próximo estágio, a tabela de portas e os comandos exatos. Uma sessão nova começa por ele, sem depender desta conversa.

O orquestrador **nunca** executa `content:publish`, `publish-drafts`, `ingest:publish-raw` nem `git push`. Publicar é decisão humana (estágio 14).

## Estágios, contratos e portas

| N | Estágio | Faz | Porta de saída (resumo) |
|---|---|---|---|
| 0 | Régua | mede entidades por tipo, relações, fontes, capítulos, blocos e imagens; piso em `coverage-floor.json` | piso definido e cumprido por /marxismo e /liberalismo |
| 1 | Registro | `content/traditions/<slug>.json` é a única entrada humana | registro válido, descoberta conhece o QID, paleta existe no mosaico |
| 2 | Descoberta | expansão por anéis a partir da raiz Wikidata, com pontuação e faixas | ≥ 8 aceitos, sem genérico, sem duplicata no mesmo idioma, teto por anel, faixa do meio curta |
| 3 | Captura | `wiki-extract fetch --candidates`; manifesto por captura | todo aceito com artigo local; manifestos válidos com SHA-256 |
| 4 | Avaliação | `tradicao:eval`, pago e aprovado por pessoa: Haiku 5.5 low e medium na mesma amostra, conferência humana | `scripts/tradicao/model-choice.json` válido, extração com modelo fixado |
| 5 | Extração rica | `tradicao:extract`: linha, resumo, seções, glossário, relações, com citação literal, travas e segunda passada | conteúdo rico completo, 0 citação rejeitada na reverificação, toda relação confirmada |
| 6 | Consolidação | `wiki-drafts-to-collections.mjs`, agora com arestas | todo aceito é entidade (ou unido por QID), grafo válido, ≥ 1 relação tipada |
| 7 | Glossário e hovers | índice de termos pt/en e linha e resumo por entidade | hover em ≥ 90% das entidades, termo ambíguo não é ligado sozinho |
| 8 | Redação | agente preenche os 12 capítulos | dossiê válido, ≤ 1 capítulo pendente (com motivo), capítulos com blocos no piso |
| 9 | Edição | agente revisa tom, pergunta e ponte; aprofunda "Situar" e "Avaliar" com fontes acadêmicas e caso brasileiro | sem texto de reserva, pergunta e ponte presentes, caso brasileiro atribuído |
| 10 | Identidade | paleta, acento, assinatura, ícone por tipo | paleta declarada e igual à do registro |
| 11 | Imagens | `tradicao:images`: licença **por arquivo**, miniatura remota, cada imagem uma vez, ícone sem licença | toda imagem com autor, licença, atribuição, página do arquivo; piso de imagens |
| 12 | Montagem | registro nos seis pontos da aplicação | publicada: registrada; rascunho: **ainda não** registrada |
| 13 | Verificação | `content:build` (+ `--full`: testes, lint, typecheck) | dossiê válido e **piso de cobertura atingido** |
| 14 | Publicação | só humano | revisão `revisado` com pessoa e data; depois, `content:publish` por pessoa |

Os seis pontos do estágio 12 estão em `registrationPoints` (`scripts/tradicao/stages.mjs`): `published-ideologies.ts`, `ideology-readings.ts`, `public-readings.ts`, `declaredDestinations` do e2e, e2e do explorador e o mapa do verbete.

## Método do 12axes (só o método)

- Progresso numa fonte única (`STATE.json`), por estágio e por entidade.
- README autossuficiente para retomar em sessão nova (gerado).
- Orientação por tipo de entidade: dica por tipo na mensagem do pedido (`typeHints` em `prompts.mjs`), sem quebrar o cache do prompt fixo.
- Saída temporária e validação **antes** do merge: a extração grava em `generated/`; só a consolidação (estágio 6) toca `content/`.
- Relatórios de cobertura (`tradicao:coverage`) e catálogos processados **um tipo por vez**.

## Fluxo

1. Peça ou escreva `content/traditions/<slug>.json` (slug, tipo, QID raiz, títulos pt/en, paleta, ícone, recorte). **Não invente QID**: confira no Wikidata.
2. Leia `generated/pipeline/<slug>/README.md` se existir; senão, `--status`. Antes de um estágio de rede ou API, `--stage N --dry-run`.
3. Estágio 2: aceite automático só pela pontuação; a lista do meio é para pessoa decidir e fica com `decidedBy: "editor"`, que sobrevive a nova descoberta.
4. **Nada pago sem aprovação do usuário:** mostre o comando e a estimativa do `--dry-run`. A conta tem US$ 10; `--max-total-usd` soma todo `STATE.json` deste checkout.
5. Estágios 8 e 9 são de agente: leia o brief que `--dry-run` imprime e siga o `atlas-create-ideology`. Capítulo sem evidência fica `pending` com `gap`. Para assunto que não é tradição, use `atlas-create-reading`.
6. Pare na primeira porta aberta e relate: o que fechou, o que falta, custo estimado e medido, e o que precisa de pessoa.

## Regras que não se negociam

- Nada de fonte, data, citação, imagem ou revisão humana inventada. Revisão de IA é `assistant`.
- Imagem só com licença verificada por arquivo; cada imagem uma vez na narrativa.
- Wikipedia é CC BY-SA 4.0: guarde URL e revisão; texto integral fica em `generated/`.
- Dados do repositório 12axes têm direitos reservados: só a ideia e o método, nunca os arquivos.
- Rótulo do Wikidata (P1142, P737) é rótulo, não influência. Relação exige fonte e natureza.
- Uma tradição não vira pública sem aprovação humana explícita; o estágio 14 nunca é automático.

## Custo

Haiku 5.5: US$ 0,10 por MTok de entrada e US$ 0,50 de saída até 100 mil tokens por pedido; lote 50%; leitura de cache 0,1×, escrita de 1 hora 2×. O pensamento conta em `max_tokens` e é cobrado como saída. `--dry-run` imprime o esperado e o pior caso; o teto compara o pior caso, que é o máximo que a API pode cobrar por aqueles pedidos. Saída esperada é hipótese até a primeira medição. O custo real é a revisão humana, não a API.

## Lacunas conhecidas

Ver a seção "Quebrado ou manual" de `docs/architecture/FLUXO-DE-POPULACAO.md`.
