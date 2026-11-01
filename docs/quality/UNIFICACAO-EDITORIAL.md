# Unificação editorial de Marxismo e Liberalismo

Entrega de 01/11/2026. Amplia o percurso de hipertexto e a ficha contextual já compartilhados.

## Implementação

- `IdeologyReadingComponent` reúne layout responsivo do índice, progresso, capítulo ativo, retorno ao ponto anterior, fragmentos de URL, foco e redução de movimento. Abertura e sequência editorial são projetadas pelas páginas. Mantém os dois ajustes de composição e os limiares de capítulo existentes.
- `IdeologyReadingIndexComponent` permanece como apresentação dos controles. Seu contrato de seção passa a residir em `features/ideologies/models`.
- `EditorialSourcesComponent` atende fontes de capítulos e bibliografia do dossiê de Marxismo, além das evidências de conexões no atlas do Liberalismo. Preserva edição, localizador, abertura de fontes externas e mensagens de ausência. Referências sem URL aparecem como texto.
- A resolução e a deduplicação das evidências permanecem com os consumidores. Nenhum snapshot, geometria, conteúdo histórico, licença ou rota foi alterado. As composições específicas do dossiê e do atlas continuam em seus componentes atuais.
- Os observadores da leitura são descartados na destruição do componente. O alvo da navegação deve pertencer às seções declaradas e ao DOM da própria leitura.

## Verificação observada

| Comando | Resultado |
| --- | --- |
| `npm run build` | Passou; 82 rotas prerenderizadas e cabeçalhos CSP gerados. |
| `npm run typecheck` | Passou para aplicação e testes. |
| `npm test` | 140 testes passaram em 29 arquivos, incluindo seis novos testes dos componentes compartilhados. |
| `npm run lint` | Passou: Angular/ESLint, seis testes de limites arquiteturais, Biome e Prettier. |
| `npm run test:e2e` | 41 testes passaram, incluindo controles desktop/mobile, foco no capítulo, filtros preservados e limpeza da preferência de movimento ao voltar à home. |
| `npm run check:links` | Links internos e fragmentos de 83 arquivos HTML verificados. |
| `git diff --check` | Sem problemas de whitespace. |

A suíte E2E verificou teclado, toque, retorno da ficha contextual, geometria, ausência de overflow a 320/390/1440 px e ausência de achados axe classificados como graves ou críticos nas superfícies auditadas. As capturas atuais de abertura de Marxismo a 1440 px e Liberalismo a 320 px foram inspecionadas visualmente; ficam em `output/playwright`, sem versionamento. Isso não representa auditoria WCAG integral.

Uma execução inicial de lint colidiu com outra geração de conteúdo (`EPERM` ao renomear um artefato); a repetição em sequência passou. O aviso preexistente `MODULE_TYPELESS_PACKAGE_JSON` continua informativo. Não foram adicionadas dependências.
