# Guia de voz

Vale para todo texto que o leitor vê: interface, mensagens geradas por código, resumos, relações e estados vazios. A implementação de apoio está em `src/app/core/content/editorial/reader-voice.ts`.

## Voz

- Português do Brasil, terceira pessoa, neutro e direto. Frases curtas, com sujeito e verbo.
- A prosa fala do assunto, nunca de quem a escreveu ou de como foi produzida.
- Fato documentado, interpretação, tese atribuída e alegação controversa são diferentes: atribua o que é de alguém ("Marx sustenta") e não apresente interpretação como fato.
- Sem adjetivo de propaganda, sem chamada de marketing, sem convite em segunda pessoa quando uma descrição basta.

## O que a prosa nunca menciona

"ATLAS", "nós", "nosso", "plataforma", "Wikipédia", "Wikidata", "o artigo", "segundo o artigo", "rascunho", "extraído por IA", "importado", identificadores internos (`Q123`, `P737`, ids de registro) e nomes de campos.

| Em vez de                                   | Escrever                                                             |
| ------------------------------------------- | -------------------------------------------------------------------- |
| não validada pelo ATLAS                     | não comprovada                                                       |
| Dados importados                            | Registros (com a fonte ao lado)                                      |
| link de descoberta na Wikipedia             | remete a (grupo "Pistas de leitura")                                 |
| é listado no Wikidata como influenciado por | é listado como influenciado por (grupo "Classificações de catálogo") |
| Rascunho                                    | Versão preliminar                                                    |

A marca continua onde identifica o site: logotipo, título da aba, `og:site_name` e endereços do repositório. Isso não é prosa.

## Onde ficam atribuição e estado editorial

Atribuição e revisão nunca somem; saem do texto corrido e viram dado.

- **Fontes e licença:** área própria no fim da ficha e do verbete, em dois blocos: **Fontes** (título, URL e edição) e **Licenças e créditos** (texto e imagem). Só ali, e na linha "Fonte:" de uma relação, "Wikipédia" e "Wikidata" aparecem, como nome da fonte citada. A licença CC BY-SA 4.0 exige fonte, URL e licença visíveis.
- **Selo editorial:** linha discreta junto ao tipo do registro. Identifica IA e nunca sugere revisão inexistente: "Inclui síntese por IA · revisão humana não registrada", "Revisão editorial pendente", "Situação editorial não informada".
- Conteúdo sem revisão não ganha "verificado". Conteúdo publicado com notas de processo em `context` tem essas frases separadas por `readerProse`, sem alterar o dado.

## Hierarquia da leitura

Toda ficha responde, nesta ordem:

1. **O que é:** tipo, título, definição de uma linha e resumo.
2. **Por que importa aqui:** a nota da página e o capítulo onde o registro aparece. Se a página não tiver nota, não se inventa uma.
3. **O que se sabe:** seções com título, sem repetir o resumo.
4. **Como se liga às demais:** relações por peso de evidência.
5. **Fontes e licença:** fontes e, abaixo, licenças e créditos.

## Relações

Uma relação é uma frase, seguida de natureza, situação e evidência (`RelationEntryComponent`):

> **Karl Marx** escreveu **O capital** · Autoria · incerteza baixa · revisão editorial pendente · Fonte: título da fonte

- A frase diz quem agiu sobre quem, a partir do registro lido. Voz passiva só quando o registro lido é quem recebe a ação ("foi escrito por").
- Ordem dos grupos: **Relações documentadas**, **Registros citados**, **Vínculos editoriais**, **Classificações de catálogo**, **Pistas de leitura**. Pistas começam fechadas quando há algo mais forte antes.
- Cada grupo diz o que não prova. Pista de leitura não comprova influência; classificação de catálogo indica associação.
- Citação literal entre aspas curvas, em bloco, sempre com a fonte. Citação não se reescreve.

## Formatação

| Elemento               | Padrão                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Título do registro     | sans, peso 700                                                         |
| Resumo                 | serifa, corpo maior                                                    |
| Texto                  | serifa, 1,0625rem, entrelinha 1,65                                     |
| Título de seção        | `.reading-heading`, sans, peso 700, caixa normal                       |
| Metadado, selo, fonte  | mono, 0,75rem                                                          |
| Lista                  | sem marcador, separada por fio; numerada só se a ordem significar algo |
| Citação                | `blockquote` em serifa itálica com fio à esquerda                      |
| Ano e intervalo        | `1867`, `1818–1883` (meia-risca, sem espaços)                          |
| Data completa          | `3 de novembro de 2026` (`readerDate`)                                 |
| Separador de metadados | `·`                                                                    |

## Estados vazios

Classe `.reading-empty`. Forma fixa: "Não há X neste recorte." e, se houver saída, uma frase com a ação ("Apague o filtro para ver toda a bibliografia."). Não usar "Nenhum(a)", "ainda" sem previsão real nem pedido de desculpas.

## Verificação antes de concluir

```bash
rg -n "Wikip[eé]dia|Wikidata|ATLAS|plataforma|[Rr]ascunho|importad" src/app --glob "*.html"
```

Cada ocorrência precisa estar em área de fontes, em identidade da marca ou em atributo técnico.
