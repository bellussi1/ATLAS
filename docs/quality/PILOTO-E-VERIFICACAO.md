# Piloto e verificações

**Piloto privado:** todas as páginas têm `noindex, nofollow`; `robots.txt` bloqueia a varredura; o sitemap está vazio. Não há domínio aprovado nem página histórica com revisão humana concluída. Antes de permitir indexação: registrar o domínio canônico, selecionar páginas com aprovação editorial comprovada, gerar URLs absolutas no sitemap e remover os bloqueios só dessas páginas. `robots.txt` sozinho não desindexa URLs já conhecidas.

**Reprodução:** Node 24, npm 11, então `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run check:links`, `npx playwright install chromium` e `npm run test:e2e`. O build valida o grafo pelo Zod, que exige correspondência de estado de revisão e identificação e data nos estados concluídos. Os testes de schema cobrem referências e estados. O verificador percorre links internos do HTML prerenderizado; não verifica destinos externos nem links que só aparecem após interação.

**Cabeçalhos:** `npm run preview` serve a saída em `127.0.0.1:4305` com os cabeçalhos de `public/_headers`. Esse arquivo serve a provedores que suportam o formato; outros precisam configurar os mesmos cabeçalhos. A política permite estilos inline exigidos pelo Angular; conferir no provedor antes da publicação.

**CSP com hashes:** o build calcula SHA-256 dos scripts inline gerados pelo Angular em todas as páginas prerenderizadas e os acrescenta ao `_headers` da saída. Inclui `unsafe-hashes` para o manipulador de carregamento de CSS, autorizado pelo hash de `this.media='all'`. Publicar o arquivo gerado em `dist/atlas/browser`, pois o fonte tem só a política base. Cada build recalcula os hashes.

**Playwright e axe:** visitam as rotas principais e rodam axe na home, verificando violações críticas detectáveis automaticamente. Não substitui auditoria de acessibilidade, revisão humana, verificação de links externos ou testes em outros navegadores. O workflow do GitHub Actions não recebe segredos e não faz deploy.

**Dependências:** em 31/10/2026, a instalação informou 33 vulnerabilidades moderadas no `npm audit`. `npm audit fix` não foi aplicado automaticamente. Avaliar as cadeias afetadas e as atualizações compatíveis antes da publicação.
