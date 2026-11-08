Status: atual
Última verificação: 08/11/2026

# Documentação do ATLAS

Mapa da documentação. Comece pelo [contexto vivo](archive/2026-11/active-context-history.md); ele diz o que está acontecendo agora. Este índice separa **estado atual**, **planos** e **histórico** para que um documento antigo não seja lido como fonte do presente.

## Comece aqui

| Documento | Para que serve |
|---|---|
| [Contexto vivo](archive/2026-11/active-context-history.md) | Handoff curto: estado, verificações, trabalho ativo, pendências e próxima ação |
| [Contrato do projeto](../AGENTS.md) | Regras obrigatórias de arquitetura, conteúdo, testes e integração |
| [Sistema de prompt](agents/PROMPT-SYSTEM.md) | Que camada carregar, quando e em que ordem |

## Estado atual

| Documento | Assunto | Status |
|---|---|---|
| [Escopo atual](product/ESCOPO-ATUAL.md) | Produto, rotas e limites vigentes | atual |
| [Arquitetura](architecture/ARCHITECTURE.md) | Camadas, dependências, rotas e governança | atual |
| [Dados e carregamento](architecture/DADOS-E-CARREGAMENTO.md) | Manifesto, hashes, cache, partição e projeção `network` | atual |
| [Fluxo de população](architecture/FLUXO-DE-POPULACAO.md) | Pipeline editorial de uma tradição, da descoberta à publicação | atual |
| [Diagnóstico da exploração](architecture/EXPLORACAO-CONTEXTUAL.md) | Contratos e decisões da exploração contextual | atual |
| [Ingestão reproduzível](architecture/INGESTAO-REPRODUZIVEL.md) | Capturas, hashes e replay | atual |
| [Padrão de páginas](design/PAGE_STANDARD.md) | Contrato editorial e visual das leituras | atual |
| [Sistema de design](design/SISTEMA-DE-DESIGN.md) | Primitivas, tipografia, cores e acessibilidade | atual |
| [Guia de voz](design/GUIA-DE-VOZ.md) | Como escrever para o leitor, atribuição e revisão | atual |
| [Tipos do grafo](design/GRAFO-TIPOS.md) | Nós, formas e famílias de relação | atual |
| [Rótulos do grafo](design/GRAFO-ROTULOS.md) | Colocação, orçamento e leitura dos nomes | atual |
| [Imagens de abertura](design/IMAGENS-DE-ABERTURA.md) | Curadoria, licença e fallback visual | atual |
| [Revisão de capítulos](design/REVISAO-DE-CAPITULOS.md) | Perguntas editoriais e fichas por capítulo | atual |
| [Retenção de leitura](design/READING_RETENTION.md) | Como o ponto de leitura e o retorno são preservados | atual |
| [Produção](operations/PRODUCAO.md) | Deploy, Cloudflare Pages, R2, segredos e CI | atual |
| [Dependências](reference/DEPENDENCIES.md) | Biblioteca, versões e decisões técnicas | referência |
| [Auditoria de dependências](reference/AUDITORIA-DEPENDENCIAS.md) | Alerta e tratamento de vulnerabilidades | referência |
| [Fluxo Codex](reference/CODEX-WORKFLOW.md) | Papéis e operação do agente Codex | referência |
| [Conferência editorial](reference/CONFERENCIA-EDITORIAL.md) | Checklist de conferência | referência |

## Planos e pesquisas

Nada aqui é estado publicado. São hipóteses, cronogramas ou decisões que ainda dependem de aprovação.

| Documento | Assunto | Status |
|---|---|---|
| [Itinerários editoriais](design/ITINERARIOS.md) | Produto, contrato, pilotos e fases 0–5 | plano |
| [Expansão com Haiku e Sonnet](research/PLANO-EXPANSAO-HAIKU-SONNET-2026-11.md) | Diagnóstico, ondas, custos e orçamento | plano |
| [Linha de base da expansão](research/EXPANSAO-BASELINE-2026-11.md) | Inventário, órfãs e o peso dos links de navegação | atual |
| [Onda 1 — calibração Haiku](research/ONDA1-CALIBRACAO-2026-11.md) | Amostra de 20 artigos, custo e fila humana de 100 itens | plano |
| [Gold set](research/gold-set-2026-11/README.md) | 87 relações documentadas, 40 afirmações e 20 pares para conferência humana | plano |
| [Mapa de leituras](research/readings-map.md) | Próximas leituras: Trabalhismo, Vargas, 1964, ditadura | plano |
| [Baseline das ideologias](research/ideologies-baseline.md) | Medição inicial de cobertura | histórico |
| [Proposta de contrato das seções](research/ideologies-section-contract-proposal.md) | Desenho da página V4 | histórico |
| [Auditoria do 12axes](research/12axes-audit.md) | Estudo externo de referência | histórico |

## Histórico

| Documento | Conteúdo |
|---|---|
| [Arquivo de novembro/2026](archive/2026-11/README.md) | Índice do arquivo |
| [Contexto vivo — histórico](archive/2026-11/active-context-history.md) | As 58 entradas anteriores, com decisões e verificações |
| [Auditoria de UX/UI](archive/2026-11/audits/AUDITORIA-UX-UI-2026-11-02.md) | Auditoria de 02/11/2026 |
| [Validações](archive/2026-11/quality/) | Relatórios de exploração, dados, ingestão, rede, posições e idiomas |
| [Planos executados](archive/2026-11/superpowers/plans/) | Planos de implementação de 01/11/2026 |
| [Prompts de construção](archive/2026-11/prompts/) | Prompts numerados preservados como registro de execução |
| [Editorial](archive/2026-11/editorial/) | Revisão de traduções e lacuna editorial |

## Fonte canônica por assunto

| Assunto | Fonte única | Não duplicar em |
|---|---|---|
| Estado atual e próxima ação | `ACTIVE_CONTEXT.md` | Entradas históricas, README, prompts |
| Regras do projeto | `AGENTS.md` | Documentos de camada |
| Produto e escopo | `product/ESCOPO-ATUAL.md` | README, planos |
| Arquitetura e camadas | `architecture/ARCHITECTURE.md` | README, relatórios |
| Dados, manifesto e cache | `architecture/DADOS-E-CARREGAMENTO.md` | Documentos de qualidade arquivados |
| Pipeline editorial | `architecture/FLUXO-DE-POPULACAO.md` e skills | Planos e relatórios |
| Voz e atribuição | `design/GUIA-DE-VOZ.md` | Páginas e componentes |
| Página e leitura | `design/PAGE_STANDARD.md` | README, auditorias |
| Deploy e operação | `operations/PRODUCAO.md` | README, contexto histórico |
| Roteamento de agentes | `agents/PROMPT-SYSTEM.md` | README, AGENTS |

## Como atualizar

1. **Decisão que vale hoje** → documento canônico do assunto, com data e motivo.
2. **Trabalho da sessão** → uma entrada no arquivo do mês, não no `ACTIVE_CONTEXT`.
3. **Estado atual** → `ACTIVE_CONTEXT.md`, em no máximo ~150 linhas.
4. **Plano** → `research/` ou `design/` com `Status: plano` e critério de saída.
5. **Registro histórico** → `archive/<ano-mês>/`, com data e sem reescrever evidência.
6. **Regra nova** → `AGENTS.md`; não criar uma segunda fonte de regras.

## Convenções

- Todo documento começa com `Status: atual | plano | histórico | referência` e `Última verificação`.
- Links internos devem ser relativos e verificados.
- Datas usam `dd/mm/aaaa`.
- Medições antigas permanecem no arquivo; não são promovidas a métricas atuais.
- O `ACTIVE_CONTEXT` não é um diário: o diário é o arquivo do mês.
