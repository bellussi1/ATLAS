# Inicialização, fluidez da rede e acessos na home

Entrega de 01/11/2026.

## Inicialização

O trecho recebido tinha `MODULE_TYPELESS_PACKAGE_JSON` e a compilação em andamento. `npm start -- --port 4306` concluiu a compilação e subiu o servidor; não foi reproduzida falha de inicialização nem erro de console ao abrir home e rede. O pacote passou a declarar ESM, e a configuração ESLint foi convertida para imports e exports ESM. Repetições de `npm start`, geração de conteúdo e build não emitiram mais o aviso. Arquivos CommonJS explícitos continuam em `.cjs`.

## Mudanças de uso

- A home apresenta **Explorar a rede** e **Comparar registros** como botões, junto da busca, com navegação por `RouterLink`. Capturas a 1440 e 320 px inspecionadas.
- As vistas locais da rede compartilham altura e centro dentro da mesma coleção, antecipados no build. A troca de foco preserva escala e altura do diagrama; filtros não recalculam posições no browser.
- Nós e vínculos usam transições CSS de 180 ms na seleção por ponteiro, com os tokens existentes. Transições podem ser interrompidas e redirecionadas nativamente. Teclado e movimento reduzido têm resposta imediata. Sem animação de entrada na carga inicial.
- A ficha volta ao topo ao trocar de registro, preservando a rolagem da página e o foco do controle. Busca, fontes, URLs e histórico seguem disponíveis.
- Estilos de caminhos que não existem mais no template da home foram removidos, mantendo o CSS abaixo do orçamento do build.

## Verificação observada

| Verificação | Resultado |
|---|---|
| `npm start -- --port 4306` | Servidor iniciado; home e rede sem erro de console |
| `npm run build` | 82 rotas estáticas; sem o aviso de módulos; CSS dentro do orçamento |
| `npm run lint` | Angular/ESLint, seis testes de arquitetura, Biome e Prettier passaram |
| `npm run typecheck` | Aplicação e testes passaram |
| `npm test` | 140 testes em 29 arquivos |
| `npm run test:content` | Sete testes, incluindo estabilidade de altura e centro |
| `npm run test:ingestion` | 15 testes |
| `npm run test:e2e` | 45 testes; novas jornadas de acessos da home em desktop e mobile, e seleção estável por ponteiro, teclado e movimento reduzido |
| `npm run check:links` | Links e fragmentos de 83 HTMLs verificados |

A primeira execução E2E apontou duas expectativas antigas: a lista de destinos permitidos na home e duração de transição exatamente zero, incompatível com o padrão global de `0.01ms` para teclado. As expectativas foram corrigidas e a suíte repetida. A interpolação de curvas foi conferida só no Chromium disponível; outros motores podem mostrar o vínculo sem interpolação, mantendo o caminho SVG e a navegação. Sem certificação de acessibilidade integral.
