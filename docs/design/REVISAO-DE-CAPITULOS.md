Status: atual
Última verificação: 08/11/2026

# Revisão dos capítulos

A revisão deixou de ser gerada a partir da primeira relação do grafo que une dois nomes do capítulo. Agora cada capítulo publica uma pergunta editorial, com resposta, critério e fontes; capítulos sem pergunta de qualidade não recebem revisão.

## O que havia

A geração automática produzia, por exemplo:

- “Que relação o capítulo estabelece entre Friedrich Engels e Karl Marx?” em **introdução** e **pensadores** do Marxismo.
- “Que relação o capítulo estabelece entre Marxismo e Socialismo?” em **origens**.
- “Que relação o capítulo estabelece entre O capital: volume I e Tempo de trabalho socialmente necessário?” em **conceitos**.
- “Que relação o capítulo estabelece entre Liberalismo clássico e Liberalismo?” em **épocas** e **vertentes** do Liberalismo.
- “Que relação o capítulo estabelece entre Trotskismo e Leninismo?” em **vertentes** do Marxismo.

Esses enunciados tinham quatro problemas:

1. **Repetição de molde.** A mesma frase aparecia em capítulos diferentes, mudando apenas os nomes.
2. **Resposta no enunciado.** Perguntar “que relação existe entre A e B” quando o capítulo acabou de dizer que A escreveu, criticou ou influenciou B pede reconhecimento, não explicação.
3. **Relação como conteúdo.** O vínculo do grafo podia ser lateral para o argumento do capítulo, embora fosse a primeira relação encontrada.
4. **Revisita sem motivo.** Listas de “dois capítulos atrás” repetiam nomes já vistos, sem dizer o que o leitor deveria perceber ao reencontrá-los.

## O que a revisão pede agora

Cada pergunta é escrita para o capítulo e declara o tipo de raciocínio que propõe. Exemplos das leituras publicadas:

| Capítulo                   | Pergunta                                                                                                                                   | O que exige                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Marxismo, princípios       | “O materialismo histórico reduz a política e as ideias à economia? Justifique.”                                                            | Identificar um pressuposto e recusar a leitura determinista.    |
| Marxismo, pensadores       | “Compare o foco de Lenin, Gramsci e Bernstein: o que cada um desloca na herança de Marx?”                                                  | Comparar interpretações e perceber ênfases distintas.           |
| Liberalismo, conceitos     | “Como a divisão do trabalho produz riqueza e, ao mesmo tempo, dependência e desigualdade em Smith?”                                        | Explicar um mecanismo com efeito ambivalente.                   |
| Liberalismo, debates       | “Por que a crítica de Berlin à liberdade positiva é interna ao liberalismo, e não apenas uma crítica externa?”                             | Examinar uma objeção a partir dos próprios valores liberais.    |
| Anarquismo, experiências   | “O que a Comuna de Paris, a Ucrânia de Makhno e a Espanha de 1936 revelam sobre os limites e as possibilidades da organização anarquista?” | Aplicar o conceito a experiências e reconhecer seus limites.    |
| Social-democracia, debates | “Qual é o núcleo da disputa entre Bernstein e Luxemburgo, e o que ela revela sobre os limites da reforma?”                                 | Reconstruir uma objeção e suas consequências para a estratégia. |

As respostas retomam o argumento do capítulo e as fontes já citadas nele. A pergunta não é um quiz: a resposta fica oculta até o leitor pedir, e não há pontuação nem obrigação de responder.

## Reencontro com o que veio antes

A seção “Retome” agora é editorial e opcional. Cada registro traz a nova conexão a perceber, por exemplo:

- Marxismo, debates: retomar **Eduard Bernstein** para ler a crítica de Luxemburgo como resposta direta à revisão reformista.
- Liberalismo, debates: retomar **John Stuart Mill** para perceber como Berlin reformula o problema da liberdade individual.
- Social-democracia, experiências: retomar as **leis antissocialistas** para comparar a repressão de Bismarck com os modelos de bem-estar do pós-guerra.
- Anarquismo, conexões: retomar **Kropotkin** para contrastar apoio mútuo com as respostas liberal e marxista.

Se não houver uma conexão nova, a revisão não mostra “Retome”. Não há geração automática de registros de dois capítulos antes.

## Contrato de conteúdo

O capítulo em `content/ideologies/<slug>/page.json` aceita `review` opcional:

```json
{
  "question": "O que separa reforma de revolução nesta tradição?",
  "answer": "A estratégia política e o diagnóstico do que pode mudar.",
  "rationale": "Compare estratégias, não apenas nomes.",
  "sourceIds": ["source-existente"],
  "revisit": [
    {
      "entityId": "person-eduard-bernstein",
      "why": "Retome a revisão reformista para localizar a objeção."
    }
  ]
}
```

- `sourceIds` precisa existir e pertencer ao capítulo; a validação recusa fonte externa.
- `revisit[].entityId` precisa existir no grafo e não pode repetir.
- Perguntas repetidas na mesma leitura são recusadas.
- Capítulos sem `review` não mostram a ficha.
- Os capítulos **leituras** e **fontes** ficam sem revisão: são listas de percurso e bibliografia, não argumentos a recuperar.

## Apresentação

A ficha perdeu o título repetido “Revisão do capítulo” e a introdução genérica. O topo agora tem apenas “Revisão” e o critério da pergunta. A resposta revelada traz a formulação e os links das fontes. “Retome” aparece como uma lista compacta de registros anteriores, cada um com a razão do reencontro e a ação “Abrir ficha”.

## Por que avalia melhor

A pergunta antiga podia ser respondida repetindo o nome dos dois registros ou a etiqueta da relação. A pergunta nova exige que o leitor:

- explique um mecanismo;
- compare interpretações;
- identifique um pressuposto;
- reconheça uma consequência;
- examine uma objeção;
- aplique um conceito a um caso histórico.

São operações que mostram compreensão e não apenas reconhecimento. A resposta continua disponível, mas depois do esforço de recuperação.
