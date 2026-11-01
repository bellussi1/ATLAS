# Ampliação editorial e internacionalização do conteúdo

Entrega de 01/11/2026, baseada no commit `6b6436e`. Windows, Node 24 e npm 11. O usuário definiu pt-BR e inglês e informou não haver traduções ou revisor externo disponíveis. A entrega inclui revisão linguística assistida por IA, identificada como tal, sem registrar revisão humana inexistente.

## Contratos e catálogos

`countrySchema` e `regimeSchema`, em `core/content/models/content-schema.ts`, são discriminantes próprios. País exige denominação na fonte, recorte territorial, nota de identidade e evidências. Regime exige início temporal, países associados e classificações com atribuição, edição, limites e evidências. O grafo rejeita referência a pessoa/lugar/governo como país de um regime, evidências inexistentes e referências repetidas. Não reclassifica automaticamente `place`, `government` ou `historical-polity`.

`EntityProfileComponent` apresenta esses dados na página permanente existente. Novos catálogos: `/paises`, `/regimes`, `/partidos`, `/instituicoes`, `/acontecimentos`, `/conceitos` e `/lugares`. Compartilham busca/facetas/permalinks com os anteriores. Rótulos dos tipos novos também foram integrados ao contexto, à rede e aos filtros dos comparadores.

## Edição editorial inicial

O corpus passou de 48 para **56 entidades**, de 66 para **72 relações** e de 86 para **89 fontes**, em seis coleções. O índice tem 155 entradas. A nova coleção inclui dois países, dois recortes constitucionais de regime, um partido, uma instituição, um acontecimento e uma obra:

- Brasil e Portugal, apresentados por fontes constitucionais, sem fixar uma origem única dos países ou mapas de fronteiras.
- Recortes constitucionais de Brasil/1988 e Portugal/1976, com autodescrições normativas atribuídas. A edição consolidada portuguesa não é retroprojetada para 1976 nem interpretada como avaliação uniforme do funcionamento político.
- Partido Socialista de Portugal, Assembleia da República, aprovação da Constituição portuguesa e o documento constitucional, com seus limites de cadastro.

Fontes primárias consultadas em 01/11/2026:

- [Câmara dos Deputados: Constituição brasileira, publicação original](https://www2.camara.leg.br/legin/fed/consti/1988/constituicao-1988-5-outubro-1988-322142-publicacaooriginal-1-pl.html), artigos 1º e 18. A tentativa de acesso ao Planalto foi bloqueada; a evidência efetivamente conferida foi a publicação da Câmara.
- [Assembleia da República: Constituição portuguesa](https://www.parlamento.pt/Legislacao/Paginas/ConstituicaoRepublicaPortuguesa.aspx), artigos 1.º, 2.º, 147.º, 296.º e fórmula de aprovação após o preâmbulo. Aprovação e entrada em vigor são distinguidas.
- [Comissão Nacional de Eleições: Partido Socialista](https://www.cne.pt/partido/partido-socialista), denominação, sigla e inscrição. O ano da inscrição não é apresentado como fundação.

São paráfrases editoriais novas, com fontes/localizadores, sem imagens ou transcrições extensas. Afirmações e vínculos permanecem `pending`; não houve revisão historiográfica humana. A receita versionada `scripts/editorial/2026-11-01-constitutional-contexts.json` reproduz a edição por `npm run editorial:apply -- scripts/editorial/2026-11-01-constitutional-contexts.json`. O comando valida antes de escrever, preserva a data global mais recente e recusa sobrescrever coleção existente divergente. A aplicação idempotente foi executada novamente nesta sessão.

O manifesto canônico referencia um novo shard com hash; os cinco shards anteriores permanecem iguais. Capturas Wikimedia, mídia, dossiês e suplementos não foram alterados. A receita local não é uma captura integral arquivada dos sites institucionais.

## Traduções, publicação e fallback

`core/content/models/content-translation.ts` define idiomas, campos completos da narrativa, revisão/digest de origem, preparação e revisão linguística. `scripts/content/translations.mjs` confere entidade, idioma, revisão e SHA-256 dos campos originais. Uma origem alterada, inclusive sem incrementar revisão, bloqueia a publicação. Entradas duplicadas, idiomas incompatíveis e metadados de revisão incompletos também são recusados.

A origem está em `src/content/translations/catalogue.json`, excluída dos assets diretos. Apenas traduções aprovadas entram no índice de busca compilado e no pacote já protegido por manifesto/hash; não foi criado um asset/requisição adicional. Traduções pendentes não entram nos arquivos públicos nem em `searchText`; falhas preservam o último manifesto válido.

Quatro narrativas têm inglês: Brasil, Portugal e os dois recortes constitucionais. Título, resumo, contexto e seções foram traduzidos e comparados com a origem pelo próprio assistente. O método é `assistant`, responsável `Codex (IA)`; não há revisão independente, humana ou certificação jurídica. Registro: [ATLAS-TR-2026-11-01-EN-01](../editorial/TRANSLATION-REVIEW-2026-11-01.md). Revisão da tradução e revisão historiográfica são estados distintos; traduzir não torna uma afirmação verificada.

Nos catálogos e registros, `idioma=pt-BR|en` seleciona a narrativa disponível. A interface permanece em português. Perfis, afirmações e referências preservam a redação original e seu `lang`; metadados de título/descrição acompanham a narrativa selecionada. IDs, slugs e canonical não mudam. Idioma sem tradução, tradução pendente/desatualizada ou idioma não suportado usam o original com aviso. Idiomas legados não declarados são `und`, sem supor que a língua da Wikipedia identifique todo o texto do registro.

Busca incorpora as narrativas aprovadas em inglês e mantém a seleção de idioma no retorno aos resultados. Navegação entre catálogos conserva o idioma. Não há tradução integral da interface/dossiês, páginas `/en` nem `hreflang` de páginas integralmente traduzidas. O prerender é da versão padrão; uma URL com idioma aplica a seleção na hidratação.

## Verificações executadas

| Comando | Resultado observado |
| --- | --- |
| `npm run build` | Passou após os ajustes finais, 82 rotas estáticas, headers/CSP gerados, sem erros/avisos de template Angular |
| `npm run typecheck` | Passou, aplicação e testes |
| `npm test` | 134 testes passaram em 27 arquivos |
| `npm run test:content` | Sete testes passaram, incluindo revisão/digest, rejeição de origem alterada e exclusão de rascunho sentinela dos assets |
| `npm run test:ingestion` | Passou |
| `npm run ingest:verify` | Duas capturas reproduzidas duas vezes sem rede, com os hashes originais |
| `npm run lint` | Passou, Angular/templates, seis testes arquiteturais, Biome e Prettier |
| `npm run test:e2e -- --workers=2` | 40 testes passaram em 46,8s |
| `npm run test:e2e -- e2e/editorial-i18n.spec.ts --workers=2` | Cinco testes passaram novamente após a identificação da revisão nos resultados |
| `npm run check:links` | Links e âncoras de 83 HTMLs verificados, incluindo shell CSR |
| `git diff --check` | Sem erros de whitespace |

E2E cobre os sete catálogos, perfis/fonte/país de regime, inglês, `lang`, método de revisão, preservação da identidade e do estado historiográfico, canonical, reload, Back/Forward, busca em inglês, retorno com idioma, fallback e 404 do catálogo bruto de traduções. Em 320px, nenhum overflow horizontal ou achado Axe serious/critical nos estados auditados. Capturas revisadas: `output/playwright/editorial-countries-en-desktop.png` e `output/playwright/editorial-regime-mobile.png`. Não se declara conformidade WCAG integral.

Lint apontou ordem de membros, anotação de mapa incompatível com fallback e callback `forEach` sem bloco; foram corrigidos e os comandos repetidos. A sugestão automática de usar `Math.max` em datas ISO não foi aplicada, pois os operandos são strings: o comando editorial usa comparação cronológica explícita após validar a data.

## Limites e operação

Esta é a cobertura inicial, não um catálogo mundial completo. O acervo segue com revisão historiográfica pendente, resumos legados em idiomas diversos e quatro traduções com revisão assistida por IA. Não se atribuem avaliação independente ou revisão humana ao material. Para revisão humana futura, registrar pessoa, data, método e referência reais; o contrato valida os metadados, não autentica a identidade do revisor.

Release compilada: `9804230f50de98852516b3f8d1e72397aac6e189d5dc3c8ba5a4d9c0a3c95738`. O build final informou 353,53 kB iniciais brutos / 99,45 kB estimados para transferência. A política de preparar o grafo global nas rotas de conteúdo permanece. Sem nova dependência ou backend, push, deploy ou workflow remoto. O aviso Node `MODULE_TYPELESS_PACKAGE_JSON` do carregamento de módulos TS permanece informativo.
