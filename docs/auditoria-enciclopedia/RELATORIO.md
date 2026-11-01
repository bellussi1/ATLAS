# Revisão da enciclopédia interativa — 01/11/2026

## Escopo e auditoria

Pedido aplicado inicialmente ao Marxismo, com infraestrutura compartilhada e ajustes de interação no Liberalismo. Permanecem somente home, `/marxismo` e `/liberalismo`; o acervo estático foi preservado. A identidade aprovada, Angular standalone/Signals, componentes existentes e CDK foram reaproveitados, sem dependência nova.

Antes: galerias cresciam dentro da grade, timeline apresentava detalhes sem painel sincronizado, o grafo do Marxismo não tinha seleção operável de nós e o placeholder diferia do conteúdo final. Faltavam hipertexto contextual e blocos tipados para princípios, vertentes e defesa/crítica/resposta/limites. As capturas `*-antes.png` nesta pasta registram timeline e grafo anteriores.

## Entrega e decisões

- Cards de pensadores, princípios, vertentes e argumentos abrem ficha contextual com evidências e relações. CDK cuida de foco, Escape, contenção de rolagem e retorno ao gatilho. Seguir uma conexão inicia o novo contexto no topo; voltar restaura foco e posição interna.
- Termos da narrativa usam vocabulário explícito, sublinhado e pista de abertura; hover/foco oferecem prévia em desktop, e clique/toque abrem o mesmo conteúdo. A primeira ocorrência por termo é interativa, até quatro entidades distintas por trecho, evitando repetir controles em cada palavra. Ênfase estática continua separada da ação.
- Timeline tem trilho selecionável, filtro, progresso e painel dimensional; grafo tem nós clicáveis, realce de relações, filtro, contexto e tabela alternativa. Seleção não recalcula coordenadas.
- Marxismo recebeu três princípios, três recortes de vertentes e dois temas argumentativos com quatro posições cada: defesa, crítica, resposta e limites. Posições são atribuídas e classificadas; ausência de resposta documentada aparece explicitamente. Não são instruções de propaganda nem um inventário completo das correntes.
- Motion acompanha hover/press, termos, seleção, conexões e abertura de contexto, usando os tokens 120/240/480 ms. Teclado e movimento reduzido são imediatos. Não há loops decorativos ou deslocamento de parágrafos durante a leitura.
- Mídia usa ativos locais com licença e dimensões declaradas. Fontes locais principais têm preload e `font-display: optional`; reservar geometria tem prioridade sobre troca tardia de fonte. Grafo leve renderiza diretamente no SSR, sem placeholder de tamanho diferente.
- No Liberalismo, o contexto fica lateral e sticky no desktop, e abre o diálogo compartilhado em telas estreitas. Corrigidos reabertura da seleção atual, expansão de imagem no mobile e geometria dos nós. A organização editorial completa de princípios e debates do Liberalismo ainda depende de conteúdo próprio com fontes; esta etapa valida reutilização da infraestrutura.

## Skill e padrão

Atualizados `.agents/skills/atlas-editorial-geometrico/SKILL.md`, sua referência `references/ideology-interaction.md` e `docs/PAGE_STANDARD.md`. A cópia pessoal da skill em `C:/Users/Bellussi/.codex/skills/atlas-editorial-geometrico` foi sincronizada.

Cinco cenários de aplicação antes/depois, revisados por agente somente de leitura: geometria/CLS, card e viewport, ênfase versus botão, timeline sincronizada e cobertura defesa/crítica/resposta. A revisão inicial encontrou omissões; a revisão posterior confirmou instruções operacionais nos cinco pontos. Isso verifica o contrato escrito, não constitui benchmark estatístico nem garantia de obediência futura. Revisão de código adicional identificou contexto fora de vista, foco/scroll ao seguir conexão, imagem mobile sem ampliação e reabertura da seleção; os achados foram corrigidos.

## Verificação observada

- `npm test`: 100 testes em 19 arquivos aprovados.
- `npm run test:e2e`: 11 cenários de navegação, contexto, retorno, seleção, mídia e mobile. Asserções axe para violações críticas/graves nas três páginas e no Liberalismo; não equivalem a auditoria WCAG integral.
- `npm run build`: três rotas pré-renderizadas, sem avisos de orçamento. Inicial estimado em 91,30 kB transferidos; o chunk compartilhado lazy tem 117,42 kB adicionais. Não foi atingida/verificada uma meta global de 200 kB por rota.
- `npm run lint`, `npm run typecheck`, `npm run check:links` e `git diff --check` executados. O verificador de links informa quatro documentos estáticos porque inclui o fallback de erro; são três rotas editoriais públicas.
- Validador `quick_validate.py` da skill executado em ambiente virtual temporário com PyYAML, sem acrescentar dependência ao projeto. Hashes do arquivo principal e da referência confirmam cópia pessoal sincronizada.
- Detector Impeccable executado uma vez nos componentes alterados: cinco avisos de `<img>` sem `src`. São bindings Angular `[src]` condicionados a ativos licenciados, presentes nos templates; capturas e teste de `naturalWidth` confirmam mídia carregada. Não foram trocados por URLs fixas para satisfazer o detector estático.

Falhas usadas para orientar correções: schema inicialmente rejeitava novos blocos; teste de termo inicialmente não encontrava controles; revisão mobile detectou overflow do grafo; axe detectou contraste insuficiente; JSDOM não oferecia `matchMedia`; teste de reabertura comprovou retorno antecipado indevido. Os cenários foram repetidos após correção. A navegação temporal do teste passou a esperar a âncora e selecionar o evento no trilho temporal, evitando disputar rolagem com o índice lateral.

## Estabilidade e desempenho local

Reprodução: `npm run build`, iniciar `npm run preview` em terminal separado e executar `node scripts/verify-ideology-interactions.mjs`. O preview deve ficar ativo até o fim; não executar junto do servidor e2e na mesma porta 4305. Resultados detalhados e todos os eventos de layout estão em [metrics.json](metrics.json).

Chromium headless local, sem throttling de CPU, uma amostra por condição. Desktop 1440×1000 e mobile 390×844; motion normal e reduzido. Na condição reduzida, imagens/fontes locais receberam atraso artificial de 350 ms.

| Condição | CLS inicial | CLS final por janela | LCP inicial | Maior duração de evento amostrada |
| --- | --- | --- | --- | --- |
| Desktop normal | 0 | 0,00001982 | 464 ms | 56 ms |
| Desktop reduzido + atraso | 0 | 0,00001932 | 412 ms | 48 ms |
| Mobile normal | 0 | 0 | 372 ms | 40 ms |
| Mobile reduzido + atraso | 0 | 0 | 320 ms | 48 ms |

Nos quatro cenários: diferença de scroll e posição do gatilho ao abrir/fechar contexto = 0 px; diferença de altura da timeline/quadro argumentativo e posição do nó na seleção = 0 px; sem overflow horizontal ou erros JavaScript capturados. Liberalismo também sem overflow nas duas larguras. As capturas `*-depois.png`, `contexto-*`, `argumentos-*`, `termo-hover.png` e `liberalismo-*` documentam os estados atuais.

Checagem adicional de overflow em ambas as ideologias: 320×568, 768×1024, paisagem curta 844×390 e 1280×900 com tamanho de fonte raiz em 200%. Nenhuma rolagem horizontal de documento nessas oito amostras; isso não substitui teste de todos os controles em cada breakpoint.

O arquivo registra também shifts após input, excluídos do cálculo CLS pela API. Mudanças de conteúdo dentro de painéis e expansões intencionais podem gerar esses eventos; por isso foram medidos separadamente gatilho, scroll e geometria. A duração de evento amostrada não é INP de campo. Estes resultados não prometem CLS zero universal, desempenho em hardware lento ou cobertura de todos os navegadores.

## Fontes e integridade editorial

Os novos recortes referenciam textos primários identificados e a reconstrução filosófica da Stanford Encyclopedia. Fontes permanecem junto aos blocos e no acervo:

- [Marx, prefácio de 1859](https://www.marxists.org/archive/marx/works/1859/critique-pol-economy/preface.htm).
- [Bernstein, prefácio de Evolutionary Socialism](https://www.marxists.org/reference/archive/bernstein/works/1899/evsoc/preface.htm).
- [Luxemburgo, introdução de Reform or Revolution](https://www.marxists.org/archive/luxemburg/1900/reform-revolution/intro.htm).
- [Lenin, State and Revolution, capítulo VI](https://www.marxists.org/archive/lenin/works/1917/staterev/ch06.htm).
- [Stanford Encyclopedia of Philosophy: Karl Marx](https://plato.stanford.edu/entries/marx/).

Dados importados de Wikipedia/Wikidata continuam identificados como descoberta/em revisão, sem converter links enciclopédicos em evidência historiográfica. Não foi alegada revisão humana. As referências visuais do usuário continuam sendo inspiração, não ativos publicados.
