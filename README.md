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

## Páginas disponíveis

- `/` — home, busca nas duas leituras e mesa de pesquisa.
- `/marxismo` — leitura contínua com conceitos, pensadores, cronologia, debates e fontes.
- `/liberalismo` — atlas com rede, cronologia e imagens licenciadas.

Escopo temporário solicitado em 01/11/2026. As demais páginas foram removidas do código e do prerender. Caminhos desconhecidos voltam à home. A navegação, as prévias e os exercícios permanecem dentro dessas três páginas; referências externas continuam disponíveis. Os dados históricos, fontes e licenças foram preservados. Documentos antigos descrevem etapas anteriores do produto.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm start` | Servidor local com recarga automática |
| `npm run build` | Compilação de produção e prerender de rotas públicas |
| `npm test` | Testes unitários Vitest em execução única |
| `npm run test:ingestion` | Testes Node de identidade, integridade, mídia e publicação da ingestão |
| `npm run ingest:verify` | Replay duplo de todas as capturas versionadas, sem rede |
| `npm run lint` | ESLint Angular, limites arquiteturais, Biome e formatação |
| `npm run typecheck` | Checagem TypeScript da aplicação e dos testes |

O build produz saída estática para hospedagem, incluindo as rotas de conteúdo conhecidas no momento. Não há servidor Express ou API neste bootstrap. A busca local indexa registros editoriais, entidades e fontes validados, com aliases, filtros por tipo e estado; não há API remota de pesquisa.

Para conferir a saída estática localmente, execute `npm run build` e `npm run preview`; o servidor escuta somente em `127.0.0.1:4305`. Se a porta estiver ocupada, defina `ATLAS_PREVIEW_PORT` para preview e E2E; o padrão continua 4305. A configuração de CI, os testes de navegador e os bloqueios de indexação do piloto estão documentados em [Piloto e verificações](docs/quality/PILOTO-E-VERIFICACAO.md).

O grafo editorial e suas fontes ficam em `src/content/atlas.json`, são validados por `ContentRepository` com Zod e copiados para a saída do build em `content/`. Incluem registros sobre o processo constituinte de 1987–1988 e a Constituição de 1988; afirmações exibem o estado de revisão realmente cadastrado. No navegador, o serviço lê esse asset estático; durante o prerender usa o JSON empacotado. Veja [as decisões e limites da arquitetura](docs/architecture/ARCHITECTURE.md).

Consulte o [índice da documentação](docs/README.md) para escopo, padrões de design, qualidade e referências.

A ingestão exige `--capture <diretório novo>` ou `--offline <captura>`, com `--output <arquivo>` para uma saída isolada. Configuração, grafo de entrada e respostas brutas ficam versionados fora do site; Zod valida o resultado antes de substituir snapshots. Veja [Ingestão reproduzível](docs/architecture/INGESTAO-REPRODUZIVEL.md).

## Organização do código

A aplicação usa features para ideologias, exploração e estudo; core para conteúdo/infraestrutura; shared para UI/diretivas; layouts para o shell e pages para Home. Consulte [Arquitetura](docs/architecture/ARCHITECTURE.md) para limites de imports, convenções e como adicionar uma tradição ou interação.
