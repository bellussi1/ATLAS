# Redesign V4 — implementação e verificação

Implementação de 01/11/2026, na branch `codex/atlas-v4`. Referências: os dois arquivos V4 enviados pelo usuário; as três composições em `referencias`; a skill de identidade versionada. O HTML enviado é uma demonstração: seus dados ilustrativos não foram incorporados como história validada.

## O que mudou

- `/ideologias`: entrada com duas tradições realmente disponíveis, seleção contextual e ligação de descoberta explicitamente rotulada.
- `/ideologias/marxismo`: oito capítulos no scroll nativo, estimativas de leitura, índice, capítulo atual, progresso, ponto anterior, fontes próximas e visualização de polêmicas acompanhada de tabela.
- Documentos, conceitos e pensadores expandem no lugar. Cronologia tem filtro temporal e lista semântica. Bibliografia é filtrável. A comparação Smith–Marx, prévias CDK e exercício existentes foram reutilizados.
- Seleção de autor, documento, conceito, relação, período, bibliografia e tese é compartilhável por query params; capítulos usam fragmentos. Interações usam `scroll: 'manual'`; âncoras continuam com scroll nativo. O título da rota é resolvido novamente sem perder o nome do tema.
- Identidade V4 nos tokens de papel, tinta e cores secundárias, tempos de 120/240/480 ms e curva do briefing. Marca e fontes locais preservadas, sem novas dependências nem fontes remotas.
- Controle manual e preferência do sistema para movimento reduzido. Links editoriais distinguíveis por sublinhado. Retratos passam pelo registro de licença; créditos aparecem no contexto.

## Arquitetura e auditoria

O grafo original tem 223.843 bytes. Antes do redesign, o índice de Marxismo embutia o explorador do Liberalismo e a discussão de valor; esta também tinha URL própria. O Liberalismo oferece rede, tempo e imagens. Os verbetes e os exploradores genéricos permanecem como aprofundamento.

`ideology-page-schema.ts` separa apresentação dos fatos: capítulos referenciam entidades estáveis do grafo e fontes. O suplemento `src/content/graph/marxismo.json` contém três fontes e três relações novas, com tipo, contexto e certeza. Zod valida estrutura, referências, âncoras, retrato e identificação de revisão. O `ContentRepository` carrega os dois assets locais no browser e imports no prerender; TransferState preserva o conteúdo durante a hidratação e evita apagar a narrativa para refazê-la após uma requisição.

O grafo legado não foi reescrito nem repartido integralmente: outras telas ainda dependem dele. Os novos snapshots de apresentação e relações já estão particionados. Esse compromisso evita alterar todos os consumidores na primeira migração, mas mantém o custo do grafo e seus validadores no JavaScript inicial.

`IdeologyBlockComponent` usa uma união tipada para entidades, cronologia, relações, referências e o debate existente. Não se criou uma biblioteca genérica para blocos ainda sem dados. O renderer de capítulos aceita os exemplos de Liberalismo, Social-democracia e Anarquismo em `src/content/ideologies/examples`; os exemplos têm blocos mínimos, são validados pelos testes e não são publicados nem prerenderizados. Liberalismo referencia seu próprio atlas; os outros esqueletos não contêm afirmações históricas.

## Migração de URLs e hospedagem

O roteador redireciona `/atlas/marxismo` para a leitura contínua e `/atlas/marxismo/valor-e-trabalho` para `#conceitos`, preservando queries e fragmentos aplicáveis. `/atlas/liberalismos` e `/verbete/:slug` preservam conteúdo, formato e canônicos próprios. Não se redireciona um verbete para uma ideologia sem equivalência semântica.

O prerender Angular produz meta refresh que perde as queries do visitante. Por isso o pós-build substitui somente os dois HTMLs antigos pelo shell CSR: o roteador executa a migração com o endereço real. `public/_redirects` fornece regras 301 para hospedagens que aceitam esse formato, com preservação de query pela hospedagem. Em outro provedor, configurar o equivalente preservando a query original e usando `#conceitos` para o debate. Nenhuma configuração foi publicada remotamente.

## Classificação e limites editoriais

Marxismo é apresentado como **tradição político-intelectual** heterogênea. Liberalismo permanece uma família de tradições no hub. Os outros nomes do briefing são uma lista ilustrativa: não foram transformados em páginas nem receberam classificação histórica sem pesquisa específica.

Relações novas: Luxemburg critica Bernstein em *Reforma ou revolução*, introdução; Lenin critica Kautsky em *O Estado e a revolução*, capítulo VI; Marx critica definições de valor em Smith em *Teorias da mais-valia*, capítulo 3 (fonte já existente). A certeza “estabelecida” refere-se à existência da crítica documentada, não à correção de seu julgamento. Os argumentos são atribuídos aos autores.

Fontes consultadas: [Stanford Encyclopedia of Philosophy, Karl Marx](https://plato.stanford.edu/entries/marx/), [Luxemburg, introdução](https://www.marxists.org/archive/luxemburg/1900/reform-revolution/intro.htm), [Lenin, capítulo VI](https://www.marxists.org/archive/lenin/works/1917/staterev/ch06.htm). Foram produzidas paráfrases curtas e próprias, sem reproduzir os capítulos. Os registros Wikimedia preexistentes preservam atribuição e estado pendente. Nenhum conteúdo ganhou revisão humana fictícia.

A genealogia completa das correntes, avaliação de regimes e experiências nacionais, autocríticas históricas e recepção brasileira ainda não têm cobertura suficiente. Essas lacunas estão explícitas nos capítulos. O resultado é uma primeira leitura com fontes e limitações, não uma história exaustiva do marxismo. Não há mapa histórico fabricado nem mídia nova sem licença.

## Skills e ferramentas

Aplicadas: `superpowers:using-superpowers`, `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:executing-plans`, `superpowers:test-driven-development`, `superpowers:systematic-debugging`, `superpowers:requesting-code-review`, `superpowers:verification-before-completion`, `atlas-editorial-geometrico`, `frontend-design`, `angular-developer`, `interaction-design`, `animate`, `playwright`, `skill-creator` e `superpowers:writing-skills` nas partes pertinentes. O pedido já autorizava execução; decisões e plano foram registrados sem uma nova rodada de aprovação. Usou-se uma branch no checkout limpo existente. A revisão independente foi somente leitura; implementação permaneceu nesta sessão.

A skill própria recebeu orientação curta do V4 e tokens atuais; foi sincronizada com a instalação local. Não houve modificação de skills genéricas de terceiros. O plugin OpenAI Developers foi consultado para pertinência; não há integração OpenAI/IA a implementar neste escopo.

GitHub e Linear foram usados somente em consultas: buscas sem resultados; `get_agent_context` do Linear retornou ferramenta indisponível. Nenhum issue, comentário, PR, push, merge ou deploy foi criado.

## Evidências

Capturas antes/depois e medidas estão em `docs/auditoria-v4/`. `metrics.json` descreve o ambiente e mantém valores brutos. Os testes cobrem redirects, queries, oito capítulos, âncoras e foco, ponto anterior, expansão sem deslocamento, reload de contexto, cronologia, tabela de relações, prévias e retorno de foco, retorno de fontes, exercício, bibliografia vazia, toque e movimento reduzido. Há testes de erro, retry, referência inválida e exclusão de páginas não publicadas.

Resultados observados: Node 24.13.0, npm 11.6.2. `npm run build` passou (79 rotas prerenderizadas); `npm run lint` passou (ESLint, Biome e Prettier, sem avisos na última execução); `npm run typecheck` passou; `npm test` passou (175 testes, 19 arquivos); `npm run test:e2e -- --workers=2` passou (23 testes). `npm run check:links` verificou links e âncoras de 80 arquivos HTML estáticos. `git diff --check` não apontou problemas de whitespace.

Axe não encontrou violações graves/críticas na leitura V4 auditada. Foram exercitados 320, 390, 768 e 1440 px, toque, teclado, preferência do sistema e controle manual de movimento reduzido. A verificação adicional de texto a 200% em 390 px e de paisagem 568 × 320 terminou sem overflow horizontal de página; a tabela tem sua própria região de rolagem com teclado. Não é uma declaração de conformidade WCAG integral.

Medição reproduzível: iniciar `npm run preview` depois do build e executar `node scripts/measure-v4.mjs`. A prévia deve ser reiniciada depois de cada build porque lê os hashes CSP na inicialização. Os valores são uma execução local de Chromium, sem throttling, com interações roteirizadas e outros testes locais em paralelo: não representam percentis de usuários reais.

| Medida | Desktop 1440 × 1000 | Mobile 390 × 844 |
| --- | --- | --- |
| LCP de laboratório | 372 ms | 244 ms |
| Maior interação amostrada (candidato INP, Event Timing) | 24 ms | 32 ms |
| CLS, maior janela observada | 0,014 | 0,022 |
| JS carregado inicialmente, gzip calculado | 270.757 bytes | 270.757 bytes |

O bundle inicial reportado pelo Angular é 357,8 KB raw, ~101 KB de transferência estimada, **sem** somar os chunks lazy efetivamente carregados pela rota. A medição da rota inclui esses chunks: ~264,4 KiB gzip, 16 arquivos, ~1,13 MB raw. Portanto a proposta de ~200 KB gzip ainda **não foi atingida**. O grafo compartilhado e os validadores continuam carregados por consumidores legados. Otimizar essa camada é uma etapa posterior de performance com impacto transversal; não se declarou a meta cumprida nem se alteraram silenciosamente os limites do projeto.

O salto de hidratação observado antes de TransferState era ~0,18 no desktop; a versão final mediu ~0,014. A revisão independente encontrou perda de scroll e título durante navegação interna; ambas foram corrigidas, e a revisão final não apontou novos defeitos acionáveis. As capturas antes/depois estão neste diretório de auditoria e não substituem os testes.

### Arquivos por responsabilidade

- Contrato e carregamento: `src/app/core/ideology-page-schema.ts`, `content-repository.ts`, `discovery-index.ts` e respectivos testes.
- Interface: `src/app/pages/ideology-page.*`, `ideologies-hub.ts`, `src/app/shared/ideology-block.*`; comparação existente em `marx-atlas-page.ts/.scss`.
- Integração: rotas cliente/servidor, shell/app, home, retorno de verbete/fontes, `src/styles.scss`, `scripts/security-headers.mjs` e `public/_redirects`.
- Conteúdo: `src/content/ideologies` e `src/content/graph/marxismo.json`.
- Evidência e continuidade: testes unitários e e2e, `scripts/measure-v4.mjs`, este relatório, padrão de páginas, plano/spec, capturas e skill de identidade/AGENTS.

Nenhum push, deploy ou alteração em GitHub/Linear foi realizado.
