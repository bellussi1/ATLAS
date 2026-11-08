Status: resultado
Última verificação: 08/11/2026

# Expansão de relações — 08/11/2026

Trabalho pago com a API do Claude para melhorar as relações dos verbetes e das quatro leituras.
O release **`156b98a`** foi gerado localmente, mas **não foi publicado**: o ponteiro público
continua em `e841fac` até uma decisão humana.

## Resultado no grafo

| Métrica | `e841fac` (publicado) | `156b98a` (local) | Delta |
|---|---:|---:|---:|
| Entidades | 1.158 | 1.190 | **+32** |
| Relações totais | 846 | 908 | **+62** |
| Relações documentadas | 676 | 738 | **+62** |

As 62 relações novas são todas documentadas (nenhuma é `encyclopedic-link`, `editorial-link` ou
`related_to`). Por coleção:

| Coleção | Documentadas antes | Depois | Delta |
|---|---:|---:|---:|
| `atlas-liberalism` | 12 | 28 | +16 |
| `atlas-marx-valor` | 43 | 57 | +14 |
| `atlas-marxismo` | 1 | 6 | +5 |
| `atlas-liberalismo` | 7 | 14 | +7 |
| `atlas-social-democracia` | 77 | 78 | +1 |
| `atlas-anarquismo` | 59 | 66 | +7 |
| `atlas-verbetes-citados` | 447 | 459 | +12 |

## Como foi feito

- Reextração de **Marxismo** (36 artigos) e **Liberalismo** (15 pendentes) com Haiku 5.5 medium
  e verificação de relações com **Sonnet 5.5 low**.
- Lote curado de **141 verbetes** sem relações (pessoas, obras, partidos, movimentos, organizações
  e eventos), com o mesmo ciclo.
- Busca de **33 alvos ausentes** no Wikidata/Wikipedia, criação das entidades e nova consolidação
  parcial para resolver relações que antes ficavam pendentes.
- Consolidação sempre em modo parcial: nenhuma coleção existente foi substituída nem perdeu
  registros.
- O fixture de testes continua no caminho antigo (sem os pacotes), para não duplicar 24 MB em
  cada execução.

## Custo

| Item | US$ |
|---|---:|
| Marxismo | 0,098 |
| Liberalismo (novo) | 0,059 |
| Verbetes e alvos (novo) | 0,491 |
| **Extração** | **0,648** |
| Auditoria Sonnet da Onda 1 | ~0,159 |
| **Total desta rodada** | **~0,81** |

O saldo restante do teto de US$ 6 é de aproximadamente **US$ 5,19**. A Onda 1 paga anterior
(`US$ 0,0706`) é separada.

## Correção de modelo

O extrator usava o mesmo `effort` da extração na segunda passada, então o Sonnet rodava em
`medium`. O `extract.mjs` agora lê `relacoes.effort` de `model-choice.json` (Sonnet `low`) e
aceita `--relation-effort`. Isso derrubou a estimativa do Marxismo de ~US$ 13 para **US$ 0,47**
e a do Liberalismo para **US$ 0,20**.

## Auditoria da Onda 1

Sonnet 5.5 auditou os 100 itens de `docs/research/onda1-2026-11/revisao.json`:

- **98 sustenta**
- **2 não sustenta**
- 0 inverte, 0 fonte errada

Os dois itens para conferir primeiro são:

1. **Brasil** (`haiku-low`, texto): a afirmação liga a Guerra Civil Americana à abolição no Brasil;
   o parágrafo só liga a abolição brasileira ao processo de mobilização interna.
2. **Partido dos Trabalhadores** (`haiku-medium`, texto): o parágrafo fala de caixa dois e compra
   de deputados, mas não nomeia o mensalão.

O arquivo `auditoria-ia.json`/`.md` é auxiliar. Os campos `ok` continuam nulos: a revisão humana
segue sendo a porta de precisão ≥ 95%.

## Pendências

- **Publicação:** o release `156b98a` precisa de aprovação humana para ir ao R2 e ao Pages.
- **Relações ainda pendentes:** Marxismo 4, Liberalismo 20, Social-democracia 30 e Anarquismo 10.
  A maioria é alvo sem QID ou fora do grafo.
- **Verbetes:** 376 entidades ainda sem relação. O lote completo foi estimado em **US$ 4,91**
  (esperado), acima do que resta com margem; um recorte menor precisa de decisão.
- **Revisão humana:** os 100 itens da Onda 1 continuam pendentes.
