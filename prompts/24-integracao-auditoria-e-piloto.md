# PROMPT 24 — Integração, experiência, auditoria e piloto V2

## Missão

Audite e corrija **o ATLAS integrado**, sem publicar conteúdo não aprovado, com foco em rigor histórico, continuidade exploratória, acessibilidade e qualidade de interação. Este prompt é execução concreta: testes, correções e provas, não apenas relatório.

## 1. Segurança do repositório

Inspecione `git status`, commits, `AGENTS.md`, CI, documentação e rotas. Não descarte trabalho, não force updates, não publique sem autorização. Não converta rascunhos em revisados e não altere licenças sem verificar. Identifique quais módulos 13–23 de fato foram executados e não assuma sua existência apenas pelo nome dos prompts.

## 2. Matriz de cobertura editorial

Para cada atlas implementado, inventarie entidades, artigos, afirmações, fontes, licenças, datas, relações, revisores humanos efetivamente registrados e páginas indexáveis. Detecte duplicações, inconsistências temporais, localizadores inválidos, associações confundidas com causalidade, fontes não localizáveis e imagens sem direitos claros. Bloqueie somente a publicação do conteúdo afetado; preserve rascunhos explícitos. Nunca invente pareceres de revisão.

## 3. Testes de jornada — UX exploratória

Implemente e execute Playwright para jornadas reais representativas: 

1. Busca → personalidade → obra/ideia → divergência → outra personalidade → retorno ao ponto anterior.
2. Evento → timeline → outro período → documento ou artigo → fonte e metadados.
3. Ideologia → subcorrente → comparação → tese atribuída → bibliografia.
4. Atlas Brasil → contexto econômico → política pública → instituição.
5. Estudo → exercício → feedback → nova tentativa → exportação/importação do progresso.

As jornadas devem usar apenas rotas e relações verdadeiramente existentes. Quando faltarem dados, registre a impossibilidade e teste um caminho menor real. Verifique URLs, estado selecionado, restauração de scroll e alternativas acessíveis.

## 4. Auditoria de linguagem visual e movimento

Compare aplicação em funcionamento com os conceitos modernismo suíço + atlas editorial + arquivo digital e o design system vigente. Avalie ritmo de página, contraste, tipografia, densidade, descoberta, interação e profundidade sem transformar o ATLAS em SaaS ou museu de efeitos. Registre decisões em um único documento durável. Faça correções concretas nas maiores regressões, sem redesign global arbitrário. Teste movimento normal e reduzido; não trate screenshot estático como prova de interação.

## 5. Acessibilidade e performance

Testar desktop/mobile 320/390/768/1280 px (ou equivalentes reais), teclado, leitor de tela quando disponível, reflow/zoom quando verificável, ARIA, legendas e alternativa tabular de gráficos, foco após fechar painéis, reduced motion, contraste, estado vazio, rede lenta. Use axe como auxílio e declare limites da auditoria manual. Meça efeito das visualizações no carregamento e no bundle e evite regressões.

## 6. Segurança, CI e SEO

Rode testes, lint, typecheck, build, links, análise de dependências e CI remota apenas se o repo estiver conectado/autorizado; diga quando não for possível. Preserve `noindex` para páginas não revisadas e não declare site publicável sem domínio, revisão e verificação real do ambiente. Valide CSP e SSG das páginas, metadados, navegação e ausência de segredos.

## 7. Protocolo de piloto

Prepare protocolo para voluntários, com consentimento, perfis (iniciante, estudante, professor, leitor experiente), tarefas objetivas, indicadores de compreensão e usabilidade, instrumentos de feedback e privacidade. Não invente usuários, sessões ou resultados. Entregue checklist para publicação gradual e uma classificação objetiva de bloqueadores.

## Critérios de aceite

- [ ] Auditoria editorial baseada em dados reais e bugs priorizados.
- [ ] Testes E2E de relações e estudo executados com resultados explícitos.
- [ ] Experiência de navegação e motion inspecionada no navegador (normal/reduzido).
- [ ] Problemas críticos de implementação corrigidos; bloqueadores humanos declarados.
- [ ] CI, build, links, dependências e status de publicação relatados sem exagero.
- [ ] Capturas e evidências de pelo menos desktop e mobile.
- [ ] Nenhum conteúdo gerado por IA promovido automaticamente a revisão humana.
- [ ] Commits locais coerentes e sem alterações esquecidas.

Não execute outro prompt, não faça push/deploy sem autorização e não feche a auditoria com um checklist genérico.
