# Hierarquia de rótulos do grafo

Registro da decisão e das medições da camada de nomes de `/grafos`. O objetivo é reduzir a poluição sem esconder nós nem quebrar a exploração.

## Diagnóstico do algoritmo anterior

- Os candidatos eram ordenados por `degree` bruto, com `minDegree` em 2, 1 e 0 conforme o zoom e um limite de `round(16 + 30 * zoom)`.
- `placeLabels()` testava quatro posições por rótulo contra todos os nós e rótulos já colocados.
- Consequência: nós com muitas ligações de catálogo ou navegação ganhavam prioridade; nós periféricos, mas com espaço livre, ocupavam os poucos lugares que passavam na colisão. Na visão global apareciam nomes como “Twitter”, “L'asino d'oro” e “Leonard Read”, enquanto “Karl Marx” podia ficar de fora.
- A distribuição não era controlada: em 1440 px, 6 dos 13 rótulos ficavam na mesma célula de uma grade 4×3.
- A estabilidade dependia só do passo de zoom de 1/4 de oitava e de `lastLabels` durante o movimento.

## Alternativas avaliadas

| Alternativa | Trade-off |
| --- | --- |
| Aumentar `minDegree` e cortar o limite | Reduz a contagem, mas mantém a preferência por popularidade de links e esconde nós importantes |
| Manter todos os candidatos e confiar na colisão | Muitos candidatos; rótulos periféricos vencem por terem espaço, não por importância |
| Ordenar por grau + comunidade | Espalha melhor, mas continua tratando catálogo e navegação como evidência |
| **Escolhida:** relevância por natureza + zoom semântico + distribuição espacial + estabilidade | Mais código e pesos editoriais explícitos; exige calibração, mas separa importância documentada de popularidade |

## Pontuação adotada

`labelRelevance()` em `knowledge-network.ts` combina:

| Sinal | Peso | Motivo |
| --- | --- | --- |
| Aresta `stated` | 1,0 (×3) | Fonte afirma a relação; é o sinal mais forte |
| Aresta `editorial` | 0,4 (×1,2) | Situa o tema, sem tese histórica própria |
| Aresta `catalogue` | 0,12 (×0,4) | Classificação de catálogo: associação, não influência |
| Aresta `navigation` | 0 | Citação entre verbetes não mede importância |
| Vizinhos distintos por natureza | ×1,4 | Evita que arestas repetidas inflem o grau |
| Coleções em que o registro aparece | 0,8 por coleção extra | Reuso editorial, não popularidade de hyperlink |
| Registro em revisão | ×0,85 | Prefere conteúdo já conferido, sem esconder o resto |

O `degree` bruto deixou de ordenar rótulos. Ele continua sendo o dado do nó e do cartão.

## Zoom semântico

| Nível | Zoom relativo | Nomes | Limite de texto |
| --- | --- | --- | --- |
| Global | < 175% | 12 | 30 caracteres |
| Intermediário | 175%–350% | 24 | 36 caracteres |
| Local | ≥ 350% | 36 | 44 caracteres |

- `stableLabelTier()` usa histerese: global→intermediário em 175%, volta em 145%; intermediário→local em 350%, volta em 300%.
- Um nome já visível recebe um bônus pequeno (0,6) para não piscar quando outro passa raspando.
- Só entram candidatos dentro da área visível (com margem de 40 px), então o zoom local gasta o orçamento no que está na tela.
- `spreadCandidates()` garante o melhor candidato, depois um por área ocupada (grade 4×3) e só então preenche por relevância, com teto por célula.
- `placeLabels()` agora tenta oito posições (quatro laterais e quatro diagonais). Nós pequenos (grau < 8 e raio < 10 px) não bloqueiam um nome; nós grandes e bem conectados continuam bloqueando.

## Estabilidade e acessibilidade

- Ordenação determinística: relevância, título em `pt-BR`, depois `id`.
- O conjunto só é recalculado quando o movimento termina; durante pan, zoom e animação vale o último conjunto.
- O grupo visual de rótulos é `aria-hidden`; cada nó mantém `aria-label` com título, tipo e número de ligações. Teste cobre um nó sem rótulo visual e com nome acessível.

## Resultados medidos

Antes (build anterior, 07/11/2026):

| Viewport | 100% | Máximo por célula | Sobreposições | Exemplos |
| --- | --- | --- | --- | --- |
| 1440×900 | 13 | 6 | 0 | Twitter, L'asino d'oro, Leonard Read, Leninismo |
| 390×844 | 2 | 1 | 0 | Biz Stone, Leonard Read |

Depois:

| Viewport | 100% | Máximo por célula | Sobreposições | Exemplos |
| --- | --- | --- | --- | --- |
| 1440×900 | 12 | 4 | 0 | ONU, Otan, Maquiavel, Karl Marx, Max Weber |
| 390×844 | 3 | 1 | 0 | Max Weber, Brasil, Bolsa Família |

Com o fim da animação, o nível intermediário (220%) mostra 21 nomes em 1440 e 11 em 390; o antigo mostrava 14 e 1. O ganho não é só quantidade: os nomes globais agora são pontos de referência documentados, e não os nós que por acaso tinham espaço.

Capturas: `output/playwright/labels-before-1440.png`, `labels-after-1440.png`, `labels-before-390.png`, `labels-after-390.png` (geradas localmente, fora do Git).

## Limites conhecidos

- Títulos longos são truncados no limite do nível; duas organizações podem começar com “Organização…”. Apelidos curtos do dado ainda não são usados como rótulo.
- Rótulos podem cobrir nós pequenos (grau < 8); não cobrem outros rótulos nem nós grandes.
- Um nó relevante ainda pode ficar sem lugar se as oito posições colidirem; ele continua acessível pelo nó, pela busca e pelo painel.
- Não há linha-guia ligando um rótulo deslocado ao nó.

## Arquivos e testes

- `src/app/core/content/queries/knowledge-network.ts`: conexões por natureza, vizinhos distintos e `labelRelevance`.
- `src/app/core/content/queries/network-labels.ts`: níveis, histerese, orçamento, distribuição espacial, truncamento e oito posições.
- `src/app/shared/ui/knowledge-network/knowledge-network.component.ts`: seleção, filtro de área visível, obstáculos e estabilidade.
- Testes: `knowledge-network.spec.ts`, `network-labels.spec.ts`, `knowledge-network.component.spec.ts` e `e2e/graph.spec.ts`.
