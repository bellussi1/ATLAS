# Mídia e cards nas leituras de ideologia (Prompt 03)

Data: 02/11/2026. Revisão por agente, sem revisão humana.

## Auditoria (antes)

OBSERVADO a 1280 px, todas as `<img>` da página (incluindo acervo e logos), conforme [baseline](../research/ideologies-baseline.md):

| Rota        | `<img>` | Arquivos únicos | Exemplo de repetição na narrativa                                       |
| ----------- | ------- | --------------- | ----------------------------------------------------------------------- |
| Liberalismo | 44      | 15              | Locke em origens, princípios, pensadores e experiências, além do acervo |
| Marxismo    | 42      | 21              | Gramsci em épocas, pensadores, vertentes e experiências, além do acervo |

Causas:

- Os cards de exploração escolhiam imagem por bloco, sem conhecer o resto da página.
- Blocos `entities` de documentos (origens) repetiam os retratos da galeria de pensadores.

Situação já correta:

- Todas as imagens têm `width`/`height` reservados, `loading="lazy"` e licença e atribuição vindas do snapshot.
- Nenhuma imagem quebrada.

## Política de unicidade

Implementada em `src/app/features/ideologies/utils/page-media-plan.ts` (`planPageMedia`):

1. **Uma imagem aparece uma vez na narrativa.** A unidade é o `assetPath`. Retratos diferentes da mesma pessoa contam como imagens distintas.
2. **Retratos pertencem à galeria de pensadores** (`entities` com `mode: thinkers`), mesmo que um capítulo anterior cite a pessoa.
3. Outros cards de entidade e, depois, os cards de exploração recebem só imagens ainda não usadas, em ordem de leitura. Nos cards, a preferência é acontecimento, obra, instituição, ideologia, conceito e, por último, pessoa. Sem imagem livre, o card fica tipográfico, sem placeholder inventado.
4. **Repetição justificada**, fora da regra:
   - a galeria do acervo (`atlas`, capítulo `conexoes`), que é um catálogo;
   - a ficha ampliada do registro selecionado na timeline, que é um detalhe sob demanda.
5. Só entram imagens com `status: known`, `reproduction: allowed`, licença, URL de licença, atribuição e página do arquivo (`reproducibleAsset` + `entityMedia`).

## Interação (sem mudança neste prompt)

- Os cards já são `<button>` com `appKnowledgeContext`. Abrem a ficha contextual, que é um diálogo com Escape e retorno de foco, e mostram uma pista persistente ("Explorar fundamento e fontes +", "Abrir contexto +").
- Não há botões aninhados.
- Lightbox de imagem só no acervo (`image-expand`).

## Resultado (depois)

| Rota        | `<img>` na narrativa | Únicos | Repetições |
| ----------- | -------------------- | ------ | ---------- |
| Liberalismo | 12                   | 12     | 0          |
| Marxismo    | 19                   | 19     | 0          |

Testes:

- `page-media-plan.spec.ts`: prioridade do retrato, primeira ocorrência, ausência de licença e caminho único.
- E2E `pages.spec.ts`: nenhuma repetição fora do acervo nas duas rotas.

## Pendências

- Não houve auditoria de crop e qualidade por arquivo (dimensões, hash), nem captura de hover e lightbox em mobile.
- Cards sem imagem convivem com cards ilustrados no mesmo grid. Avaliar ritmo visual no Prompt 06.
