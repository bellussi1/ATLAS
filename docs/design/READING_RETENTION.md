# Leitura e retenção nas páginas de ideologia

Estudo curto que orienta como uma página de ideologia do ATLAS deve ensinar. Cada princípio vira um componente ou uma regra de dados que funciona para qualquer tradição, sem texto escrito à mão por página além do que o contrato de 12 capítulos já exige. Os números de eficácia não são citados aqui; quem quiser os tamanhos de efeito deve consultar as fontes.

## Fontes

- Dunlosky, J.; Rawson, K. A.; Marsh, E. J.; Nathan, M. J.; Willingham, D. T. (2013). _Improving Students' Learning With Effective Learning Techniques_. Psychological Science in the Public Interest, 14(1), 4–58. Classifica prática de recuperação e prática distribuída como de alta utilidade; interrogação elaborativa e autoexplicação como de utilidade moderada; resumo e sublinhado como de baixa utilidade.
- Roediger, H. L.; Karpicke, J. D. (2006). _Test-Enhanced Learning_. Psychological Science, 17(3), 249–255. Testar a memória melhora a retenção tardia mais do que reler.
- Sweller, J. (1988). _Cognitive Load During Problem Solving_. Cognitive Science, 12(2), 257–285; Sweller, J.; van Merriënboer, J.; Paas, F. (1998, 2019) sobre carga intrínseca, estranha e pertinente.
- Mayer, R. E. (2009/2020). _Multimedia Learning_. Cambridge University Press. Princípios de multimídia, coerência, sinalização, contiguidade espacial, segmentação e pré-treino.
- Paivio, A. (1986). _Mental Representations: A Dual Coding Approach_. Oxford University Press.
- Cepeda, N. J. et al. (2006). _Distributed Practice in Verbal Recall Tasks_. Psychological Bulletin, 132(3), 354–380.
- Loewenstein, G. (1994). _The Psychology of Curiosity_. Psychological Bulletin, 116(1), 75–98. Lacuna de informação como motor da curiosidade.
- Nesbit, J. C.; Adesope, O. O. (2006). _Learning With Concept and Knowledge Maps_. Review of Educational Research, 76(3), 413–448.
- Alfieri, L.; Nokes-Malach, T. J.; Schunn, C. D. (2013). _Learning Through Case Comparisons_. Educational Psychologist, 48(2), 87–113.

## Princípios e como viram ATLAS

| Princípio                          | O que a pesquisa diz                                                                                                 | Componente ou regra automatizável                                                                                                                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Perguntas-guia e curiosidade       | Uma lacuna explícita de informação motiva a leitura (Loewenstein).                                                   | `chapter.question` é obrigatório nos capítulos com cobertura; o validador avisa quando falta. A pergunta aparece antes do texto e volta na revisão do fim do capítulo.                             |
| Chunking e carga cognitiva         | Memória de trabalho é limitada; reduzir carga estranha, segmentar a carga intrínseca (Sweller; Mayer, segmentação).  | Parágrafos curtos em `narrative`; cada capítulo tem um bloco interativo principal. Listas longas de registros nunca entram abertas no texto: vão para carrosséis e para a seção Explorar.          |
| Progressive disclosure             | Mostrar primeiro o essencial e deixar o detalhe a pedido (Mayer, pré-treino e coerência).                            | Palavra-chave: hover/foco mostra o resumo do registro; clique abre a folha; a folha leva a relações. Argumentos densos ficam em `details`.                                                         |
| Prática de recuperação             | Lembrar ativamente melhora a retenção tardia (Roediger & Karpicke; Dunlosky).                                        | Ao fim do capítulo, "Antes de continuar": uma pergunta gerada do grafo (ex.: "Que obra liga X a Y?") com resposta revelada sob demanda. Gerada de relações documentadas, nunca de texto inventado. |
| Repetição espaçada entre capítulos | Rever o mesmo conteúdo em intervalos supera a revisão concentrada (Cepeda et al.).                                   | A revisão de um capítulo retoma registros citados dois capítulos antes (`reviewEntities`, calculado pela ordem de aparição dos termos).                                                            |
| Elaboração (por que e como)        | Interrogação elaborativa e autoexplicação ajudam a integrar ideias (Dunlosky).                                       | Cada relação do grafo carrega `context`; a folha mostra "por que esta ligação importa" com fonte. A cadeia de relações em Explorar pede ao leitor seguir um "como".                                |
| Exemplos concretos                 | Ideias abstratas se fixam melhor ligadas a casos.                                                                    | Capítulo `experiencias` puxa registros do tipo evento, partido e regime; o card mostra período e lugar.                                                                                            |
| Dual coding                        | Palavra mais imagem ou diagrama, lado a lado, ajuda mais do que só texto (Paivio; Mayer, multimídia e contiguidade). | Cards com ícone vetorial por tipo e imagem licenciada (`entityMedia`) quando houver; diagrama só quando a relação tem fonte. Legenda junto da imagem, nunca longe dela.                            |
| Mapa de conceitos e sinalização    | Mapas ajudam a organizar relações; sinais destacam a estrutura (Nesbit & Adesope; Mayer, sinalização).               | Índice de 12 capítulos agrupado em Entender, Situar e Avaliar; mapa da abertura; rótulo de tipo redundante à cor em todo termo e card.                                                             |
| Linha do tempo como âncora         | Datas dão estrutura de recuperação e evitam anacronismo.                                                             | Filtro de época em Explorar e `timeline` nos capítulos `epocas`; período obrigatório em pessoas, obras e eventos quando conhecido.                                                                 |
| Contraste entre posições           | Comparar casos ajuda a abstrair o princípio comum (Alfieri et al.).                                                  | Capítulo `debates` usa defender, criticar, responder e limitar; relações `critica`/`responde` geram pares automaticamente.                                                                         |
| Resumo e revisão no fim            | Resumo feito pelo leitor ajuda pouco sozinho (Dunlosky); combinar com recuperação.                                   | O fim de capítulo junta a pergunta-guia, a pergunta de recuperação e "o que você viu": termos do capítulo como fichas que abrem as folhas.                                                         |

## Regras para mais de 80 ideologias

1. A página não ganha componente novo por ideologia. Seções e ordem saem dos tipos de registro e relações do grafo (`utils/page-sections.ts`).
2. Todo texto de apoio didático é derivado do grafo ou do `page.json` validado por Zod: perguntas de recuperação vêm de relações com fonte, nunca de geração livre.
3. Capítulo sem dados suficientes mostra `coverage: "pending"` com motivo, não um exercício vazio.
4. Interação didática nunca é a única via de acesso: o resumo, a resposta e a fonte estão acessíveis por teclado e leitor de tela.
5. Motion só sinaliza mudança de estado e respeita `prefers-reduced-motion`.
