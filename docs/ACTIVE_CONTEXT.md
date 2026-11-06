# Contexto vivo do ATLAS

Atualizado em 06/11/2026. Este é o handoff entre sessões: leia no início, atualize no fim com `/handoff`. Não substitui `AGENTS.md` nem os documentos de arquitetura; registra o estado observado e o que está pendente.

## Estado observado

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow local: `develop` criada a partir de `master`; trabalho na branch `feature/grafos-acervo` (sem push).
- `master` em `b50675e`, 1 commit à frente de `origin/master` (`1a1dde7`).
- Conteúdo: 66 coleções em `content/knowledge`, 60 snapshots em `content/ideologies`, 3 tradições em `content/traditions`.
- Release de conteúdo atual: `73e2c2bf…`, publicado no R2; `content/content-pointer.json` atualizado.
- Build: **1.185 rotas prerenderizadas**.
- Verificações desta frente: `npm test` **296/296**, `npm run lint` e `npm run typecheck` passaram, `npm run test:content` **169/169**, e2e **131/132** com uma falha intermitente em `contextual-exploration` (390px, toque); o teste foi estabilizado e passou isolado.

## O que mudou nesta frente

1. Layout da rede pré-calculado no build (`layouts.network`) e usado pelo `GraphComponent`, com fallback no cliente.
2. Auditoria de acessibilidade em lotes para bibliografias grandes, com teste próprio.
3. `/rede` → `/grafos`; `/grafo` e `/rede` redirecionam para `/grafos`. `/conhecimento` → `/acervo`; `/conhecimento` e `/comparar` redirecionam para `/acervo`.
4. Hover do grafo restrito ao ícone do nó; a linha de ligação não tem alvo de hover.
5. O shell entra em modo `fullscreen` já no `NavigationStart` de `/grafos`, evitando o header global durante o carregamento.
6. Paginação do acervo marca `aria-busy` e reduz a opacidade durante a troca; loading do grafo ganhou skeleton.
7. Tópicos conceituais que entraram como `event` (`aborto`, `casamento`, `casamento entre pessoas do mesmo sexo`) passam a aparecer como `concept` no grafo, por override editorial testado. `article` já é `work` e `country`/`regime` já são `place` na camada de rede.
8. MCPs adicionados ao `opencode.jsonc`: Angular CLI (read-only), Chrome DevTools e Vercel.

## Pendências que bloqueiam

1. **Commit e integração desta frente** — revisar o diff, criar os commits atômicos na `feature/grafos-acervo` e integrar na `develop` com merge commit; sem push.
2. **CI `verify`** — repetir depois do merge; o último run da `master` ainda é o vermelho anterior.
3. **Probe de disponibilidade** — caminho inexistente na Vercel responde 200 em vez de 404.

## Pendências que pedem decisão

4. **Onda 2 do conteúdo** — 414 artigos e 896 extratos extraídos (~US$ 1,65); faltam imagens, conversão, testes e relatório. Não publicar sem aprovação.
5. **Gitflow e release `0.1.0`** — `release/0.1.0` contém o fluxo; falta CI verde para criar `develop` remota, trocar a branch padrão e aplicar proteções.
6. **Unificação de dados** — país/regime/lugar e obra/artigo já convergem na rede; a migração dos tipos de origem para um contrato único ainda não foi feita.

## Limitação conhecida

- O seletor mobile de capítulos (`#reading-chapter-picker`) não navega no preview quando acionado por `selectOption`/evento nativo; o teste passou a verificar o controle e a lista de capítulos, não a navegação. Investigar a ligação do evento `change` na hidratação antes de considerar o controle pronto.

## Pendências do Codex

- A thread `01a1ae4c` ("Retomar sessões inacabadas do Claude") terminou com duas mensagens sem resposta: "O que era o problema no build?" e o log de 131 testes e2e. O problema do build era o `package-lock.json` sem `@emnapi/core` e `@emnapi/runtime` no Linux e o `ingest:fetch-raw` sem capturas; a correção entrou em `chore/gitflow-ci`.
- `codex/reduce-deployment-storage`: patch equivalente já está na `master`; branch pode ser removida.
- `codex/gitflow-release`: contém `5a4ce6d`, que já está em `release/0.1.0`; não é trabalho paralelo.
- `codex/atlas-v4` e `codex/atlas-editorial-marxismo`: 0 commits à frente da `master`; podem ser removidas.
- Nota de contexto do Codex em `~/.codex/context/projects/atlas.md`.

## Ordem sugerida

1. Commitar na `feature/grafos-acervo` e integrar na `develop` com merge commit.
2. Rodar a verificação completa na `develop`.
3. Com `verify` verde, push e ativação do Gitflow/release (com aprovação).
4. Corrigir o 404 da Vercel e repetir o probe.
5. Relatório da onda 2; publicar só com aprovação.

## Protocolo

- Toda sessão que muda estado termina com `/handoff` ou atualização manual deste arquivo.
- Registre comando executado e resultado; não registre suposição como verificação.
- Links para arquivos e commits, não para transcrições.
