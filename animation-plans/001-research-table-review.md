# Revisão aplicada da mesa de pesquisa

Escopo: home e prévia de leitura, Angular 21, CDK Dialog, CSS e WAAPI. Auditoria com improve-animations/AUDIT.md e revisão final 12-principles-of-animation; implementação pela skill animate. As rotas de laboratório preservadas são referências deliberadas e não fazem parte desta auditoria.

## Oportunidades avaliadas antes da execução

| Local | Frequência e propósito | Receita aplicada |
| --- | --- | --- |
| Troca de ficha por ponteiro | Ocasional; tornar a mudança de estado legível | opacity .45 → 1, 180ms, --ease-out, WAAPI cancelável |
| Abertura da prévia por ponteiro | Ocasional; evitar aparecimento abrupto | opacity, --motion-standard (200ms), --ease-out, CSS @starting-style |
| Pressão nos controles da mesa | Frequente; feedback discreto | transform scale(.98), 140ms, --ease-out, excluindo focus-visible |

Rejeitados: entradas de página, rotação animada de documentos, transição em teclado e animação contínua de nós. Falham no critério frequência/função e deslocariam conteúdo durante a leitura. A rotação da ficha vermelha é composição estática; não é uma animação.

## Achados e execução

| Regra | Evidência inicial | Correção |
| --- | --- | --- |
| Easing/coerência | styles.scss: preview-arrive usava ease-out genérico e translateY | Removido; entrada por opacidade com token --ease-out |
| Frequência/teclado | reading-preview.ts aplicava a mesma classe a qualquer clique | detail=0 abre imediatamente; classe animada exclusiva de ponteiro |
| Interrupção | Trocas de conteúdo poderiam sobrepor animações | Cancelar Animation anterior antes da seleção seguinte |
| Responsividade | Índice completo atrasava o acesso à ficha móvel | Seletor nativo compacto; mesmos dados e ações |
| Composição | Desenhos repetidos não eram necessários à navegação | Removidos da versão final |

## Revisão dos 12 princípios

timing-under-300ms: seleção 180ms, pressão 140ms, painel 200ms. timing-consistent: durações e curva compartilhadas. physics-subtle-deformation: .98, sem overshoot. physics-active-state: feedback de pressão para ponteiro; teclado imediato por decisão explícita. staging-one-focal-point: apenas a ficha selecionada muda. staging-dim-background e z-index-hierarchy: CDK Dialog preserva backdrop e camada modal. Sem stagger, menus de contexto, áudio ou gestos físicos; regras correspondentes não se aplicam. Fechamento imediato, sem animação de saída.

prefers-reduced-motion remove o movimento de pressão e impede a WAAPI; o mecanismo global preservado elimina transições de entrada. Isso atende ao pedido do projeto de permitir exploração com movimento reduzido. Não foi medido frame rate em hardware móvel físico.


## Evidências finais

- src/styles.scss:144 — entrada do painel agora usa opacidade e token compartilhado.
- src/app/shared/reading-preview.ts:54 — teclado usa classe instantânea.
- src/app/pages/home-page.ts:32 — cancelamento antes de iniciar nova animação.
- src/app/pages/home-page.ts:37 — seleção com token de duração e curva forte.
- No navegador, duas seleções rápidas resultaram em uma animação ativa de 180ms com cubic-bezier(0.23, 1, 0.32, 1).
- Enter mudou a ficha com zero animações e foco de 3px. Em reduced motion a seleção móvel também teve zero animações.
- Medições em 390 e 320 px não apresentaram largura de documento maior que a viewport.

| Regra final | Pendências no escopo |
| --- | --- |
| timing-under-300ms, timing-consistent | 0 |
| physics-subtle-deformation, staging-one-focal-point | 0 |
| Entrada por teclado sem animação, interruption | 0 |
| Reduced motion, focus, backdrop | 0 |

A aprovação estética depende do usuário; a auditoria não comprova aumento de interesse nem conformidade WCAG integral.


Resultado dos comandos finais: npm test — 93 testes em cinco arquivos; npm run build — 36 rotas pré-renderizadas; npm run lint e npm run typecheck — sem erros; git diff --check — sem erros. A sequência ponteiro → teclado foi verificada no Chrome e terminou com zero animações ativas.
