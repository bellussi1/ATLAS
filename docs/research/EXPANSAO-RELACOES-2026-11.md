Status: resultado
Última verificação: 08/11/2026

# Expansão de relações — 08/11/2026

Trabalho pago com a API do Claude para melhorar as relações dos verbetes e das quatro leituras,
seguido de enriquecimento gratuito pelo Wikidata. O release **`8063357`** foi publicado em 08/11;
o ponteiro público aponta para ele. A revisão dos lotes é **assistida por IA**, autorizada pelo
responsável do projeto; não há alegação de revisão humana.

## Resultado no grafo

| Métrica | `e841fac` | `156b98a` | `c0be77b` | `ff48809` | `8063357` (publicado) | Delta total |
|---|---:|---:|---:|---:|---:|---:|
| Entidades | 1.158 | 1.190 | 1.190 | 1.190 | 1.190 | **+32** |
| Relações totais | 846 | 908 | 945 | 954 | 1.580 | **+734** |
| Relações documentadas | 676 | 738 | 775 | 784 | 1.410 | **+734** |

As 734 relações novas são todas documentadas (nenhuma é `encyclopedic-link`, `editorial-link` ou
`related_to`).

### Primeiro lote (`156b98a`)

| Coleção | Documentadas antes | Depois | Delta |
|---|---:|---:|---:|
| `atlas-liberalism` | 12 | 28 | +16 |
| `atlas-marx-valor` | 43 | 57 | +14 |
| `atlas-marxismo` | 1 | 6 | +5 |
| `atlas-liberalismo` | 7 | 14 | +7 |
| `atlas-social-democracia` | 77 | 78 | +1 |
| `atlas-anarquismo` | 59 | 66 | +7 |
| `atlas-verbetes-citados` | 447 | 459 | +12 |

### Segundo lote (`c0be77b`)

Os 376 verbetes restantes sem relação foram extraídos e consolidados em modo parcial:

- `atlas-verbetes-citados`: 459 → **496** relações (+37).
- 100 primeiros verbetes: 31 relações verificadas, 18 arestas após alvos.
- 276 restantes: o rendimento caiu porque são, em maioria, conceitos e organizações genéricas.
- Custo do lote: **US$ 0,903**.

### Terceiro lote (`ff48809`) — arestas curadas dos suplementos

As arestas já curadas em `content/graph/<slug>.json` foram consolidadas como relações com
evidência e fonte:

- **Marxismo:** +1 (`Lenin → Kautsky`; as outras duas já existiam como `reacted_against`).
- **Liberalismo:** +8 (Locke, Smith, Montesquieu, Mill, socialismo liberal, Hayek, neoliberalismo e
  Marx).
- Total: **+9 relações documentadas**, sem custo de API.

### Quarto lote (`8063357`) — Wikidata

`scripts/content/enrich-wikidata-verbetes.mjs` consultou as declarações dos 928 QIDs de
`atlas-verbetes-citados` e converteu apenas alvos que já existem no grafo:

- **+648 relações** na coleção (496 → 1.122), com fonte CC0, evidência e procedência.
- Propriedades mantidas: P50/P800 (autoria), P102 (filiação), P112 (fundação), P1344/P607/P710
  (participação), P276 (local/sede), P155/P156 (sucessão), P463 (membro), P135 (movimento),
  P737 e P1142 (classificação de catálogo).
- Descartados: P361 (parte/todo), P1142 em pessoa e P463 em país/local/conceito, que inflavam o
  grafo com vínculos administrativos.
- P737/P1142 entram como `associated_with` com aviso explícito de que não são influência
  documentada.
- A primeira passada de P276 rotulou 22 conceitos/obras e 5 instituições como “ocorreu em”; a
  correção removeu os conceitos/obras e renomeou as instituições para “está sediado em”.
- **4.036 alvos externos** não foram criados; exigiriam uma etapa de entidades.
- Custo de API: **zero**.

## Quatro leituras — régua documentada

A métrica `relations.documentadas` agora aparece em `npm run tradicao:coverage`:

| Leitura | Documentadas | Meta Onda 2 | Gap |
|---|---:|---:|---:|
| Marxismo | 42 | 70 | -28 |
| Liberalismo | 24 | 35 | -11 |
| Social-democracia | 34 | 70 | -36 |
| Anarquismo | 10 | 50 | -40 |

O lote de verbetes melhora o grafo global, mas **não** fecha as metas das quatro leituras: essas
relações precisam ligar entidades do próprio recorte, o que é trabalho editorial e de alvos, não
só extração de artigos externos.

## Como foi feito

- Reextração de **Marxismo** (36 artigos) e **Liberalismo** (15 pendentes) com Haiku 5.5 medium
  e verificação de relações com **Sonnet 5.5 low**.
- Lote curado de **141 verbetes** e busca de **33 alvos ausentes** no Wikidata/Wikipedia.
- Lote dos **376 verbetes restantes** em três execuções (100 + 138 + 138), com o mesmo ciclo.
- Consolidação das **arestas curadas dos suplementos** de Marxismo e Liberalismo, com evidência e
  fonte, sem custo de API.
- Enriquecimento pelo **Wikidata** dos 928 verbetes citados, sem criar entidades e sem custo de API.
- Consolidação sempre em modo parcial: nenhuma coleção existente foi substituída nem perdeu
  registros.
- O fixture de testes continua no caminho antigo (sem os pacotes), para não duplicar 24 MB em
  cada execução.

## Custo

| Item | US$ |
|---|---:|
| Extração (Marxismo, Liberalismo, 141 + 33 alvos, 376 verbetes) | 1,551 |
| Auditoria Sonnet da Onda 1 (texto) | ~0,159 |
| Re-verificação Sonnet das relações | 0,065 |
| **Total desta rodada** | **~1,775** |

O saldo restante do teto de US$ 6 é de aproximadamente **US$ 4,2**. A Onda 1 anterior
(`US$ 0,0706`) é separada.

## Revisão de IA da Onda 1

- Texto: Sonnet 5.5 marcou **98/100** como “sustenta”; 2 textos não sustentam (Brasil e PT).
- Relações: a re-verificação Sonnet low confirmou **22/24** relações do Haiku (low 7/7;
  medium 15/17) e rejeitou 2 arestas `desenvolveu-se-em` do Marxismo por tipo/direção.
- Resultado final: **96 sustenta, 4 não sustenta**.
- Decisão: **Haiku 5.5 medium + Sonnet 5.5 low**; ver `scripts/tradicao/model-choice.json`.
- Os arquivos são `auditoria-ia.json`/`.md` (texto) e `auditoria-relacoes-sonnet.json` (relações).

## Pendências

- **Publicação:** o release `8063357` está publicado no R2 e o ponteiro público aponta para ele; o próximo deploy do Pages fixa o conteúdo no HTML prerenderizado.
- **Quatro leituras:** faltam 28/11/36/40 relações documentadas para 70/35/70/50.
- **Relações ainda pendentes:** Marxismo 4, Liberalismo 20, Social-democracia 30 e Anarquismo 10.
- **Wikidata:** 4.036 alvos das declarações ficaram fora do grafo; criar essas entidades é uma
  etapa própria, com decisão editorial.
- **Editorial:** debates, cronologia e vertentes de Social-democracia e Anarquismo continuam
  dependendo de fonte e redação, não de extração automática.
