# Ampliação editorial e internacionalização do conteúdo

Entrega de 01/11/2026, sobre o commit `6b6436e`. Windows, Node 24 e npm 11. O usuário definiu pt-BR e inglês e informou não haver traduções nem revisor externo disponíveis. Inclui revisão linguística assistida por IA, identificada como tal; sem registro de revisão humana inexistente.

## Contratos e catálogos

- `countrySchema` e `regimeSchema` (`core/content/models/content-schema.ts`) são discriminantes próprios. **País:** denominação na fonte, recorte territorial, nota de identidade e evidências. **Regime:** início temporal, países associados e classificações com atribuição, edição, limites e evidências.
- O grafo rejeita referência a pessoa, lugar ou governo como país de um regime, evidências inexistentes e referências repetidas. Não reclassifica automaticamente `place`, `government` ou `historical-polity`.
- `EntityProfileComponent` apresenta esses dados na página permanente existente.
- **Novos catálogos:** `/paises`, `/regimes`, `/partidos`, `/instituicoes`, `/acontecimentos`, `/conceitos` e `/lugares`. Compartilham busca, facetas e permalinks com os anteriores. Rótulos dos tipos novos integrados ao contexto, à rede e aos filtros dos comparadores.

## Edição editorial inicial

O corpus passou de 48 para **56 entidades**, de 66 para **72 relações** e de 86 para **89 fontes**, em seis coleções. O índice tem 155 entradas. A nova coleção inclui dois países, dois recortes constitucionais de regime, um partido, uma instituição, um acontecimento e uma obra:

- **Brasil e Portugal:** apresentados por fontes constitucionais, sem fixar origem única dos países nem mapas de fronteiras.
- **Recortes constitucionais de Brasil/1988 e Portugal/1976:** autodescrições normativas atribuídas. A edição consolidada portuguesa não é retroprojetada para 1976 nem tomada como avaliação uniforme do funcionamento político.
- **Partido Socialista, Assembleia da República, aprovação da Constituição portuguesa e o documento constitucional**, com limites de cadastro.

Fontes primárias consultadas em 01/11/2026:

- [Câmara dos Deputados: Constituição brasileira, publicação original](https://www2.camara.leg.br/legin/fed/consti/1988/constituicao-1988-5-outubro-1988-322142-publicacaooriginal-1-pl.html), artigos 1º e 18. A tentativa de acesso ao Planalto foi bloqueada; a evidência conferida foi a publicação da Câmara.
- [Assembleia da República: Constituição portuguesa](https://www.parlamento.pt/Legislacao/Paginas/ConstituicaoRepublicaPortuguesa.aspx), artigos 1.º, 2.º, 147.º, 296.º e fórmula de aprovação após o preâmbulo. Aprovação e entrada em vigor são distinguidas.
- [Comissão Nacional de Eleições: Partido Socialista](https://www.cne.pt/partido/partido-socialista): denominação, sigla e inscrição. O ano da inscrição não é apresentado como fundação.

São paráfrases editoriais novas, com fontes e localizadores, sem imagens ou transcrições extensas. Afirmações e vínculos permanecem `pending`; sem revisão historiográfica humana. A receita `scripts/editorial/2026-11-01-constitutional-contexts.json` reproduz a edição por `npm run editorial:apply -- scripts/editorial/2026-11-01-constitutional-contexts.json`. O comando valida antes de escrever, preserva a data global mais recente e recusa sobrescrever coleção existente divergente. A aplicação idempotente foi executada de novo nesta sessão.

O manifesto canônico referencia um novo shard com hash; os cinco anteriores permanecem iguais. Capturas Wikimedia, mídia, dossiês e suplementos não foram alterados. A receita local não é captura integral arquivada dos sites institucionais.

## Traduções, publicação e fallback

- `core/content/models/content-translation.ts` define idiomas, campos completos da narrativa, revisão e digest de origem, preparação e revisão linguística.
- `scripts/content/translations.mjs` confere entidade, idioma, revisão e SHA-256 dos campos originais. Origem alterada, inclusive sem incremento de revisão, bloqueia a publicação. Entradas duplicadas, idiomas incompatíveis e metadados de revisão incompletos também são recusados.
- Origem: `src/content/translations/catalogue.json`, fora dos assets diretos. Só traduções aprovadas entram no índice de busca compilado e no pacote protegido por manifesto e hash; sem asset nem requisição adicional. Traduções pendentes não entram nos arquivos públicos nem em `searchText`; falhas preservam o último manifesto válido.
- **Quatro narrativas com inglês:** Brasil, Portugal e os dois recortes constitucionais. Título, resumo, contexto e seções traduzidos e comparados com a origem pelo próprio assistente. Método `assistant`, responsável `Codex (IA)`; sem revisão independente, humana ou certificação jurídica. Registro: [ATLAS-TR-2026-11-01-EN-01](../editorial/TRANSLATION-REVIEW-2026-11-01.md). Revisão da tradução e revisão historiográfica são estados distintos; traduzir não torna uma afirmação verificada.
- Em catálogos e registros, `idioma=pt-BR|en` seleciona a narrativa disponível; a interface segue em português. Perfis, afirmações e referências preservam a redação original e seu `lang`. Metadados de título e descrição acompanham a narrativa selecionada. IDs, slugs e canonical não mudam. Idioma sem tradução, tradução pendente ou desatualizada e idioma não suportado usam o original com aviso. Idiomas legados não declarados são `und`, sem supor que a língua da Wikipedia identifique todo o texto do registro.
- Busca incorpora as narrativas aprovadas em inglês e mantém a seleção de idioma no retorno aos resultados. Navegação entre catálogos conserva o idioma. Sem tradução integral da interface ou dos dossiês, sem páginas `/en` e sem `hreflang` de páginas integralmente traduzidas. O prerender é da versão padrão; URL com idioma aplica a seleção na hidratação.

## Verificações executadas

| Comando | Resultado |
|---|---|
| `npm run build` | Passou após os ajustes finais; 82 rotas estáticas; headers e CSP gerados |
| `npm run typecheck` | Passou, aplicação e testes |
| `npm test` | 134 testes em 27 arquivos |
| `npm run test:content` | Sete testes: revisão e digest, rejeição de origem alterada, exclusão de rascunho sentinela dos assets |
| `npm run test:ingestion` | Passou |
| `npm run ingest:verify` | Duas capturas reproduzidas duas vezes sem rede, com os hashes originais |
| `npm run lint` | Passou: Angular/templates, seis testes arquiteturais, Biome e Prettier |
| `npm run test:e2e -- --workers=2` | 40 testes em 46,8 s |
| `npm run test:e2e -- e2e/editorial-i18n.spec.ts --workers=2` | Cinco testes, repetidos após a identificação da revisão nos resultados |
| `npm run check:links` | Links e âncoras de 83 HTMLs, incluindo shell CSR |
| `git diff --check` | Sem erros de whitespace |

E2E: os sete catálogos, perfis, fonte e país de regime, inglês, `lang`, método de revisão, preservação da identidade e do estado historiográfico, canonical, reload, Back e Forward, busca em inglês, retorno com idioma, fallback e 404 do catálogo bruto de traduções. Em 320 px, sem overflow horizontal nem achado Axe serious ou critical nos estados auditados. Capturas revisadas: `output/playwright/editorial-countries-en-desktop.png` e `output/playwright/editorial-regime-mobile.png`. Sem declaração de conformidade WCAG integral.

Lint apontou ordem de membros, anotação de mapa incompatível com fallback e callback `forEach` sem bloco; corrigidos e os comandos repetidos. A sugestão de usar `Math.max` em datas ISO não foi aplicada, pois os operandos são strings: o comando editorial compara cronologicamente após validar a data.

## Limites e operação

- Cobertura inicial, não catálogo mundial completo. O acervo segue com revisão historiográfica pendente, resumos legados em idiomas diversos e quatro traduções com revisão assistida por IA. Sem avaliação independente ou revisão humana atribuída ao material.
- Revisão humana futura: registrar pessoa, data, método e referência reais. O contrato valida os metadados, não autentica a identidade do revisor.
- Release compilada: `9804230f50de98852516b3f8d1e72397aac6e189d5dc3c8ba5a4d9c0a3c95738`. Build final: 353,53 kB iniciais brutos e 99,45 kB estimados para transferência. Política de preparar o grafo global nas rotas de conteúdo mantida. Sem nova dependência, backend, push, deploy ou workflow remoto. O aviso `MODULE_TYPELESS_PACKAGE_JSON` do carregamento de módulos TS permanece informativo.
