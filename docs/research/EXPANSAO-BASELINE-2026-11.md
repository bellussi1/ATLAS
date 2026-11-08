Status: plano
Última verificação: 08/11/2026

# Linha de base da expansão — novembro de 2026

Medição local, sem rede, antes da captura dos 108 artigos que faltam em Social-democracia e
Anarquismo. A fonte é `content/knowledge`; o script de inventário fica em `generated/` e não é
publicado.

| Leitura | Entidades | Relações no grafo | Documentadas | Órfãs | Fontes | Citadas | Cap. sem bloco | Claims |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Marxismo | 42 | 122 | 33 | 20 | 123 | 29 | 1 | 112 |
| Liberalismo | 31 | 75 | 11 | 19 | 98 | 27 | 1 | 184 |
| Social-democracia | 54 | 35 | 34 | 30 | 70 | 16 | 4 | 560 |
| Anarquismo | 46 | 10 | 10 | 37 | 56 | 10 | 4 | 433 |

## O achado que muda a meta

O número que o grafo mostra hoje inclui **links enciclopédicos de navegação**
(`encyclopedic-link`, `editorial-link` e `related_to`). Eles são úteis para navegar, mas não são
relações históricas: não têm verbo, direção e fonte no mesmo grau.

Sem contar esses links, a linha de base é **33 + 11 + 34 + 10 = 88 relações documentadas**, não
122 + 75 + 35 + 10. As metas da Onda 2 (160/120/100/80) precisam ser lidas nessa régua, ou o
trabalho será "cumprido" adicionando links.

Tipos documentados encontrados:

- **Marxismo:** `influenced_by` 13, `documented-association` 6, `authored` 6,
  `reacted_against` 5, `participated_in` 2, `influenced` 1.
- **Liberalismo:** `influenced_by` 7, `documented-association` 2, `participated_in` 1,
  `wrote` 1.
- **Social-democracia:** `associated_with` 17, `documented-association` 9, `influenced` 6,
  `reacted_against` 1, `participated_in` 1.
- **Anarquismo:** `influenced` 5, `associated_with` 3, `documented-association` 1,
  `reacted_against` 1.

## Órfãs e capítulos

- Social-democracia tem 30 entidades sem nenhuma relação documentada e 4 capítulos sem bloco.
- Anarquismo tem 37 entidades sem relação documentada e 4 capítulos sem bloco.
- As fontes citadas ficam em 29/123, 27/98, 16/70 e 10/56: a bibliografia cresceu, mas a
  proporção de fontes efetivamente usadas ainda é baixa.

## Gold set

`docs/research/gold-set-2026-11/` reúne todas as 87 relações documentadas, 40 afirmações e 20
pares fonte × afirmação, com `ok: null`. A conferência é humana; a IA não pode marcar `ok`.

## Próximo passo

1. Terminar a captura dos 108 artigos (Onda 0, gratuita).
2. Atualizar alvos de Marxismo e Liberalismo.
3. Refazer a linha de base com a captura concluída.
4. Só então aprovar a amostra paga da Onda 1.
