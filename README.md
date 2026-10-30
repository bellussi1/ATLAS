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
- `/explorar` — área de exploração histórica
- `/estudar` — área de trilhas de estudo
- `/sobre` — missão do projeto
- Qualquer caminho desconhecido — página 404 da aplicação

O campo de busca da página inicial é apenas uma prévia visual e não recebe consultas nem apresenta resultados.

## Comandos

| Comando | Uso |
| --- | --- |
| `npm start` | Servidor local com recarga automática |
| `npm run build` | Compilação de produção e prerender de rotas públicas |
| `npm test` | Testes unitários Vitest em execução única |
| `npm run lint` | ESLint para TypeScript e templates Angular |
| `npm run typecheck` | Checagem TypeScript da aplicação e dos testes |

O build produz saída estática para hospedagem. Não há servidor Express ou API neste bootstrap. O conteúdo editorial e a identidade visual final serão preparados em etapas posteriores; as áreas ainda vazias informam esse estado sem simular artigos ou resultados.
