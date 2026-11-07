# Checklist de leitura contínua

## Antes de escrever

- [ ] O assunto passou no teste dos cinco nós e no critério de seleção.
- [ ] O tipo (`ideologia`, `pessoa`, `acontecimento`, `instituição`, `período`, `conceito`) está justificado.
- [ ] O recorte histórico-geográfico diz o que fica de fora.
- [ ] Há fontes acadêmicas para "Situar" e "Avaliar".
- [ ] O caso brasileiro tem fonte e acrescenta algo.
- [ ] As entidades já existem no grafo ou serão criadas por ingestão, sem duplicar QID.

## Por capítulo

- [ ] `question` responde a uma dúvida real.
- [ ] Cada afirmação nova tem fonte, localizador, natureza e confiança.
- [ ] `sourceIds` e `entityIds` resolvem.
- [ ] Sem fonte: `coverage: pending` + `gap`; incompleto: `partial` + `gap`.
- [ ] "Situar" tem tese de periodização, não só datas.
- [ ] "Avaliar" tem defesa, crítica, resposta e limites, ou declara a ausência.
- [ ] Nenhum conceito reapresentado em cinco capítulos.

## Conexões

- [ ] 3 a 5 conexões, cada uma com razão argumentativa.
- [ ] Nenhuma conexão para rascunho.
- [ ] Nenhuma conexão para a própria leitura.
- [ ] Razões históricas têm fonte no capítulo `conexoes` ou no grafo.
- [ ] `connectionsOf()` renderiza exatamente o que o dado declara.

## Antes de promover

- [ ] `npm run content:build`, `npm test`, `npm run lint`, `npm run typecheck`.
- [ ] `npm run build` e e2e de páginas/leitura.
- [ ] Revisão visual em desktop e mobile; teclado e reduced motion.
- [ ] Revisão humana registrada com pessoa e data, ou estado pendente visível.
- [ ] Aprovação explícita para incluir em `published-ideologies.ts` e nas rotas.
- [ ] Nada publicado em `master` sem pedido explícito.

## Relatório final

Liste:

- o que foi criado e o que ficou pendente;
- fontes lidas diretamente e fontes secundárias;
- lacunas por capítulo;
- conexões propostas e por quê;
- o que precisa de revisão humana.
