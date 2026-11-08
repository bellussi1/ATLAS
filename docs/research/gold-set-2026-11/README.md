Status: plano
Última verificação: 08/11/2026

# Gold set da expansão

Fila de conferência humana da Onda 0. Nada aqui foi marcado por pessoa e nada foi publicado.

- `relacoes.json`: 87 relações documentadas, todas as que existem hoje sem contar links de navegação. A meta de 100 não é atingível sem criar relações ou contar `encyclopedic-link`/`related_to` como relação histórica.
- `afirmacoes.json`: 40 afirmações, 10 por tradição.
- `pares-fonte-afirmacao.json`: 20 pares com evidência e fonte.

## Como marcar

Em cada item, troque `ok: null` por:

- `true`: o trecho sustenta o item.
- `false`: o trecho não sustenta, ou o sentido está errado.
- `"inverte"`: a direção ou o sujeito está invertido.
- `"fonte_errada"`: o item repete o trecho, mas a fonte está factualmente errada.

Use `note` para explicar. A revisão por IA não substitui esta marcação; o pipeline não deve
contar um item como conferido sem `ok` booleano ou uma das strings acima.

## Limite

A amostra foi gerada por hash determinístico a partir do conteúdo atual, antes da captura dos
108 artigos das Ondas 0 e 1. Refazer a amostra depois da consolidação é esperado.
