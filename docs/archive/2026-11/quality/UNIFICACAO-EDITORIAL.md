# Unificação editorial de Marxismo e Liberalismo

Entrega de 01/11/2026. Amplia o percurso de hipertexto e a ficha contextual já compartilhados.

## Implementação

- `IdeologyReadingComponent` reúne índice responsivo, progresso, capítulo ativo, retorno ao ponto anterior, fragmentos de URL, foco e redução de movimento. Abertura e sequência editorial são projetadas pelas páginas. Mantém os dois ajustes de composição e os limiares de capítulo existentes.
- `IdeologyReadingIndexComponent` continua como apresentação dos controles; o contrato de seção fica em `features/ideologies/models`.
- `EditorialSourcesComponent` atende as fontes dos capítulos e a bibliografia do dossiê de Marxismo, além das evidências de conexões no atlas do Liberalismo. Preserva edição, localizador, abertura de fontes externas e mensagens de ausência. Referências sem URL aparecem como texto.
- Resolução e deduplicação das evidências continuam com os consumidores. Nenhum snapshot, geometria, conteúdo histórico, licença ou rota foi alterado. Composições específicas do dossiê e do atlas seguem em seus componentes.
- Observadores da leitura são descartados na destruição do componente. O alvo da navegação deve pertencer às seções declaradas e ao DOM da própria leitura.

## Verificação observada

| Comando | Resultado |
|---|---|
| `npm run build` | Passou; 82 rotas prerenderizadas e cabeçalhos CSP gerados |
| `npm run typecheck` | Passou para aplicação e testes |
| `npm test` | 140 testes em 29 arquivos, incluindo seis novos dos componentes compartilhados |
| `npm run lint` | Passou: Angular/ESLint, seis testes de limites arquiteturais, Biome e Prettier |
| `npm run test:e2e` | 41 testes: controles desktop e mobile, foco no capítulo, filtros preservados, limpeza da preferência de movimento ao voltar à home |
| `npm run check:links` | Links internos e fragmentos de 83 HTMLs verificados |
| `git diff --check` | Sem problemas de whitespace |

O E2E verificou teclado, toque, retorno da ficha contextual, geometria, ausência de overflow em 320, 390 e 1440 px, e ausência de achados axe graves ou críticos nas superfícies auditadas. Capturas de Marxismo a 1440 px e Liberalismo a 320 px inspecionadas; ficam em `output/playwright`, sem versionamento. Não é auditoria WCAG integral.

Uma execução inicial de lint colidiu com outra geração de conteúdo (`EPERM` ao renomear um artefato); a repetição passou. O aviso `MODULE_TYPELESS_PACKAGE_JSON` continua informativo. Nenhuma dependência nova.
