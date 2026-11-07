# Mapa de leituras contínuas

Plano editorial, não conteúdo publicado. As leituras abaixo só entram no app depois de fontes verificadas, capítulos preenchidos e aprovação humana. O mapa serve para decidir **o que merece leitura**, **como os assuntos se conectam** e **qual fonte falta**.

## Critério

Uma leitura contínua existe para dar contexto, não para substituir o verbete. O teste está em `atlas-create-reading/references/selection.md`:

1. o assunto atravessa mais de um período ou instituição;
2. há interpretações acadêmicas em disputa;
3. três a cinco conexões mudam a compreensão;
4. há fontes para "Situar" e "Avaliar";
5. há caso brasileiro documentado;
6. o verbete não responde à pergunta central.

## Regra dos cinco nós

Cada leitura publicada declara **3 a 5 conexões** em `ideologyReadings[].connections`, com uma razão. O limite não é técnico: é editorial. Uma leitura que precisa de dez conexões provavelmente é duas leituras.

## Cluster: Vargas, trabalhismo e 1964

Este cluster é o exemplo mais claro do projeto: os assuntos se explicam mutuamente. O grafo já tem entidades para começar, mas ainda não há leitura publicada.

### 1. Governo Vargas / Era Vargas

- **Tipo:** período ou governo (decidir o recorte antes de escrever).
- **Pergunta:** como o Estado brasileiro se reorganizou entre 1930 e 1945, e o que mudou no segundo governo (1951–1954)?
- **Situar:** Revolução de 1930, Governo Provisório, Constituição de 1934, Estado Novo, industrialização, legislação trabalhista, redemocratização de 1945, retorno em 1951, crise de 1954.
- **Avaliar:** tutela ou concessão de direitos; trabalhismo como cultura política; relação entre Estado, sindicatos e empresariado; interpretações sobre o populismo.
- **Caso brasileiro:** é o próprio caso; a leitura precisa evitar "era" como bloco homogêneo.
- **Entidades existentes:** `wiki-topic-getulio-vargas`, `wiki-topic-revolucao-de-1930`, `wiki-topic-ditadura-militar-brasileira` (não confundir), `wiki-topic-partido-trabalhista-brasileiro-1979`, `wiki-topic-leonel-brizola`, `wiki-topic-ditadura-militar-brasileira`.
- **Fontes a verificar:** CPDOC/FGV, _A Era Vargas (1930–1945)_ (org. Vannucchi e Abreu); Angela de Castro Gomes, _A invenção do trabalhismo_; Maria Celina D'Araújo, _O segundo governo Vargas_.
- **Lacunas de dados:** não há entidade própria para Estado Novo, CLT ou PTB de 1945 neste recorte; decidir se entram por ingestão ou se a leitura usa os registros existentes.

### 2. Trabalhismo

- **Tipo:** ideologia/tradição ou conceito (a classificação é uma tese, não um rótulo automático).
- **Pergunta:** o que é o trabalhismo, como ele nasce com Vargas e como se transforma no PTB e no PDT?
- **Situar:** legislação social dos anos 1930, PTB (1945), trabalhismo reformista, João Goulart, Brizola, "novo trabalhismo", PDT (1979/1980).
- **Avaliar:** direitos sociais e tutela; cidadania regulada; populismo como categoria disputada; continuidade e reinvenção.
- **Conexões:** Governo Vargas, Golpe de 1964, Social-democracia, Leonel Brizola.
- **Fontes a verificar:** Angela de Castro Gomes, _A invenção do trabalhismo_ e "Brizola e o trabalhismo"; Gomes e D'Araújo, _Getulismo e trabalhismo_; estudos sobre o PDT.
- **Cuidado:** não tratar trabalhismo como sinônimo de social-democracia. A leitura deve explicar a diferença e a disputa historiográfica.

### 3. Golpe de 1964

- **Tipo:** acontecimento.
- **Pergunta:** por que o governo João Goulart foi interrompido por um golpe em 1964, e quais interpretações disputam as causas?
- **Situar:** crise política dos anos 1960, reformas de base, mobilização social, conspiração militar e civil, ruptura institucional.
- **Avaliar:** causalidade, responsabilidade, memória, teses sobre o golpe; distinguir 1964 de 1930 e de 1945.
- **Conexões:** Ditadura militar, Governo João Goulart, Trabalhismo, Redemocratização.
- **Fontes a verificar:** Carlos Fico, "Versões e controvérsias sobre 1964 e a ditadura militar"; Daniel Aarão Reis, _Ditadura e democracia no Brasil_; bibliografia do CPDOC.
- **Entidades existentes:** `wiki-topic-golpe-de-estado-no-brasil-em-1964`, `wiki-topic-ditadura-militar-brasileira`, `wiki-topic-redemocratizacao-do-brasil`.

### 4. Ditadura militar

- **Tipo:** instituição/período.
- **Pergunta:** como o regime militar funcionou entre 1964 e 1985, e por que sua queda produziu a Constituição de 1988?
- **Situar:** governos militares, atos institucionais, repressão, milagre econômico, sociedade civil, abertura, Diretas Já, Constituinte.
- **Avaliar:** periodização, graus de coerção, apoio civil, resistência, transição negociada.
- **Conexões:** Golpe de 1964, Redemocratização, Marxismo (esquerda e PCB), Trabalhismo.
- **Fontes a verificar:** Daniel Aarão Reis, _Ditadura e democracia no Brasil_; Carlos Fico; _A ditadura que mudou o Brasil_ (org. Reis, Ridenti e Motta).
- **Cuidado:** não tratar "militares" como ator homogêneo nem reduzir o regime à repressão.

### 5. Leonel Brizola / PDT

- **Tipo:** pessoa ou instituição (decidir; uma leitura de Brizola pode ser pessoa, o PDT pode ser instituição).
- **Pergunta:** como Brizola reelabora o trabalhismo e o que o PDT representa na redemocratização?
- **Situar:** trajetória, governo do Rio Grande do Sul, exílio, PDT, "novo trabalhismo", governos estaduais.
- **Avaliar:** continuidade e ruptura com Vargas; trabalhismo e social-democracia; legado democrático e limites.
- **Conexões:** Trabalhismo, Governo Vargas, Social-democracia, Redemocratização.
- **Fontes a verificar:** Angela de Castro Gomes, "Brizola e o trabalhismo"; estudos sobre o PDT; CPDOC/FGV.
- **Cuidado:** não transformar a leitura em biografia laudatória; decisões e críticas precisam de fonte.

## Ordem sugerida

1. **Trabalhismo** — conecta o cluster e já tem base historiográfica consolidada.
2. **Governo Vargas** — sustenta o período e evita começar pelo evento traumático.
3. **Golpe de 1964** — acontecimento com bibliografia acessível.
4. **Ditadura militar** — exige mais fontes e periodização; pode vir depois.
5. **Leonel Brizola / PDT** — depende do trabalhismo e da redemocratização.

## O que falta para cada uma

- reconciliar entidades no grafo (evitar duplicar QID);
- decidir o tipo e o recorte;
- levantar 2–4 fontes acadêmicas por capítulo;
- escrever "Situar" e "Avaliar" antes de publicar;
- declarar 3–5 conexões com razão;
- revisão humana registrada.

## Leituras já publicadas

- `/marxismo`
- `/liberalismo`
- `/social-democracia` (publicada com revisão `rascunho`)
- `/anarquismo` (publicada com revisão `rascunho`)

As duas primeiras têm lacunas em "Situar" e "Avaliar"; as duas últimas ainda são rascunho e não devem ser promovidas sem revisão humana.

## Esqueletos automáticos não são leituras

O gerador criou dezenas de `page.json` com 12 capítulos `pending` e narrativa de reserva (por exemplo, `trabalhismo`, com 131 palavras). Eles não contam como leitura publicada e não devem entrar em rotas, prerender ou `ideologyReadings` antes de pesquisa e revisão. O `trabalhismo` é o próximo candidato natural do cluster, mas ainda precisa de fontes, capítulos preenchidos e revisão.
