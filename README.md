# ATLAS

Plataforma educacional pública e gratuita para compreender relações entre história, política, economia e sociedade.

## Requisitos

- Node.js 24.0 ou superior (ou uma versão suportada pelo Angular 21)
- npm 11 ou superior

## Versão do Angular

O ambiente do bootstrap tinha Node.js `24.13.0`. O Angular CLI `22.2.5` disponível no registro exige Node.js `24.15.0` ou superior na linha 24; por isso foi usada a versão estável compatível `21.2.29` do CLI, com Angular `21.2.25`.

## Desenvolvimento

```bash
npm install
npm start
```

O servidor de desenvolvimento abre em `http://localhost:4200`. A aplicação usa Angular standalone, TypeScript strict, Angular Router e SCSS. Tailwind CSS está configurado junto aos estilos dos componentes.

## Rotas iniciais

- `/` — apresentação e pontos de entrada
- `/relacoes`, `/tempo-e-espaco`, `/conhecimento` — exploração de relações, tempo/espaço e busca
- `/explorar` — índice navegável das oito categorias editoriais
- `/atlas/marxismo` — mapa de argumentos sobre Smith, Marx e valor, com conteúdo em revisão
- `/explorar/:tipo` — índice de uma categoria
- `/explorar/:tipo/:slug` — página de detalhe editorial ou de metodologia
- `/verbete/:slug` — verbete carregado do registro JSON estático e validado
- `/estudar` — apresentação do formato de trilhas
- `/estudar/como-usar-trilhas` — exemplo de metodologia de estudo
- `/sobre` — missão do projeto
- `/fontes` — biblioteca das fontes cadastradas, com localizadores e verbetes relacionados
- Qualquer caminho desconhecido — página 404 da aplicação

Na página inicial, a mesa destaca três textos de metodologia, enquanto a busca percorre verbetes, relações e entradas editoriais carregados. Relações apresenta os vínculos registrados; Tempo e espaço oferece uma linha do tempo e um comparador com os metadados disponíveis, sem desenhar fronteiras. A exploração geográfica permanece indisponível e as trilhas temáticas continuam identificadas como previstas.

As páginas exemplares de verbete, artigo e atlas explicam a metodologia do ATLAS. Os registros existentes de artigo, pessoa e evento também aparecem em suas categorias e abrem páginas estruturadas em `/verbete/:slug`. Dossiês e trilhas temáticas continuam identificados como previstos. A biblioteca `/fontes` reúne referências e seus usos. Páginas de leitura oferecem sumário navegável, contexto e links relacionados. Metadados de descrição e URL canônica são atualizados por rota; os canônicos usam caminhos relativos à raiz porque o projeto ainda não define um domínio público. Veja o [sitemap e os tipos editoriais](docs/INFORMATION-ARCHITECTURE.md).

## Comandos

| Comando | Uso |
| --- | --- |
| `npm start` | Servidor local com recarga automática |
| `npm run build` | Compilação de produção e prerender de rotas públicas |
| `npm test` | Testes unitários Vitest em execução única |
| `npm run lint` | ESLint para TypeScript e templates Angular |
| `npm run typecheck` | Checagem TypeScript da aplicação e dos testes |

O build produz saída estática para hospedagem, incluindo as rotas de conteúdo conhecidas no momento. Não há servidor Express ou API neste bootstrap. A busca local indexa registros editoriais, entidades e fontes validados, com aliases, filtros por tipo e estado; não há API remota de pesquisa.

Para conferir a saída estática localmente, execute `npm run build` e `npm run preview`; o servidor escuta somente em `127.0.0.1:4305`. A configuração de CI, os testes de navegador e os bloqueios de indexação do piloto estão documentados em [Piloto e verificações](docs/PILOTO-E-VERIFICACAO.md).

O grafo editorial e suas fontes ficam em `src/content/atlas.json`, são validados por `ContentRepository` com Zod e copiados para a saída do build em `content/`. Incluem registros sobre o processo constituinte de 1987–1988 e a Constituição de 1988; afirmações exibem o estado de revisão realmente cadastrado. No navegador, o serviço lê esse asset estático; durante o prerender usa o JSON empacotado. Veja [as decisões e limites da arquitetura](docs/ARCHITECTURE.md).

As três composições experimentais do prompt 04, suas decisões visuais e capturas estão em [Direção artística](docs/DIRECAO-ARTISTICA.md).
