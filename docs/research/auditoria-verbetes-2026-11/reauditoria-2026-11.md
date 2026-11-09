Status: resultado
Última verificação: 09/11/2026

# Reauditoria dos verbetes — 09/11/2026

Segunda medição depois da correção de tipos e da criação do escopo. Os números de
comparação vêm de `AUDITORIA-VERBETES-2026-11.md`, medidos antes das mudanças.

## Tipos

- Candidatos de alta confiança no TSV: **54**.
- Ainda divergentes no grafo: **0**.


## Escopo

| Escopo | Registros |
|---|---:|
| Núcleo | 1.134 |
| Contexto | 36 |
| Fora | 20 |
| Total | 1.190 |

Nos 928 verbetes citados:

| Escopo | Verbetes |
|---|---:|
| Núcleo | 872 |
| Contexto | 36 |
| Fora | 20 |

### Revisão caso a caso

- **20 fora confirmados.** 16 não têm nenhuma relação e 4 têm apenas um vínculo de criação (`escreveu`), que não muda o recorte político. Nenhum foi promovido a contexto e nenhum registro foi apagado.
- **36 contextos confirmados.** 11 não têm relações registradas e 25 têm ao menos uma. Nenhum foi promovido a núcleo: são mídia, universidade, editora, instituição religiosa, conceito social ou pensamento de contexto.
- **28 itens** da estimativa de ~64 contextos seguem sem marcação e continuam na revisão editorial.
- **4 títulos** do TSV de contexto não existem no grafo e não foram aplicados: UNESCO, FAO, OIT, OMS.
- O tipo de **Empirismo** continua `institution`; é um erro de tipo fora do lote de alta confiança e fica para a próxima passada.

## Peso das relações

### Grafo completo

| Peso | Histórico | Ação | Administrativo | Catálogo | Total |
|---|---:|---:|---:|---:|---:|
| Total | 267 | 432 | 455 | 426 | 1.580 |

Político (histórico + ação): **699 de 1.580 (44,2%)**.

### `atlas-verbetes-citados`

| Peso | Histórico | Ação | Administrativo | Catálogo | Total |
|---|---:|---:|---:|---:|---:|
| Total | 150 | 342 | 417 | 213 | 1.122 |

Comparação com a auditoria de 09/11 (1.122 relações):

| Peso | Antes | Agora | Variação |
|---|---:|---:|---:|
| Histórico | 150 | 150 | +0 |
| Ação | 342 | 342 | +0 |
| Administrativo | 417 | 417 | +0 |
| Catálogo | 213 | 213 | +0 |
| Total | 1.122 | 1.122 | +0 |

A regra de peso reproduz exatamente os quatro números da auditoria anterior sobre o mesmo
conjunto de 1.122 relações, o que valida a classificação. O grafo completo tem
1.580 relações porque inclui as outras coleções.

## Relevância política por escopo

Registros com pelo menos uma relação histórica ou de ação, por escopo:

| Escopo | Com relevância política | Sem relevância política | Total |
|---|---:|---:|---:|
| Núcleo | 568 | 566 | 1.134 |
| Contexto | 23 | 13 | 36 |
| Fora | 4 | 16 | 20 |

O escopo é uma decisão editorial; o peso da relação não muda o escopo sozinho. A contagem
serve para separar o que tem relação histórica documentada do que só aparece por vínculo
administrativo ou de catálogo.

## Limites

- O peso é derivado do tipo e do rótulo da relação; uma relação mal tipada continua mal pesada.
- Um vínculo de criação, como `escreveu`, conta como ação mesmo quando a obra é de ficção ou um conceito genérico. O escopo corrige a leitura; o peso sozinho não.
- A classificação de escopo dos ~64 contextos é estimativa e segue em revisão caso a caso.
- Nenhuma fonte foi reaberta nesta rodada.
