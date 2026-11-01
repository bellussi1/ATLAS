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

- `/` — home, entrada para a busca universal e mesa de pesquisa.
- `/marxismo` — leitura contínua com conceitos, pensadores, cronologia, debates e fontes.
- `/liberalismo` — atlas com rede, cronologia e imagens licenciadas.

- `/conhecimento` — busca universal com filtros e consulta compartilhável por URL.
- `/entidades`, `/ideologias`, `/pessoas`, `/obras` — catálogos do grafo.
- `/verbete/:slug` — página permanente de cada entidade, com contexto, fontes e conexões.
- `/fontes` — referências cadastradas, com âncoras permanentes e usos no acervo.
- `/explorar/:tipo/:slug` — exemplos de metodologia, identificados como tais.
- `/rede` — rede com geometria de build, filtros e timeline compartilhada.
- `/comparar` — comparação histórica ou conceitual de dois registros, com fontes e limites.

O Knowledge Explorer amplia o escopo temporário anterior de três páginas, a pedido do usuário. Os 48 registros existentes e oito exemplos de metodologia têm páginas prerenderizadas; não houve nova coleta histórica. Caminhos desconhecidos no Angular voltam à home; o preview estático retorna 404 para arquivos inexistentes. Veja [contratos e validação](docs/quality/KNOWLEDGE-EXPLORER.md).

A rede e os comparadores usam o mesmo recorte por coleção, tipo, vínculo e período, compartilhável por URL. Posições/curvas e a escala temporal são compiladas antes da renderização; filtros não recalculam a geometria. A comparação justapõe o conteúdo registrado, sem gerar equivalência ou influência automaticamente. Veja [método e verificações](docs/quality/REDE-E-COMPARADORES.md).

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
| `npm run content:build` | Geração offline de manifesto, shards, busca, adjacência e layouts |
| `npm run test:content` | Equivalência, determinismo e integridade dos artefatos |

O build produz saída estática para hospedagem, incluindo as rotas de conteúdo conhecidas no momento. Não há servidor Express ou API neste bootstrap. A busca da Home abre `/conhecimento`: consulta local ao índice global de entidades, fontes, exemplos metodológicos e leituras, gerado no build, sem API remota de pesquisa.

Para conferir a saída estática localmente, execute `npm run build` e `npm run preview`; o servidor escuta somente em `127.0.0.1:4305`. Se a porta estiver ocupada, defina `ATLAS_PREVIEW_PORT` para preview e E2E; o padrão continua 4305. A configuração de CI, os testes de navegador e os bloqueios de indexação do piloto estão documentados em [Piloto e verificações](docs/quality/PILOTO-E-VERIFICACAO.md).

O grafo editorial e suas fontes ficam em coleções com hash, referenciadas por `src/content/knowledge/manifest.json`. O build valida o conjunto com Zod e gera assets compactos, busca, relações reversas e layouts em `generated/content`; a aplicação lê os arquivos locais com cache e TransferState. O grafo não é importado pelo bundle cliente. Os hooks dos comandos npm geram os derivados antes de iniciar, testar, verificar ou compilar. Veja [dados e carregamento](docs/architecture/DADOS-E-CARREGAMENTO.md) e [as decisões da arquitetura](docs/architecture/ARCHITECTURE.md).

Consulte o [índice da documentação](docs/README.md) para escopo, padrões de design, qualidade e referências.

A ingestão exige `--capture <diretório novo>` ou `--offline <captura>`, com `--output <arquivo>` para uma saída isolada. Configuração, grafo de entrada e respostas brutas ficam versionados fora do site; Zod valida o resultado antes de substituir snapshots. Veja [Ingestão reproduzível](docs/architecture/INGESTAO-REPRODUZIVEL.md).

## Organização do código

A aplicação usa features para ideologias, exploração e estudo; core para conteúdo/infraestrutura; shared para UI/diretivas; layouts para o shell e pages para Home. Consulte [Arquitetura](docs/architecture/ARCHITECTURE.md) para limites de imports, convenções e como adicionar uma tradição ou interação.
