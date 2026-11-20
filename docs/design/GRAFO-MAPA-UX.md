Status: atual
Última verificação: 20/11/2026

# Grafo e mapa: avaliação de UI/UX

Auditoria de `/grafos` (`shared/ui/knowledge-network`) e `/mapa` (`features/world-map`) em 375, 768 e 1024/1366 px, no registro **mesa** da skill `atlas-editorial-geometrico`. Testados: seleção de nó e de território, caminho entre nós (`?de=`/`?para=`), filtros e legenda, "Ver como lista", "Surpreenda-me", linha do tempo e mesa de estudo.

## O que estava quebrado ou atrapalhava

| Onde                     | Problema observado                                                                                                        | Causa                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Grafo, 992–1439 px       | Com legenda (19rem) e detalhe (23rem) abertos, sobravam ~290 px de mapa a 1024 px; o nó escolhido ficava atrás do painel. | Os dois painéis abriam juntos em qualquer largura "wide".                                                    |
| Grafo, celular e 1024 px | Nó selecionado e rótulos vizinhos sob o cabeçalho.                                                                        | O recuo superior era fixo (84/92 px), mas o cabeçalho quebra em duas ou três linhas (até ~200 px).           |
| Grafo, abertura          | Mapa de 1.318 pontos sem indicação de por onde começar; o lado direito ficava vazio.                                      | Painel de detalhe só existia com seleção.                                                                    |
| Grafo, caminho           | Depois de definir origem e destino, o resumo do caminho ficava fora da vista, abaixo de "Tipos de nó".                    | Ordem fixa dos painéis da legenda.                                                                           |
| Grafo, celular           | A folha de detalhe abria com a imagem (170 px) e o nome ficava abaixo da dobra.                                           | Ordem do cartão pensada para desktop.                                                                        |
| Mapa, 992–1179 px        | Coluna de 19rem vazia à esquerda e linha do tempo espremida (anos dos marcos sobrepostos, recortes em duas linhas).       | A grade reservava a coluna da legenda mesmo com a legenda fechada (ela só abre sozinha a partir de 1180 px). |
| Mapa, celular            | Território escolhido escondido sob a mesa de estudo.                                                                      | O cálculo da área livre do globo ignorava a folha da mesa abaixo de 992 px.                                  |
| Mesa de estudo           | "0 regimes" no topo; leituras e itinerários no fim da ficha, depois de dezenas de registros.                              | Contagens sem filtro de zero; ordem das seções.                                                              |
| Mesa de estudo           | Leituras quase nunca apareciam.                                                                                           | O mapa não passava o acervo do território a `readingsForEntity`, ao contrário do grafo.                      |

A causa do grafo "não rodar" (BOM no meio do SCSS) já tinha sido corrigida em `af1ccc5`. No mapa não houve erro de execução; o que parecia defeito era a perda de área útil descrita acima.

## Manter

- **Linguagem de mesa:** papel, cartões com fio de 2 px e sombra de tinta, chips retangulares. Funciona e se distingue de dashboard.
- **Codificação dupla dos nós:** forma + cor por tipo, em tons escuros com contraste ≥3:1 sobre o papel; famílias de relação por cor + traço + seta.
- **Leitura progressiva:** à distância, só linhas neutras e poucos nomes; de perto, cor, traço e frase de cada ligação. Hover acende vizinhos com o verbo da relação.
- **Teclado completo** (setas entre vizinhos, `[`/`]`, `/`, `O`, `L`, `?`), lista de atalhos, nós como botões com nome acessível, movimento reduzido respeitado.
- **Caminho entre verbetes** com variantes, passos clicáveis e link compartilhável (`?de=`/`?para=`), e seleção compartilhável (`?no=`).
- **Detalhe do verbete:** definição curta, resumo recolhido, conexões agrupadas por peso com razão, natureza e fonte; "Ver no mapa" quando há geografia.
- **Mapa:** globo com marcadores e rótulos sem colisão, recortes históricos, régua de densidade por década, marcos com anterior/próximo, aviso de divisas contemporâneas, "Ver como lista" com abas, filtro e ordenação, atribuição da base cartográfica.
- **Mesa de estudo:** imagem licenciada com atribuição, regimes com classificação atribuída e limites, registros agrupados por tipo, referência geográfica recolhida.

## Melhorar (feito nesta rodada)

1. **Um painel lateral por vez abaixo de 90rem (grafo).** Com um verbete selecionado, a legenda fica recolhida e o detalhe ocupa o lado direito (o cartão inicial convive com a legenda, que segue aberta por padrão no desktop); o caminho reabre a legenda porque é lá que ele se lê. Escolha explícita do leitor (`L` ou botão) continua valendo. A coluna da legenda só é reservada quando ela está aberta.
2. **Recuo do cabeçalho medido** (`barBottom`, via `ResizeObserver`): a seleção e o enquadramento respeitam a altura real do cabeçalho em qualquer largura.
3. **Cartão "Por onde começar"** (`network-start`, componente próprio para não pesar no orçamento de estilo do grafo): uma frase sobre o que a forma e a cor codificam, sete portas mistas entre referências internacionais e brasileiras (Karl Marx, Adam Smith, Revolução Francesa, Getúlio Vargas, Guerra Fria, Simón Bolívar, Mahatma Gandhi) e um caminho pronto (Revolução Francesa → Getúlio Vargas). No celular vira uma faixa de botões deslizável. Some ao escolher um verbete ou traçar caminho; pode ser fechado, e o mapa se reenquadra na área liberada. Se um recorte esconder as portas, cai para os verbetes mais ligados do recorte.
4. **Caminho visível:** ao completar origem e destino, o painel de legenda rola até "Caminho".
5. **Celular, grafo e mapa:** nome, resumo e ações antes da imagem na folha de detalhe; o território escolhido fica acima da folha da mesa.
6. **Mapa, 992–1179 px:** com a legenda fechada, a linha do tempo ocupa a largura toda. A régua usa container query: abaixo de 38rem de largura, os anos dos marcos saem (o ano aparece na barra do marco) e os recortes rolam numa linha.
7. **Mesa de estudo:** contagens só do que existe (com singular/plural); "Leituras e itinerários" logo depois das ações, como selos de papel `cal` (objetos citáveis, a única peça em selo da mesa); leituras passam a considerar o acervo do território, como no grafo. No grafo, "Dossiê:" virou "Leitura:".

## Segunda rodada: mapa primeiro (20/11)

Pedido: entender o uso, ler o contexto do que está selecionado e cuidar do celular sem que globo e painéis ocupem a tela inteira ao mesmo tempo. Conferido em 375, 768 e 1366 px.

| Problema observado                                                                                                     | Mudança                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nada dizia o que são pontos, arcos, linha do tempo e lista; o lado direito ficava vazio ao abrir.                      | Guia **"Como ler o mapa"** (`components/map-start`) no lugar da mesa enquanto nada está selecionado: o que cada elemento e controle faz, sete territórios para começar (Brasil, Argentina, Estados Unidos, França, União Soviética, Índia, África do Sul) e os quatro períodos com a nota de cada um. Pode ser fechado; escolher um período também o fecha. O botão "Legenda" virou "Legenda e camadas". |
| Ao escolher um marco da linha do tempo, a mesa abria a ficha do território e o marco aparecia só numa linha de rodapé. | Bloco **"Marco na linha do tempo"** no topo da mesa: período, título com link para o verbete, primeira frase do registro e a ligação com o território ("Ocorreu em Brasil"). A linha do recorte ficou num parágrafo curto com singular/plural.                                                                                                                                                           |
| No celular a mesa cobria 62% da tela e o globo ficava espremido sem forma de alternar.                                 | **Folha inferior** com dois estados: curta (42%, nome, resumo e ações) com o território visível acima, e erguida ("Ler a ficha inteira" / "Voltar ao globo", com alça). Uma nova seleção volta ao estado curto. No guia inicial, territórios e períodos vêm antes do glossário.                                                                                                                          |
| Caracteres como ícone (× − + ⤢ ‹ › → ↗) em grafo, mapa e mesa, inclusive no `content:` dos marcadores.                 | `app-icon` (Lucide) nos botões e links; marcadores de `details` com a máscara `--icon-mask-chevron-down`, girando ao abrir. Nas listas de atalhos, setas viraram "Setas" e o menos é o hífen da tecla.                                                                                                                                                                                                   |

Terceira rodada (20/11): o marco volta pela URL (`entidade` + período `anoDe`/`anoAte` ou `ano`, quando o período é de um ano só) e abre o bloco do marco; no celular, o bloco tem setas anterior e próximo, então a régua não é necessária com a folha erguida ou recolhida.

Fica para depois: decidir a paleta das famílias (vermelho e verdes ainda dominantes) e revisar os dois "Brasil" nos dados, que são de conteúdo.

## Melhorar (próximas etapas)

- **Cores das famílias:** Influência (vermelho, a família mais numerosa) e Atuação/Filiação (verdes) dominam a rede vista de perto, formando o par vermelho+verde que a direção pede para evitar. Trocar Influência por jenipapo ou terra exige refazer o par de contraste ≥3:1 em `ui-contrast.spec.ts` e muda grafo e mapa juntos; fica como decisão de design.
- **Dados do mapa:** existem dois "Brasil" (o país `country-brazil` e o verbete `wiki-topic-brasil`, classificado como "Cidade ou local", vigência "1500–"). Algumas conexões da mesa leem mal ("Suíça — August Bebel influenciou Liderança"; "← Brasil" dentro do próprio Brasil) porque o rótulo é o da relação entre registros ancorados, não entre territórios. Pede revisão de conteúdo, não de interface.
- **Globo em canvas:** cores fixas em `globe-canvas.ts`; alinhar aos tokens (etapa 9 do design system).
- **Legenda do grafo:** "Tipos de nó" aberto por padrão ocupa a maior parte do painel; avaliar recolher quando há caminho ativo.
- **Cabeçalho no celular:** três linhas (marca, busca, ferramentas) consomem ~25% da altura; a busca poderia dividir a linha com a marca.

## Remover

- Contagens zeradas na mesa de estudo (feito).
- A coluna vazia da legenda fechada no mapa e no grafo (feito).
- Nada da interação foi removido: `?no=`, `?de=`, `?para=`, teclado, lista equivalente e movimento reduzido seguem iguais.
