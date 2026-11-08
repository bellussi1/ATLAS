Status: resultado
Última verificação: 08/11/2026

# Onda 1 — calibração Haiku (08/11/2026)

Amostra de 20 artigos de Social-democracia e Anarquismo, mesmos artigos nos dois braços. A
revisão passou a ser **assistida por IA**, por decisão do responsável do projeto; o documento não
alega revisão humana.

| Braço | Rascunhos | Citações rejeitadas | Relações aceitas | Rejeição de relações | Custo |
|---|---:|---:|---:|---:|---:|
| Haiku 5.5 low | 20 | 0/216 (0%) | 7 de 27 | 74,1% | US$ 0,030 |
| Haiku 5.5 medium | 20 | 2/262 (0,8%) | 17 de 37 | 54,1% | US$ 0,041 |

## Revisão de IA

### Texto

Sonnet 5.5 auditou os 100 itens contra citação e parágrafo:

- **98 sustenta**
- **2 não sustenta** — Brasil (`haiku-low`, texto) e Partido dos Trabalhadores (`haiku-medium`,
  texto)

### Relações

A re-verificação das relações já confirmadas pelo Haiku foi feita com **Sonnet 5.5 low**:

| Braço | Confirmadas pelo Haiku | Confirmadas pelo Sonnet | Rejeitadas | Custo |
|---|---:|---:|---:|---:|
| Haiku low | 7 | 7 | 0 | US$ 0,024 |
| Haiku medium | 17 | 15 | 2 | US$ 0,041 |

As 2 rejeições são as relações `Karl Marx desenvolveu-se-em Marxismo` e
`Friedrich Engels desenvolveu-se-em Marxismo`: a citação diz que o marxismo se originou das obras
dos dois, não que eles tenham se desenvolvido na corrente. O tipo/direção não sustenta a aresta.

### Resultado final

- **96 sustenta** e **4 não sustenta** nos 100 itens.
- Texto: 1/40 (2,5%) no low e 1/36 (2,8%) no medium.
- Relações: 0/7 no low e 2/17 (11,8%) no medium; o Sonnet low remove os 2 erros de tipo.
- Custo da revisão: ~US$ 0,16 (texto) + US$ 0,065 (relações).

## Decisão de modelo

Fica **Haiku 5.5 medium para extração + Sonnet 5.5 low para verificar relações**:

- O texto do medium fica abaixo de 5% e produz mais conteúdo que o low (17 relações contra 7).
- O Haiku médio erra o tipo/direção em 2/17 relações; o Sonnet low confirma 15/17 e rejeita os 2.
- O low é mais preciso nas 7 relações que propõe, mas a cobertura é menos da metade; a Onda 2
  precisa de volume com precisão.
- `scripts/tradicao/model-choice.json` registra os três candidatos e a escolha.

## Correção de custo

O `extract.mjs` usava o mesmo `effort` da extração na segunda passada, o que colocava o Sonnet em
`medium` e estimava ~US$ 13 para 895 verbetes. Agora ele lê `relacoes.effort` do
`model-choice.json` (Sonnet `low`) e aceita `--relation-effort`. O Marxismo caiu de ~US$ 13 para
**US$ 0,47** (estimado) e o Liberalismo para **US$ 0,20**.

## Próximo passo

1. Iniciar a Onda 2 com as metas documentadas **70/50/70/35** e o orçamento restante.
2. Priorizar os alvos que ainda faltam no grafo, não só novas propostas de relação.
3. Manter a revisão de IA declarada em cada lote; não registrar `ok` como revisão humana.
