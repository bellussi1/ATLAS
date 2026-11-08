Status: atual
Última verificação: 08/11/2026

# Imagens de abertura das leituras

As imagens no topo de `/leitura/:slug` não são uma amostra automática do acervo. Cada página publicada declara, no próprio dossiê, quais registros abrem a leitura e por quê. O componente apenas resolve os IDs canônicos, verifica a licença e mantém o mesmo sistema de molduras.

## Onde fica a curadoria

`content/ideologies/<slug>/page.json`, no campo `poster.figures`:

```json
{
  "entityId": "person-karl-marx",
  "assetId": "marxism-asset-person-karl-marx",
  "label": "Karl Marx",
  "note": "Formulou a crítica da economia política que organiza a tradição.",
  "frame": "disc"
}
```

- `entityId` e `assetId` são IDs canônicos do grafo e do registro de licença; não são caminhos de arquivo.
- `label` é a identificação curta exibida sob a imagem; sem ele, vale o título do registro.
- `note` é a razão editorial. Aparece em “Imagens: créditos e critério”, junto da atribuição.
- `frame` escolhe a moldura (`disc`, `arch`, `quarter`, `square`) para variar a composição sem inventar um sistema por página.
- A ordem do array é a ordem no topo. O limite é **quatro**, mas a página pode declarar menos quando não houver candidatas adequadas.

`validateIdeologyDossier` recusa figura sem vínculo com a leitura, asset de outro registro, licença desconhecida, reprodução bloqueada, crédito ou link ausente e imagem repetida.

## Critérios editoriais

1. A imagem deve representar uma **passagem central da narrativa**: fundação, ruptura, obra, acontecimento ou instituição que o texto precisa explicar.
2. A composição mistura tipos quando isso ajuda: pessoas, obras, documentos, acontecimentos e iconografia. Não usar quatro retratos só porque estão disponíveis.
3. A seleção não é um ranking de fama. Um registro menos célebre pode entrar se for mais central para o argumento do capítulo.
4. Cada imagem tem uma frase de justificativa; sem justificativa, não entra.
5. Nada de símbolo, retrato ou associação inventada. A licença, a atribuição e o link do arquivo precisam existir no registro.
6. A mesma imagem não volta num cartão de capítulo por seleção automática. Se houver repetição deliberada, ela precisa de outra função narrativa.
7. Sem curadoria declarada, o componente usa um **fallback conservador**: registros mais citados na página, no máximo duas pessoas e um registro de cada outro tipo. O fallback não é apresentado como curadoria validada: o bloco se chama “Imagens: créditos” e declara a seleção automática.

## Seleções atuais

### Marxismo

| Registro            | Asset                                    | Por que abre a leitura                                               |
| ------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Karl Marx           | `marxism-asset-person-karl-marx`         | Formulou a crítica da economia política que organiza a tradição.     |
| Friedrich Engels    | `marxism-asset-person-friedrich-engels`  | Coautor do Manifesto e editor dos volumes de O capital.              |
| Manifesto Comunista | `marxism-asset-work-communist-manifesto` | Texto de fundação que liga teoria e movimento operário.              |
| Comuna de Paris     | `marxism-asset-event-paris-commune`      | Primeira experiência de governo operário debatida por Marx e Engels. |

### Liberalismo

| Registro           | Asset                                  | Por que abre a leitura                                     |
| ------------------ | -------------------------------------- | ---------------------------------------------------------- |
| John Locke         | `liberalism-asset-person-john-locke`   | Direitos naturais e consentimento como base do governo.    |
| Montesquieu        | `liberalism-asset-person-montesquieu`  | Separação dos poderes como limite ao arbítrio.             |
| Adam Smith         | `liberalism-asset-person-adam-smith`   | Mercado e divisão do trabalho na crítica ao mercantilismo. |
| Declaração de 1789 | `liberalism-asset-ideology-liberalism` | Transformou princípios liberais em linguagem política.     |

### Anarquismo

| Registro               | Asset                                     | Por que abre a leitura                                      |
| ---------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| Pierre-Joseph Proudhon | `asset-wiki-topic-pierre-joseph-proudhon` | Propriedade como domínio e a alternativa mutualista.        |
| Mikhail Bakunin        | `asset-wiki-topic-mikhail-bakunin`        | Ruptura com Marx na Primeira Internacional e ação coletiva. |
| Piotr Kropotkin        | `asset-wiki-topic-piotr-kropotkin`        | Apoio mútuo e comunismo anarquista.                         |
| Emma Goldman           | `asset-wiki-topic-emma-goldman`           | Anarquismo, feminismo e liberdade no debate público.        |

### Social-democracia

| Registro         | Asset                                   | Por que abre a leitura                              |
| ---------------- | --------------------------------------- | --------------------------------------------------- |
| August Bebel     | `asset-wiki-topic-august-bebel`         | Organizou o SPD como partido de massas.             |
| Eduard Bernstein | `marxism-asset-person-eduard-bernstein` | Formulou a revisão reformista do marxismo.          |
| Jean Jaurès      | `asset-wiki-topic-jean-jaures`          | Ligou socialismo e república parlamentar na França. |
| Olof Palme       | `asset-wiki-topic-olof-palme`           | Símbolo do Estado de bem-estar nórdico.             |

## Créditos e licenças

A atribuição, a licença e o link do arquivo aparecem em “Imagens: créditos e critério” (ou “Imagens: créditos”, no fallback), recolhido logo abaixo das imagens. O mesmo asset continua no registro de licença do atlas e na ficha de contexto do verbete. A publicação de um novo release continua sendo decisão humana.
