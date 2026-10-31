# Sistema de design acessível

O sistema estabelece uma base comum a partir da direção editorial do ATLAS: tipografia suíça, leitura em papel, cartografia e acentos de arquivo. A direção A foi aprovada pelo usuário e é a base da interface principal. B orienta cartografia e documentos; C orienta a exploração do acervo. O laboratório A/B/C permanece como ferramenta de desenvolvimento.

O showroom navegável está em `/sistema`. A rota é pré-renderizada e também pode ser aberta pelo link “Sistema visual” no rodapé global.

## Tokens

Os tokens estão em `src/styles.scss`. Os aliases antigos (`--paper`, `--ink`, `--signal` e outros) continuam apontando para os tokens semânticos enquanto outras páginas forem migradas.

| Função | Token | Valor |
| --- | --- | --- |
| Fundo | `--color-canvas` | `#FBFAF7` |
| Superfície | `--color-surface` | `#FBFAF7` |
| Superfície elevada | `--color-surface-raised` | `#FFFDFA` |
| Superfície sutil | `--color-surface-subtle` | `#E9E4DA` |
| Texto principal | `--color-ink` | `#1C1C1A` |
| Texto de apoio | `--color-ink-muted` | `#57544D` |
| Borda | `--color-border` | `#D9D4CA` |
| Borda forte | `--color-border-strong` | `#777268` |
| Ação | `--color-accent` | `#B4231D` |
| Ação em hover | `--color-accent-hover` | `#811F1A` |
| Texto em superfícies escuras | `--color-on-strong-surface` | `#FFFFFF` |
| Foco | `--color-focus` | `#B4231D` |
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
| `app-content-summary` | Sumário de conteúdo com heading e conteúdo projetado; usado nos resumos das páginas reais de categoria e artigo. |
| `app-disclosure` | Disclosure nativo `<details>/<summary>`, operável por teclado sem JavaScript específico. |
| `app-notice` | Mensagem `info`, `success`, `warning` ou `critical`; `accessibleRole="status"` anuncia em modo polido e `accessibleRole="alert"` em modo assertivo. O papel fica em um único elemento. |
| `app-page-template` | Template editorial com variantes `editorial`, `index` e `profile`, largura de leitura própria e `aria-labelledby`. |

Já usados em páginas reais: o menu global e o template de páginas editoriais; a home usa heading, link e campo de busca somente leitura. O showroom exercita as demais variantes e estados sem enviar dados.

## Acessibilidade e validação

- O foco visível usa contorno de 3 px; o link de pular conteúdo move o foco para o `<main>`; botões, links de menu, disclosures e campos têm área mínima aproximada de 44 px.
- Os campos usam rótulo explícito, indicação de obrigatório, texto de ajuda e mensagem de erro associada. Estados desativados não dependem apenas da cor.
- Menus e disclosures usam elementos nativos. As mensagens têm nome, papel e modo de anúncio explícitos.
- `prefers-reduced-motion: reduce` desativa rolagem suave, animações e transições globais. O layout não impõe largura mínima acima de 0; as colunas mudam para uma coluna em telas estreitas.
- Contraste sRGB é checado automaticamente em `src/app/shared/ui-contrast.spec.ts`, lendo os valores diretamente de `src/styles.scss`. A suíte verifica texto principal, texto de apoio e ação nas superfícies canvas, superfície, elevada e sutil; foco nas superfícies clara e elevada; borda forte de campo; estados de mensagem e texto branco sobre as superfícies de ação/cartografia/arquivo. Os mínimos são 4,5:1 para texto e 3:1 para foco e borda não textual.

| Combinação medida | Razão |
| --- | ---: |
| Texto principal / canvas | 16,35:1 |
| Texto de apoio / canvas | 7,24:1 |
| Ação e foco / canvas | 6,29:1 |
| Foco / superfície | 6,29:1 |
| Texto de informação / superfície de informação | 7,57:1 |
| Texto de sucesso / superfície de sucesso | 7,15:1 |
| Texto de atenção / superfície de atenção | 7,27:1 |
| Texto de erro / superfície de erro | 7,64:1 |
| Branco / ação | 6,56:1 |
| Branco / cartografia | 7,25:1 |
| Branco / arquivo | 6,98:1 |

O showroom e as primitivas começam em uma coluna e ampliam para layouts maiores em breakpoints `min-width`. No navegador, foram conferidos a rota showroom em 1280 px, 640 px (viewport CSS equivalente ao reflow de 200% em 1280 px) e 320 px, sem largura de documento maior que a viewport. O link de pular conteúdo e o disclosure foram operados com teclado; o movimento reduzido estava ativo. A árvore de acessibilidade do Chrome foi revisada para navegação, campos, mensagens, headings e disclosures. O zoom nativo do navegador em 200% não foi medido separadamente.

Esta revisão e os testes automatizados não constituem auditoria WCAG 2.2 AA integral. Ainda falta avaliação com leitores de tela e pessoas usuárias de tecnologia assistiva, incluindo combinações de navegador/sistema operacional e anúncio das mensagens dinâmicas.


## Homepage e modos de exploração

A homepage é um índice de entrada, com busca funcional e três destinos: Relações, Tempo e espaço e Conhecimento. Ela não reúne miniaturas das experiências. A tipografia modernista, a assimetria, os filetes e a geometria usam os tokens compartilhados; as referências visuais não são ativos de publicação.

- Em /conhecimento, a busca local indexa títulos, resumos e texto dos registros editoriais existentes e entidades validadas. A consulta persiste em ?q=, aceita acentos equivalentes e oferece recuperação quando não há resultados. Formatos previstos conservam seu status, sem serem apresentados como coleções históricas publicadas.
- Em /relacoes, a rede inicial deriva exclusivamente de entityId e sourceIds das afirmações do ContentRepository. Seleção, filtro e contexto funcionam em botões e select nativos. A lista de conexões oferece equivalente textual. A rede representa metodologia, sem simular relações históricas.
- Em /tempo-e-espaco, há um estado vazio explícito e caminhos para leitura pertinente. Não há datas, locais ou fronteiras verificados no acervo atual. Cronologia interativa e mapa histórico permanecem dependentes desses dados; não foram apresentados como disponíveis.
- As perguntas de entrada levam a textos reais sobre evidência, contexto e organização editorial. Trilhas temáticas históricas ainda não estão publicadas.

A direção A está consolidada sem remover os índices existentes, o laboratório ou o showroom.


Validação da consolidação A: busca enviada por Enter no Chrome em 390 px abriu /conhecimento?q=evidencia e retornou cinco registros reais. A home e as três telas foram medidas em 320 px sem overflow horizontal. O nó Fonte foi ativado por Enter, atualizou a seleção e o contexto, mantendo contorno de foco de 3 px. Movimento reduzido foi emulado e reconhecido. A home foi capturada em 1440×1000 e 390×844; não foram reproduzidas as imagens de referência. A revisão não incluiu leitor de tela nem auditoria WCAG integral.
