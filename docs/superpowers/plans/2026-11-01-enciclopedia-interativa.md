# Enciclopédia interativa — plano e decisões

Pedido autorizado: revisar skill/padrão e implementar refinamento no Marxismo; verificar reutilização pelo Liberalismo. Manter somente `/`, `/marxismo`, `/liberalismo`, Angular 21, dados estáticos, fontes e licenças. Nenhuma dependência nova.

## Auditoria e decisão

Galerias expandem dentro de linhas da grade; timeline é lista de detalhes; SVG do Marxismo não recebe seleção de nós; `@defer` usa placeholder com geometria diferente; faltam termos contextuais e contrato tipado de defesa/crítica/resposta. A skill orienta intenção, mas não define esses critérios observáveis. Baseline: teste de termo contextual falhou por ausência do controle; schema rejeitou o novo bloco de princípios. Cinco cenários de aplicação da skill confirmaram lacunas em geometria, semântica de termo e cobertura argumentativa.

Alternativas consideradas: animar o layout existente manteria seus deslocamentos; refazer as páginas descartaria componentes úteis. Escolha: evoluir blocos e reaproveitar CDK Dialog para explorar registros em um painel editorial sobreposto, com foco/scroll preservados. Mídia existente, com licença. Conteúdo novo curto, atribuído, baseado em fontes primárias identificadas.

## Execução

- [x] Atualizar padrão e skill, incluindo critérios de estabilidade, linguagens de ação, hipertexto e argumento; repetir os cinco cenários de referência.
- [x] Contexto compartilhado: registro, fonte, imagem, entidades relacionadas, teclado/toque e retorno; hipertexto sem HTML injetado.
- [x] Timeline com trilho selecionável/painel estável; grafo com nós e conexões realçados, filtros e alternativa textual; galeria com contexto sem mudar o fluxo.
- [x] Blocos tipados de princípios, vertentes e defesa/crítica/resposta/limites, aplicados ao Marxismo com fontes. Verificar composição compatível com Liberalismo.
- [x] Motion por ação: feedback 120 ms, contexto 240 ms, conexões até 480 ms; interrompível; reduced motion e teclado imediatos. Sem animar parágrafos em leitura.
- [x] Testes unitários/e2e, lint, typecheck, build, links; desktop/mobile, normal/reduzido, cold-load e cliques; CLS por janela e deslocamento do gatilho. Capturas antes/depois e relatório com limitações.

Resultados: [relatório e evidências](../../auditoria-enciclopedia/RELATORIO.md). A verificação de reutilização no Liberalismo cobre infraestrutura; sua cobertura editorial de princípios e debates não foi inventada nesta etapa.

Estabilidade significa ausência de deslocamento inesperado; expansão intencional pode alterar geometria se prevista e sem salto de viewport. Nenhuma medição isolada autoriza afirmar CLS zero em todos os dispositivos.
