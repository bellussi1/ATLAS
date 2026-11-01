# Inicialização, fluidez da rede e acessos na home

Entrega de 01/11/2026.

## Inicialização

O trecho recebido continha `MODULE_TYPELESS_PACKAGE_JSON` e a compilação em andamento. A reprodução com `npm start -- --port 4306` concluiu a compilação e iniciou o servidor; não foi reproduzida falha de inicialização ou erro de console ao abrir home e rede. O pacote passou a declarar ESM e a configuração ESLint foi convertida para imports/export ESM. A repetição de `npm start`, a geração de conteúdo e o build não emitiram mais o aviso citado. Arquivos CommonJS explícitos continuam em `.cjs`.

## Mudanças de uso

- A home apresenta os links em formato de botão **Explorar a rede** e **Comparar registros**, junto da busca e com navegação real por RouterLink. Capturas a 1440 e 320 px foram inspecionadas.
- As vistas locais da rede compartilham altura e centro dentro da mesma coleção, antecipados no build. A troca de foco preserva a escala e a altura do diagrama; filtros continuam sem recalcular posições no browser.
- Nós e vínculos retidos usam transições CSS de 180 ms para seleção por ponteiro, com os tokens existentes. Transições podem ser interrompidas e redirecionadas nativamente. Teclado e movimento reduzido mantêm resposta imediata. Não há animação de entrada na carga inicial.
- A ficha volta ao seu topo ao trocar o registro, preservando a rolagem da página e o foco do controle. Busca, fontes, URLs e histórico permanecem disponíveis.
- Estilos antigos de caminhos que não existiam mais no template da home foram removidos, mantendo o CSS abaixo do orçamento do build.

## Verificação observada

| Verificação | Resultado |
| --- | --- |
| `npm start -- --port 4306` | Servidor iniciado; home e rede abertas sem erro de console. |
| `npm run build` | 82 rotas estáticas; sem o aviso de módulos e sem exceder o orçamento de CSS. |
| `npm run lint` | Angular/ESLint, seis testes de arquitetura, Biome e Prettier passaram. |
| `npm run typecheck` | Aplicação e testes passaram. |
| `npm test` | 140 testes em 29 arquivos passaram. |
| `npm run test:content` | Sete testes passaram, incluindo estabilidade da altura e do centro. |
| `npm run test:ingestion` | 15 testes passaram. |
| `npm run test:e2e` | 45 testes passaram; novas jornadas cobrem acessos da home em desktop/mobile e seleção estável por ponteiro, teclado e movimento reduzido. |
| `npm run check:links` | Links e fragmentos de 83 HTMLs verificados. |

A primeira execução E2E identificou duas expectativas antigas: a lista de destinos permitidos na home e duração de transição exatamente zero, incompatível com o padrão global de teclado de `0.01ms`. As expectativas foram corrigidas e a suíte completa foi repetida. A interpolação de curvas foi conferida no Chromium disponível; outros motores podem apresentar o novo vínculo sem interpolação, preservando o caminho SVG e a navegação. Não foi realizada certificação de acessibilidade integral.
