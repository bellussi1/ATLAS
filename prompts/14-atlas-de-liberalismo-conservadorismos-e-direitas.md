# PROMPT 14 — Atlas exploratório do liberalismo

## Missão

Implemente no ATLAS o primeiro núcleo funcional do **Atlas do Liberalismo** como experiência hipertextual e visual de descoberta. O módulo deve oferecer uma rede de entidades navegável, conectada ao modelo comum do projeto, e não apenas um artigo demonstrativo ou conteúdo manual isolado.

Use três camadas complementares:

- **Wikipedia** para descoberta de tópicos, contexto e links internos;
- **Wikidata** para identificadores, descrições estruturadas e relações de entidades;
- **Wikimedia Commons** para imagens e documentos com metadados de uso registrados.

Trate o conteúdo ingerido como dados editoriais com procedência. Não copie texto de forma cega, não apresente links enciclopédicos como relações historiográficas validadas e não atribua revisão humana inexistente.

## Escopo inicial obrigatório

Ingerir a entidade raiz **Liberalismo** e uma primeira rede relacionada contendo, no mínimo:

- John Locke;
- Adam Smith;
- John Stuart Mill;
- Montesquieu;
- Alexis de Tocqueville;
- Friedrich Hayek;
- Isaiah Berlin;
- Liberalismo clássico;
- Liberalismo social (incluindo o rótulo `social liberalism` quando usado pelas fontes);
- Neoliberalismo;
- Revolução Gloriosa;
- Revolução Americana;
- Revolução Francesa.

Não crie duplicatas de entidades existentes. Inspecione primeiro o acervo e reutilize IDs, slugs, aliases, fontes e relações já presentes. Para cada registro, armazene, quando disponível:

- título, tipo, resumo curto e descrição;
- imagem principal vinculada ao registro de mídia licenciado;
- links internos relevantes, distinguindo links enciclopédicos de relações tipadas;
- identificadores da página Wikipedia e da entidade Wikidata;
- categorias principais;
- datas e períodos relevantes, com precisão e incerteza preservadas;
- relações mapeadas ou inferidas, com evidência e nível editorial;
- fontes, procedência, data de coleta e status editorial.

Quando um campo não estiver disponível ou não for verificável, represente sua ausência; não complete lacunas por plausibilidade.

## Ingestão, modelo comum e atualização

- Preserve Angular 21, standalone components, Signals, Angular Router, TypeScript strict, schemas Zod e arquitetura static-first/prerender existente. Não introduza outra stack nem duplique o grafo, índice de busca, previews ou timeline comuns.
- Implemente ingestão reproduzível em uma etapa de desenvolvimento/build que gere um snapshot local versionado ou um artefato de conteúdo equivalente. A experiência pública deve continuar funcional sem depender de chamadas a APIs externas em tempo de navegação.
- Registre a procedência de cada dado: serviço e URL de origem, identificador original, data de coleta e, quando aplicável, campo/afirmação de origem. Mantenha atribuições e licenças da Wikimedia conforme os termos aplicáveis.
- Normalize entidades e relações nos schemas e contratos compartilhados do ATLAS. Amplie o modelo comum somente quando necessário, mantendo validação de IDs, slugs e referências. Não crie um segundo modelo exclusivo e incompatível para este atlas.
- Use identificadores Wikidata para reconciliar entidades. A associação de um item Wikidata a um registro local deve ser explícita e verificável; não use correspondência aproximada de título como identidade confirmada.
- Registre links internos da Wikipedia como conexões de descoberta, com sua procedência e status editorial próprios. Eles não são, por si, influência, causalidade, participação ou qualquer outra relação historiográfica.
- Não marque conteúdo automaticamente como revisado, verificado, aprovado ou publicável. Diferencie claramente rascunho, dado importado, relação inferida, fonte incompleta e revisão humana pendente.

## Relações tipadas

O modelo compartilhado deve comportar relações tipadas, incluindo quando sustentadas por evidência:

`influenced`, `influenced_by`, `associated_with`, `related_to`, `reacted_against`, `developed_into`, `participated_in`, `wrote`, `authored` e `event_influenced_ideology`.

Cada relação deve registrar direção, entidades de origem/destino, rótulos de ida e volta, contexto, período quando conhecido, evidências/fontes, procedência, incerteza e status editorial. Garanta consistência entre relações inversas quando o modelo as materializar.

Não invente relações. Use `related_to` ou um vínculo de descoberta enciclopédica somente quando isso descrever honestamente a evidência disponível; identifique explicitamente conexões baseadas apenas em navegação/categorização da Wikipedia e não as exiba como validação historiográfica.

## Wikimedia Commons e direitos de mídia

Crie ou reutilize a camada compartilhada de mídia. Para cada ativo exibido, registre:

- URL do arquivo e título/nome do arquivo;
- autor/criador, quando informado;
- licença e URL/identificador da licença;
- link da página do arquivo no Commons;
- texto de atribuição exigido ou gerado a partir dos metadados;
- procedência e data de coleta.

Só exiba ativos cuja licença e atribuição estejam registradas. Se não houver metadados suficientes, mostre fallback textual sem reproduzir a imagem. Não trate a disponibilidade no Commons como licença universal nem remova avisos de restrição.

## Experiência exploratória

Transforme a rota real `/atlas/liberalismos` numa Wikipédia interativa e visual, integrada aos componentes e contratos existentes. Implemente:

- cards/fichas de entidades com título, tipo, resumo e estado editorial;
- painel contextual lateral ou adaptado ao mobile, com detalhes, fontes e ações de navegação;
- preview ao passar o mouse **e ao focar**, com comportamento equivalente acionável por toque/teclado;
- grafo clicável que permita selecionar e abrir entidades, destaque conexões da seleção e exponha uma alternativa textual estruturada;
- timeline funcional para eventos e pensadores, com seleção e contexto, sem sugerir precisão inexistente;
- galeria de imagens/documentos que apresente autoria, licença, atribuição e página do arquivo;
- navegação contextual de ida e volta, preservando a entidade/ponto de origem;
- chips com tipo de relação, direção e estado editorial;
- links internos que abram contexto antes de navegar quando isso facilitar a exploração.

As entidades devem ter destinos locais reais ou um detalhe contextual funcional dentro do módulo. Evite links que aparentem navegação sem saída. Inclua estados de carregamento, vazio, falha, dado ausente, fonte incompleta e conteúdo em revisão, conforme aplicável.

## Movimento e acessibilidade

Implemente motion discreto e funcional para abrir fichas, destacar conexões, mudar o foco do grafo, expandir mídia, alternar contexto/detalhe e retornar à navegação anterior. Movimento deve responder à ação da pessoa, ser interrompível e respeitar `prefers-reduced-motion`; não use animação decorativa contínua nem scroll hijacking.

Garanta uso por teclado, foco visível, semântica e labels adequados, alternativa textual para grafo/timeline, contraste suficiente e navegação funcional em mobile. Hover nunca pode ser o único meio de acessar informação. Não alegue conformidade WCAG integral sem auditoria completa.

## Testes e verificação

Adicione testes específicos para a rota e para o comportamento observável do módulo, cobrindo:

1. carregamento e validação do snapshot do atlas;
2. presença das entidades mínimas e dos identificadores/procedências disponíveis;
3. navegação entre entidades e retorno contextual;
4. abertura/fechamento de previews e painéis;
5. seleção e funcionamento do grafo;
6. seleção e funcionamento básico da timeline;
7. mídia exibida somente com metadados de licença e atribuição;
8. tratamento de dados ausentes e status de revisão.

Execute verificações pertinentes do repositório: testes unitários, testes de rota/E2E aplicáveis, lint, typecheck e build estático/prerender. Corrija falhas causadas pela mudança e repita os comandos que falharem. Não declare aprovação sem executar o comando correspondente.

Capture screenshots verificáveis da rota em viewport desktop e mobile e inspecione o resultado visual. Inclua os arquivos de captura no local de artefatos usado pelo projeto, sem adicionar imagens temporárias ao conteúdo público.

## Contrato de execução

- Inspecione `AGENTS.md`, `git status`, rotas, schemas, grafo compartilhado, conteúdo existente, mídia, componentes e testes antes de editar. Preserve alterações locais preexistentes.
- Faça implementação real no repositório Angular e mantenha o escopo deste prompt. Não avance ao próximo prompt, não faça push ou deploy.
- Consulte as skills `atlas-editorial-geometrico` e as skills `atlas-` de interface/motion pertinentes. Preserve a identidade editorial aprovada, acessibilidade e integridade histórica.
- Use fontes e APIs primárias para os metadados de Wikidata/Wikipedia/Commons; para relações historiográficas, registre evidência adequada e não confunda uma fonte enciclopédica de descoberta com validação suficiente.
- Não copie trechos extensos, invente fatos, datas, URLs, licenças, atribuições ou revisão humana. Distinga claramente conteúdo importado, inferência e afirmação editorial.
- Revise o diff contra cada requisito. Ao concluir este prompt numerado, crie um único commit local, atômico e limitado a este prompt. Não inclua mudanças alheias.

## Critérios objetivos de aceite

Esta etapa só está concluída quando houver evidência verificável de que:

1. as entidades mínimas reais foram integradas ao modelo comum, com IDs e procedência disponíveis;
2. há relações tipadas, direcionais e editorialmente qualificadas, sem relações inventadas;
3. toda mídia exibida contém licença, autoria quando disponível e atribuição registradas;
4. grafo e timeline são funcionais e acessíveis, incluindo alternativas textuais;
5. existe navegação hipertextual de ida, contexto/detalhe e retorno;
6. a rota oferece experiência visual exploratória em desktop e mobile;
7. os testes específicos passam;
8. lint, typecheck e build passam;
9. screenshots desktop e mobile foram capturadas e revisadas;
10. o diff foi revisado e o commit local atômico foi criado.

Ao finalizar, relate arquivos alterados, entidades/relações integradas, fontes e licenças registradas, comandos e resultados observados, caminho das screenshots, commit e limitações restantes. Não execute o próximo prompt automaticamente.
