# ATLAS — Auditoria dos prompts originais 05–24 e decisões da V2

## Fonte e escopo

Esta análise usa os 20 arquivos originais enviados pelo usuário (05 a 24). Não é auditoria do repositório Angular real: logs do Codex não substituem inspeção do código.

## Acertos preservados

- 05 define design system acessível, mobile-first, reflow e showroom.
- 06 estabelece fonte, afirmação, citação, revisão e licença, sem promover revisão por IA.
- 07 separa entidades, aliases, relacionamentos direcionais e causalidade documentada.
- 08–09 implementam páginas editoriais, busca, previews, backlinks e rotas válidas.
- 10 prevê visualizações com fonte, método, período, alternativa textual e reduced motion.
- 11 trata estudo, feedback, progresso e versionamento.
- 12 cobre testes, pipeline, segurança e indexação seletiva.
- 13–23 limitam deliberadamente cada atlas a um pequeno lote documentado.
- 24 procura integração e auditoria de publicação.

## Lacunas da versão original

1. **Homogeneidade de módulo:** os onze atlas temáticos pedem a mesma sequência genérica, sem um mecanismo exploratório próprio para seus problemas históricos.
2. **Ausência de contrato de navegação:** não especificam preservar seleção, contexto e retorno entre timeline, grafo, artigo e acervo.
3. **Motion muito pouco operacionalizado:** as etapas temáticas não obrigam estados e transições significativas, controles para toque e reduced motion testado.
4. **Fontes não ligadas à interação:** a visualização é exigida, mas não se explicita a abertura de tese, fonte, incerteza e interpretação por item clicado.
5. **Contradição editorial operacional:** falar em “lote publicável” antes de revisão humana pode ser entendido pelo agente como autorização de publicação; V2 distingue prontidão técnica de autorização editorial.
6. **Critérios de aceite pouco testáveis:** faltavam jornadas E2E distintas por atlas e inspeção de estados mobile, teclado e retorno contextual.
7. **Mapas históricos:** alto risco de fronteiras anacrônicas sem metadados; V2 permite marcadores documentados quando não houver geometrias verificadas.
8. **Risco de crescer conteúdo sobre UI não consolidada:** o mesmo componente abstrato pode ser reutilizado em todos os atlas sem adequar a forma à pergunta do leitor.
9. **Dados de teste:** especificar contagem rígida de entidades pode induzir invenção. V2 exige redução explícita do lote quando faltam fontes.

## Diretrizes finais

- Não refazer 05–12 só porque estes prompts foram atualizados; use o código corrente como fonte de verdade.
- Execute 13, depois 14 etc. **um de cada vez**, sem executar automaticamente o próximo. Ajuste a ordem se existir necessidade editorial concreta.
- Antes de expandir, valide uma jornada exemplar com uma visualização real e relações cruzadas.
- Manter a direção visual aprovada, mas dar **composição e interação própria** a cada módulo.
- Evitar exagerar E2E como evidência de revisão histórica: testes de código e revisão historiográfica são coisas diferentes.
