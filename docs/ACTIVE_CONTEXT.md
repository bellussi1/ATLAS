# Contexto vivo do ATLAS

Atualizado em 06/11/2026. Este é o handoff entre sessões: leia no início, atualize no fim com `/handoff`. Não substitui `AGENTS.md` nem os documentos de arquitetura; registra o estado observado e o que está pendente.

## Estado observado

- Repositório: `C:\Users\Bellussi\Documents\Workspace\ATLAS`.
- Gitflow local: `develop` é a integração; trabalho atual na branch `feature/pipeline-relacoes` (sem push).
- `develop` contém a frente `feature/grafos-acervo` (rotas `/grafos` e `/acervo`, layout, hover, skeleton, MCPs).
- Conteúdo: 66 coleções em `content/knowledge`, 60 snapshots em `content/ideologies`, 3 tradições em `content/traditions`.
- Release de conteúdo atual: `613fe8e4…`, publicado no R2; `content/content-pointer.json` atualizado.
- Build: **1.185 rotas prerenderizadas**.

## Verificações desta frente

- `npm test`: **296/296**.
- `npm run test:content`: **170/170**.
- `npm run build`: passou, **1.185 rotas**.
- `npm run test:e2e -- e2e/graph.spec.ts e2e/knowledge-explorer.spec.ts`: **29/29**.
- `npm run lint` e `npm run typecheck` passaram antes das correções de conteúdo; repetir no fechamento.

## O que mudou nesta frente

1. **`membro fundador` não vira `fundou`** — a trava de relação rejeita o tipo quando a citação fala de membro fundador. Teste em `scripts/tradicao/guards.spec.mjs`.
2. **P1142 de pessoa não vira aresta** — rótulos de ideologia do Wikidata em pessoas ficam fora do grafo. Teste em `scripts/content/wiki-drafts-to-collections.spec.mjs`.
3. **Dados corrigidos**: 15 arestas P1142 de pessoas removidas; 8 relações de `membro fundador` reclassificadas; Dilma → PDT passou a "foi membro fundadora de".
4. **Relações curadas com fonte e revisão pendente**:
   - Che Guevara → Revolução Cubana, Fidel Castro e Marxismo.
   - Leon Trótski → Revolução Russa, Comunismo, Stalin, Marx e Lenin.
   - Fernando Haddad → Lula (assumiu a candidatura do PT após o indeferimento).
5. Release `613fe8e4…` publicado; ponteiro atualizado.

## Pendências que bloqueiam

1. **Fechar a frente**: rodar lint/typecheck completos, commitar na `feature/pipeline-relacoes` e integrar na `develop`.
2. **CI `verify`** — repetir depois do merge.
3. **Probe de disponibilidade** — caminho inexistente na Vercel responde 200 em vez de 404.

## Pendências que pedem decisão

4. **Onda 2 do conteúdo** — 414 artigos e 896 extratos extraídos (~US$ 1,65); faltam imagens, conversão, testes e relatório. Não publicar sem aprovação.
5. **Release `0.1.0`** — `release/0.1.0` contém o fluxo; falta CI verde para ativar `develop` remota, proteções e release.
6. **Modelo da extração** — decisão pendente entre Anthropic (saldo de US$ 3,77) e DeepSeek. Recomendação: usar o saldo em um piloto de relações com Haiku/Sonnet; só trocar para DeepSeek após avaliação no `eval.mjs`. Não usar a assinatura Go para lote de dados.

## Limitação conhecida

- O seletor mobile de capítulos (`#reading-chapter-picker`) não navega no preview quando acionado por `selectOption`/evento nativo; o teste verifica o controle e a lista, não a navegação. Investigar a ligação do evento `change` na hidratação.

## Protocolo

- Toda sessão que muda estado termina com `/handoff` ou atualização manual deste arquivo.
- Registre comando executado e resultado; não registre suposição como verificação.
- Links para arquivos e commits, não para transcrições.
