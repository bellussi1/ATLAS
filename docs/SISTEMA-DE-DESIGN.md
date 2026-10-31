# Sistema de design acessível

O sistema estabelece uma base comum a partir da direção editorial do ATLAS: tipografia suíça, leitura em papel, cartografia e acentos de arquivo. As alternativas A, B e C do laboratório visual continuam experimentais; nenhuma é escolhida como layout de produção por este documento.

O showroom navegável está em `/sistema`. A rota é pré-renderizada e também pode ser aberta pelo link “Sistema visual” no rodapé global.

## Tokens

Os tokens estão em `src/styles.scss`. Os aliases antigos (`--paper`, `--ink`, `--signal` e outros) continuam apontando para os tokens semânticos enquanto outras páginas forem migradas.

| Função | Token | Valor |
| --- | --- | --- |
| Fundo | `--color-canvas` | `#F3F0E9` |
| Superfície | `--color-surface` | `#FBFAF7` |
| Superfície elevada | `--color-surface-raised` | `#FFFDFA` |
| Superfície sutil | `--color-surface-subtle` | `#E9E4DA` |
| Texto principal | `--color-ink` | `#1C1C1A` |
| Texto de apoio | `--color-ink-muted` | `#57544D` |
| Borda | `--color-border` | `#D9D4CA` |
| Borda forte | `--color-border-strong` | `#777268` |
| Ação | `--color-accent` | `#A22720` |
| Ação em hover | `--color-accent-hover` | `#811F1A` |
| Texto em superfícies escuras | `--color-on-strong-surface` | `#FFFFFF` |
| Foco | `--color-focus` | `#A22720` |
| Informação | `--color-info` / `--color-info-surface` | `#164F60` / `#E1EDF0` |
| Sucesso | `--color-success` / `--color-success-surface` | `#24563B` / `#E4EEE5` |
| Atenção | `--color-warning` / `--color-warning-surface` | `#614500` / `#F2E8C8` |
| Erro | `--color-danger` / `--color-danger-surface` | `#82251F` / `#F5E4E1` |
| Cartografia | `--color-cartographic` | `#315F54` |
| Arquivo | `--color-archive` | `#176176` |

Tipografia: IBM Plex Sans para interface e títulos, Source Serif 4 para leitura e IBM Plex Mono para metadados. Os arquivos locais e avisos OFL estão em `public/fonts/`. A escala de texto, espaçamento, raio, largura de leitura e movimento também está definida como tokens CSS em `:root`. Os raios permanecem discretos; não há modo escuro global.

## Componentes e uso

Os componentes standalone e a diretiva de heading estão em `src/app/shared/ui-primitives.ts`; regras de apresentação compartilhadas estão em `src/app/shared/ui-primitives.scss`.

| Primitiva | Uso |
| --- | --- |
| `appHeading` | Diretiva em elementos nativos `h1`–`h3`, com variantes `display`, `page` e `section`; mantém a hierarquia HTML no controle da página. |
| `appEditorialLink` | Diretiva em links nativos; preserva `routerLink`, `href`, classes e nomes da tela, aplicando o tratamento editorial. |
| `app-button` | Botão nativo com variantes `primary`, `secondary` e `quiet`, além de `disabled` e `busy`. O rótulo permanece estável durante `busy`; `aria-busy` é definido e o botão é desativado para evitar repetição da ação. |
| `app-text-field` | Campo com `controlId`, `label`, `type`, `required`, `disabled`, `readonly`, `hint` e `error`. Rótulo e instruções são associados ao controle; erro define `aria-invalid` e integra `aria-describedby`. |
| `app-menu` | Navegação nativa com nome obrigatório e orientação horizontal ou vertical; os links são projetados pela página. |
| `app-summary` | Disclosure nativo `<details>/<summary>`, operável por teclado sem JavaScript específico. |
| `app-notice` | Mensagem `info`, `success`, `warning` ou `critical`; `accessibleRole="status"` anuncia em modo polido e `accessibleRole="alert"` em modo assertivo. O papel fica em um único elemento. |
| `app-page-template` | Template editorial com variantes `editorial`, `index` e `profile`, largura de leitura própria e `aria-labelledby`. |

Já usados em páginas reais: o menu global e o template de páginas editoriais; a home usa heading, link e campo de busca somente leitura. O showroom exercita as demais variantes e estados sem enviar dados.

## Acessibilidade e validação

- O foco visível usa contorno de 3 px; o link de pular conteúdo move o foco para o `<main>`; botões, links de menu, disclosures e campos têm área mínima aproximada de 44 px.
- Os campos usam rótulo explícito, indicação de obrigatório, texto de ajuda e mensagem de erro associada. Estados desativados não dependem apenas da cor.
- Menus e disclosures usam elementos nativos. As mensagens têm nome, papel e modo de anúncio explícitos.
- `prefers-reduced-motion: reduce` desativa rolagem suave, animações e transições globais. O layout não impõe largura mínima acima de 0; as colunas mudam para uma coluna em telas estreitas.
- Contraste sRGB é checado automaticamente em `src/app/shared/ui-contrast.spec.ts`, lendo os valores diretamente de `src/styles.scss`.

| Combinação medida | Razão |
| --- | ---: |
| Texto principal / canvas | 15,00:1 |
| Texto de apoio / canvas | 6,64:1 |
| Ação e foco / canvas | 6,48:1 |
| Foco / superfície | 7,07:1 |
| Texto de informação / superfície de informação | 7,57:1 |
| Texto de sucesso / superfície de sucesso | 7,15:1 |
| Texto de atenção / superfície de atenção | 7,27:1 |
| Texto de erro / superfície de erro | 7,64:1 |
| Branco / ação | 7,07:1 |
| Branco / cartografia | 7,25:1 |
| Branco / arquivo | 6,98:1 |

No navegador, foram conferidos a rota showroom em 1280 px, 640 px (viewport CSS equivalente ao reflow de 200% em 1280 px) e 320 px, sem largura de documento maior que a viewport. O link de pular conteúdo e o disclosure foram operados com teclado; o movimento reduzido estava ativo. A árvore de acessibilidade do Chrome foi revisada para navegação, campos, mensagens, headings e disclosures.

Esta revisão e os testes automatizados não constituem auditoria WCAG 2.2 AA integral. Ainda falta avaliação com leitores de tela e pessoas usuárias de tecnologia assistiva, incluindo combinações de navegador/sistema operacional e anúncio das mensagens dinâmicas.
