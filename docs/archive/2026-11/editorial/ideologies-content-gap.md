# Lacunas editoriais: Marxismo e Liberalismo (Prompt 02)

Data: 02/11/2026. Base: contrato de 12 capítulos ([proposta](../../../research/ideologies-section-contract-proposal.md)) e conteúdo em `src/content/ideologies/*/page.json`. Revisão por agente de IA; **sem revisão humana**. Metadados importados de Wikidata e Commons (capítulo `conexoes`) não contam como narrativa avaliada.

## Matriz seção × pergunta × lacuna

Níveis: I = iniciante, M = intermediário, A = avançado. Prioridade: P1 alta, P2 média, P3 baixa.

| Seção | Pergunta do iniciante | Marxismo | Liberalismo | Lacuna principal | P |
|---|---|---|---|---|---|
| introducao | Do que estamos falando? | Definição e recorte (SEP Marx) | Definição e recorte (SEP Liberalism) | Nenhuma definição progressiva I→M | P3 |
| origens | Onde surgiu? | Mundo industrial; Smith, Manifesto | Locke, Montesquieu, Smith | Antecedentes não europeus ausentes nas duas | P2 |
| principios | No que acredita? | 3 perguntas (história, valor, reforma) | 3 compromissos (consentimento, poderes, dano) | Sem quadro de divergências internas por princípio | P2 |
| conceitos | Que palavras entender? | Materialismo histórico, trabalho socialmente necessário, argumento Smith × Marx | Mercado, maioria, duas liberdades | Sem glossário progressivo; "propriedade" e "Estado" sem definição explícita | P2 |
| epocas | Como mudou? | Timeline + 6 épocas (parcial) | 5 épocas (parcial) | Periodização eurocêntrica nas duas; América Latina/Brasil, Ásia e África sem bibliografia | P1 |
| pensadores | Quem formulou? | 14 nomes: Marx, Engels, Lenin, Luxemburg, Bernstein, Kautsky, Gramsci, Trotsky, Stalin, Mao, Caio Prado Jr., Prestes, Florestan, Mariátegui | Locke, Montesquieu, Smith, Tocqueville, Mill, Berlin, Hayek | Liberalismo: faltam Constant, Rawls, Keynes (social), autores brasileiros (Rui Barbosa, Nabuco). Marxismo: faltam escolas pós-1945 (Escola de Frankfurt, Althusser) | P2 |
| vertentes | Todos concordam? | Grafo + correntes (parcial) | 3 liberalismos (clássico, social, neoliberal) | Marxismo: genealogia de leninismos e ocidentais pendente. Liberalismo: libertarianismo e liberalismo igualitário só citados | P2 |
| experiencias | Onde foi tentado? | Lugares, sem avaliação de regimes (parcial) | Lugares, sem experiências nacionais (parcial) | Nenhuma avalia experiências de governo; exige fontes por caso | P1 |
| debates | Quais objeções? | 2 quadros completos (reforma; Estado) + críticas externas (parcial) | **Novo:** 1 quadro (liberdade negativa × positiva) + 4 críticas sem resposta (parcial) | Liberalismo: respostas a Burke, Marx, Polanyi, comunitaristas. Marxismo: críticas liberais (Hayek, Popper) e autocrítica sobre regimes | P1 |
| conexoes | Com o que dialoga? | Acervo de descoberta (parcial) | Acervo de descoberta (parcial) | Relações tipadas entre tradições, com fonte | P2 |
| leituras | O que ler depois? | Roteiro por nível | Roteiro por nível | Edições brasileiras não verificadas | P3 |
| fontes | Como confiar? | Fontes e método | Fontes e método | Localizadores (página ou seção) faltam em várias fontes primárias | P3 |

## Redundâncias e inconsistências

- **Status de cobertura:** havia capítulos com lacuna declarada em `gap` mas marcados como completos (Marxismo `vertentes` e `debates`; Liberalismo `epocas`). **Corrigido:** passaram a `partial`.
- **Debate assimétrico:** o Marxismo tinha quadro estruturado e o Liberalismo só cards de crítica. **Corrigido em parte:** o Liberalismo ganhou um quadro.
- **Profundidade desigual em pensadores:** 14 nomes no Marxismo (4 latino-americanos) e 7 no Liberalismo, sem autores brasileiros liberais. Pendente.
- Crítica de Marx ao liberalismo (`lib-critic-marx`) e o debate Smith × Marx (Marxismo `conceitos`) tratam temas vizinhos sem referência cruzada. Proposta: link contextual, não duplicação.

## Narrativas alternativas

**Liberalismo**
1. _Cronológica_ (Locke → Mill → Hayek): fácil para iniciantes, mas sugere progresso linear e esconde a ruptura entre liberalismo clássico e social.
2. _Por problema_ (poder, mercado, maioria, liberdade): mostra que "liberdade" muda de sentido, mas exige mais contexto do leitor.
   **Recomendada:** por problema, com épocas como apoio. É a estrutura atual de `principios` e `conceitos`.

**Marxismo**
1. _Doutrinária_ (Marx como sistema fechado): simples, mas trata como doutrina única uma tradição plural.
2. _Tradição em disputa_ (perguntas de Marx → divergências → experiências): reflete a historiografia (Kolakowski, Hobsbawm), mas exige mais conteúdo atribuído.
   **Recomendada:** tradição em disputa, enquadramento já adotado na introdução.

## Recorte implementado neste prompt

1. **Quadro de debate no Liberalismo:** "Liberdade negativa ou positiva", em defesa → crítica → resposta → limites, com todas as posições atribuídas.
2. **Status de cobertura coerente nas duas páginas:** todo capítulo com lacuna declarada aparece como "Cobertura parcial".

### Registro das afirmações novas

| Afirmação | Fonte e localizador | Natureza | Confiança |
|---|---|---|---|
| Berlin distingue a área de não interferência de quem controla a ação, e vê risco no "eu superior" | Carter, SEP "Positive and Negative Liberty", §1–2; Berlin, _Two Concepts of Liberty_ (1958) | tese atribuída | alta |
| O contexto da Guerra Fria informa o alerta de Berlin | SEP §2 | interpretação registrada | média |
| Taylor contrapõe conceito de oportunidade a conceito de exercício (1979) | SEP §8 | interpretação atribuída | alta |
| MacCallum: liberdade é relação triádica; negativos e positivos interpretam suas variáveis | SEP §5 | interpretação atribuída | alta |
| Nelson (2005): autores "positivos" também definiam liberdade como ausência de restrições | SEP §8 | interpretação atribuída | média |
| O republicanismo (Pettit, Skinner) define liberdade como não dominação; seu estatuto de terceiro conceito segue em aberto | SEP §4 | controvérsia | alta |

Fonte consultada em 02/11/2026: https://plato.stanford.edu/entries/liberty-positive-negative/. O texto de Taylor não foi lido diretamente; a crítica foi reconstruída a partir da SEP e declarada como tal. Não foi incluída réplica de Berlin a Taylor.

## Bibliografia comentada para as próximas lacunas (não verificada nesta etapa)

Itens a conferir antes do uso. Não citados no site:

- SEP, "Karl Marx" (Wolff & Leopold): base para críticas liberais e respostas sobre a teoria do valor (P1 debates do Marxismo).
- SEP, "Liberalism" (Gaus, Courtland, Schmidtz): seções sobre liberalismo clássico e "novo", para respostas às críticas de Polanyi e comunitaristas.
- Hobsbawm, _How to Change the World_ (2011), já registrado: base para periodização não europeia.
- Liberalismo no Brasil: bibliografia acadêmica a pesquisar (ex.: estudos sobre Rui Barbosa e Joaquim Nabuco). Nenhuma obra específica foi verificada.

## Verificações

Schema Zod (`ideology-page.schema.ts`), IDs de fontes e entidades resolvidos por `validateIdeologyDossier`, testes unitários, `content:build` e E2E. Ver o commit deste prompt.
