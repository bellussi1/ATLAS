# Piloto e verificações

O piloto é privado: todas as páginas recebem `noindex, nofollow`, `robots.txt` impede a varredura e o sitemap está vazio. Não existe domínio aprovado nem página histórica com revisão humana concluída no acervo atual. Antes de permitir indexação, é necessário registrar o domínio canônico e selecionar páginas com aprovação editorial comprovada; então gerar URLs absolutas para o sitemap e remover os bloqueios somente dessas páginas. `robots.txt` sozinho não garante desindexação de URLs já conhecidas.

Para reproduzir a verificação: use Node 24 e npm 11, execute `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:links`, `npx playwright install chromium` e `npm run test:e2e`. O build valida o grafo pelo esquema Zod, que exige correspondência de estado de revisão e identificação e data para estados concluídos. Os testes de esquema cobrem referências e estados. O verificador percorre links internos presentes no HTML prerenderizado; não verifica destinos externos nem links que só apareçam após interação.

Após `npm run build`, `npm run preview` serve a saída estática em `127.0.0.1:4305`, sem publicação externa, aplicando os cabeçalhos de `public/_headers`. Esse arquivo descreve cabeçalhos para provedores que suportam o formato; outros serviços precisam configurar os mesmos cabeçalhos na sua própria plataforma. A política permite estilos inline exigidos pela aplicação Angular e deve ser conferida no provedor escolhido antes da publicação.

O build calcula hashes SHA-256 dos scripts inline gerados pelo Angular em todas as páginas prerenderizadas e os acrescenta ao `_headers` da saída. A política inclui `unsafe-hashes` para o manipulador de carregamento de CSS gerado pelo Angular, autorizado pelo hash específico de `this.media='all'`. Publique o arquivo gerado em `dist/atlas/browser`, pois o arquivo fonte contém apenas a política base. Cada novo build recalcula os hashes.

O Playwright visita as rotas principais e executa axe na home, verificando violações críticas detectáveis automaticamente. Isso não substitui auditoria de acessibilidade, revisão humana, verificação de links externos ou teste em outros navegadores. O workflow de GitHub Actions não recebe segredos e não realiza deploy.

Em 31/10/2026, a instalação de dependências informou 33 vulnerabilidades moderadas via `npm audit`; não foi aplicado `npm audit fix` automaticamente. Avaliar as cadeias afetadas e atualizações compatíveis antes da publicação.
