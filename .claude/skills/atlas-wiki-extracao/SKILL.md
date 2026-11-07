---
name: atlas-wiki-extracao
description: Extrair rascunhos sourced de artigos da Wikipedia (pt e en) por lote, da descoberta à publicação no bucket privado atlas-drafts, com citações literais verificadas e revisão de IA marcada. Usar ao popular ou ampliar uma tradição com conteúdo da Wikipedia.
---

# Extração de artigos da Wikipedia por lote

Esta skill cobre o texto: descobrir artigos, lê-los e gravar rascunhos com citação. Dados estruturados (Wikidata, Commons) ficam em `atlas-wiki-discovery`. Página nova de ideologia fica em `atlas-create-ideology`.

## Limites (não negociáveis)

- Rascunho tem revisão `assistant` (IA) e status `draft`. Nunca escreva "revisado" nem "validado por humano".
- Nada vai para o bucket público (`atlas-public`), para o build nem para as rotas sem aprovação humana explícita. Publicação aqui é só no `atlas-drafts`.
- Toda afirmação, data e relação tem `quote`: trecho literal do artigo. `store` descarta o que não bate; corrija até zero rejeitadas.
- Relação só entra com fonte e natureza declarada. Menção (link no corpo do artigo) não é relação.
- Rótulos do Wikidata (P1142, P737) são rótulos, não influência.
- Texto da Wikipedia é CC BY-SA 4.0: o rascunho guarda URL e revisão. Não copie texto integral para o repositório: os textos exportados ficam em `generated/` (ignorado pelo Git).
- Não aceite automaticamente catálogos e registros de autoridade (bibliotecas nacionais, CiNii, ISNI, Open Library). Eles lideram o ranking por aparecerem em modelos de quase todo artigo.
- Não use o 12axes como fonte nem copie seus arquivos. A referência é só de processo.

## Fluxo por lote

Execute na worktree do projeto. Comandos entre crases.

1. **Sementes.** Edite `scripts/ingestion/wiki-extract/seeds/<tradição>.json` com URLs pt e en de artigos centrais. Tópicos são aceitos sem regra.
2. **Descoberta.** `node scripts/wiki-extract.mjs discover <tradição> --accept-top 0 --min-shared 2`. Grava `scripts/ingestion/wiki-extract/candidates/<tradição>.json` e uma captura em `raw/`.
3. **Escolher o lote.** Marque 6 a 10 candidatos com `decision: "accept"` e `decidedBy` com o nome do revisor. Prefira pessoas, partidos, ideologias, conceitos, acontecimentos e obras, com pelo menos 2 menções.
4. **Buscar.** `node scripts/wiki-extract.mjs fetch <tradição> --candidates`. Grava artigos em `generated/wiki-extract/<tradição>/articles/`.
5. **Texto.** `node scripts/wiki-extract.mjs text <tradição>` (sem rede). Abra cada `text/<id>.txt`. O cabeçalho diz quais seções foram lidas e quais ficaram de fora: registre essa cobertura.
6. **Extrair.** Escreva `generated/wiki-extract/<tradição>/manual/<id>.json` com o esquema de `scripts/ingestion/wiki-extract/extraction.mjs`:
   - `summary`: até 600 caracteres, neutro, em pt-BR.
   - `dates`: `date` (AAAA, AAAA-MM ou AAAA-MM-DD), `event`, `quote`.
   - `relations`: `target`, `relation` (natureza, em pt-BR), `quote`.
   - `claims`: `statement`, `kind` (`fact`, `interpretation` ou `controversy`), `quote`.
   - Até 12 itens por lista. Prefira poucos itens bem sustentados.
   - Nomes e citações ficam no idioma do artigo.
   - Divergência entre artigos vira `controversy`, sem escolher uma versão.
   - Com chave de API, use o extrator rico: `npm run tradicao:extract -- <tradição> --dry-run` para ver o custo e, com aprovação do usuário, `--max-usd N`. Ele aplica as travas de `scripts/tradicao/guards.mjs` e a segunda passada; não há `wiki-extract extract`.
7. **Consolidar.** Para a tradição inteira, `node scripts/content/wiki-drafts-to-collections.mjs`. Para um verbete isolado, `node scripts/content/wiki-drafts-to-collections.mjs --partial --only <id>` (primeiro `--dry-run`): preserva as coleções e registros existentes, funde pelo QID, anexa QID por título quando falta e não publica.
8. **Validar.** `node scripts/wiki-extract.mjs store <tradição>`. O comando informa quantas citações foram rejeitadas por item. Corrija até zero.
9. **Publicar rascunhos.** `node scripts/wiki-extract.mjs publish-drafts <tradição>`. Usa as credenciais `R2_DRAFTS_*` de `~/.atlas/r2.env`. Repetir o comando não duplica objetos (são imutáveis por hash).
10. **Ampliar.** Após o fetch, uma nova `discover` lista menções tipadas dos artigos já lidos (`origin: "mention"`). Eles são o próximo lote, a partir de nova decisão.

## Profundidade das relações

- Relações em cadeia (ex.: Marxismo → Leninismo → Stalinismo → Juche → Kim Il Sung) são expandidas até **5 saltos** a partir de cada tradição. Nó além do 5º não é expandido.
- No máximo 20 nós por salto, escolhidos pelo número de wikis (sitelinks). Sem esse teto a expansão cresce sem controle.
- A expansão por anéis de 1 a 3 saltos, com teto por anel, é `npm run tradicao:discover`. O `discover` daqui só faz menções de um salto a partir de sementes.

## Temas

Cada tema (anarquismo, social-democracia, marxismo, liberalismo, outras ideologias) tem sementes, status e decisões pendentes em [references/temas.md](references/temas.md). Atualize esse arquivo a cada lote.

## Critério de saída do lote

- Rascunhos gravados com 0 citações rejeitadas.
- Cobertura de cada artigo registrada (seções lidas e não lidas).
- `publish-drafts` concluído e índice `wiki/<tradição>/index.json` no bucket privado.
- Relatório com: o que foi publicado, o que ficou de fora, lacunas de cobertura e decisões pendentes (ex.: regra de catálogos, relações entre tradições).

## Custo de contexto

Cada artigo longo passa de 40 mil caracteres. Um lote de 7 a 8 artigos consome muito contexto. Faça um lote por sessão e pare ao concluir o critério de saída.
