# Sistema de prompt do ATLAS

Este documento é o mapa das instruções que orientam agentes no repositório. Ele não substitui `AGENTS.md`: diz **o que carregar, quando e em que ordem**.

## Camadas

| Camada | Fonte | Quando carregar |
| --- | --- | --- |
| Contrato do projeto | `AGENTS.md` (auto-carregado) | Sempre |
| Estado vivo | `docs/ACTIVE_CONTEXT.md` | Início e fim de cada sessão |
| Arquitetura | `docs/architecture/ARCHITECTURE.md` | Antes de criar/mover código |
| Padrão editorial | `docs/design/PAGE_STANDARD.md` | Página/dossiê de ideologia |
| Voz | `docs/design/GUIA-DE-VOZ.md` | Todo texto ao leitor |
| Operação | `docs/operations/PRODUCAO.md` | Deploy, R2, Vercel e CI |
| Fluxo de população | `docs/architecture/FLUXO-DE-POPULACAO.md` | Pipeline de tradição |
| Skills | `.claude/skills/`, `.agents/skills/` | Sob demanda, pelo `skill` |
| Comandos | `.opencode/commands/` | Quando o usuário invoca `/...` |
| Agentes | OpenCode embutidos + papéis do Codex | Conforme a tarefa |

## Regras de carregamento

- Não leia `ARCHITECTURE.md` nem `PAGE_STANDARD.md` inteiros por padrão; abra a seção relevante.
- `ACTIVE_CONTEXT.md` é curto e obrigatório no início; se estiver defasado, corrija antes de confiar.
- Skills são carregadas por ID quando a tarefa casa com a descrição; não copie o corpo delas para o prompt.
- Não crie uma skill por ideologia. O renderer é compartilhado; a tradição é dado.
- Não duplique regras de `AGENTS.md` em comandos ou agentes.

## Skills do projeto

| Skill | Usar para |
| --- | --- |
| `atlas-create-ideology` | Criar/ampliar leitura de ideologia no contrato de 12 capítulos |
| `atlas-pipeline-tradicao` | Orquestrar estágios 0–14 de uma tradição |
| `atlas-wiki-discovery` | Descobrir/ingerir entidades de Wikidata, Wikipedia e Commons |
| `atlas-wiki-extracao` | Extrair rascunhos sourced para `atlas-drafts` |
| `atlas-editorial-geometrico` | Identidade visual, composição e interação do ATLAS |

## Comandos

| Comando | Efeito |
| --- | --- |
| `/contexto` | Carrega o estado vivo e resume |
| `/pendencias` | Lista pendências com evidência |
| `/verificar` | Roda a menor verificação pertinente ao diff |
| `/handoff` | Atualiza `ACTIVE_CONTEXT.md` |
| `/tradicao <slug>` | Mostra estágio e cobertura sem publicar |

## Agentes

- **OpenCode**: `build` executa; `plan` mapeia e decide sem editar; `explore` busca; `general` pesquisa. Use `plan` antes de mudanças grandes.
- **Codex**: papéis `frontend`, `editorial`, `qa` e `architecture` em `.codex/agents/`; concorrência 1.
- **Claude**: agentes globais `reviewer` e `test-engineer`; skills globais em `~/.claude/skills`.

## Protocolo de handoff

1. Ao começar: ler `ACTIVE_CONTEXT.md`, `git status`, `git log -5` e o último CI.
2. Ao terminar: atualizar estado, verificações, pendências e próxima ação; usar `/handoff`.
3. Não registrar transcrição, opinião ou suposição como fato verificado.
4. Se uma decisão mudar o escopo, atualizar `AGENTS.md` ou o doc de produto correspondente.

## Manutenção

- Este mapa muda quando muda a localização de uma skill, comando ou agente.
- `AGENTS.md` continua sendo a fonte única das regras; este documento só roteia.
- `opencode.jsonc` carrega este arquivo em `instructions`; não o transforme em dump de contexto.
