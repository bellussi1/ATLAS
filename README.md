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

O servidor de desenvolvimento abre em `http://localhost:4200`. A aplicação usa Angular standalone, TypeScript strict, Angular Router e SCSS. Tailwind CSS está configurado para as próximas etapas de interface.

## Rotas iniciais

- `/` — apresentação e pontos de entrada
- `/explorar` — índice navegável das oito categorias editoriais
- `/explorar/:tipo` — índice de uma categoria
- `/explorar/:tipo/:slug` — página de detalhe editorial ou de metodologia
- `/verbete/:slug` — verbete carregado do registro JSON estático e validado
- `/estudar` — apresentação do formato de trilhas
- `/estudar/como-usar-trilhas` — exemplo de metodologia de estudo
- `/sobre` — missão do projeto
- `/laboratorio` — índice das três propostas experimentais de direção visual (início, artigo e perfil), sem alterar a identidade de produção
- Qualquer caminho desconhecido — página 404 da aplicação

Na página inicial, “Tenho uma dúvida” abre um verbete de metodologia; “Quero explorar” abre o índice editorial e “Quero estudar” abre a apresentação de trilhas. O campo de busca continua sendo apenas uma prévia visual: não recebe consultas nem apresenta resultados.

As páginas exemplares de verbete, artigo e atlas explicam a metodologia do ATLAS e não apresentam afirmações históricas. Os outros formatos têm páginas provisórias identificadas como previstos. Veja o [sitemap e os tipos editoriais](docs/INFORMATION-ARCHITECTURE.md).

## Comandos

| Comando | Uso |
| --- | --- |
| `npm start` | Servidor local com recarga automática |
| `npm run build` | Compilação de produção e prerender de rotas públicas |
| `npm test` | Testes unitários Vitest em execução única |
| `npm run lint` | ESLint para TypeScript e templates Angular |
| `npm run typecheck` | Checagem TypeScript da aplicação e dos testes |

O build produz saída estática para hospedagem, incluindo as rotas de conteúdo conhecidas no momento. Não há servidor Express ou API neste bootstrap. A busca ainda não está disponível; páginas históricas temáticas serão preparadas após curadoria e revisão de fontes.

O registro inicial de metodologia fica em `src/content/atlas.json`, é validado por `ContentRepository` com Zod e copiado para a saída do build em `content/`. No navegador, o serviço lê esse asset estático; durante o prerender usa o JSON empacotado para evitar chamadas dependentes de browser. Apenas os slugs conceituais presentes nesse registro são prerenderizados. Veja [as decisões e limites da arquitetura](docs/ARCHITECTURE.md).

As três composições experimentais do prompt 04, suas decisões visuais e capturas estão em [Direção artística](docs/DIRECAO-ARTISTICA.md).
