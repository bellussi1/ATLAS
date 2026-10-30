# Fluxo de trabalho do Codex no ATLAS

Este documento descreve a configuração verificada neste repositório em 30/10/2026. A configuração de projeto em `.codex/config.toml` só é carregada pelo Codex quando o projeto é confiável no cliente.

## Ambiente detectado

- Codex CLI instalado: `codex-cli 0.166.0-alpha.5.1`.
- App Codex: build `26.1027.30824`, canal `prod`, estado reportado `up_to_date`.
- Recurso `multi_agent`: `stable`, habilitado no resultado de `codex features list`.
- Concorrência de subagentes definida no repositório: `1` thread simultânea.
- Modelos e esforços mostrados pelo comando local `codex debug models`:

| Modelo | Esforços disponíveis | Padrão informado pelo catálogo |
| --- | --- | --- |
| `gpt-6.1-sol` | low, medium, high, xhigh, max, ultra | low |
| `gpt-6-astra` | low, medium, high, xhigh, max, ultra | low |
| `gpt-6.1-terra` | low, medium, high, xhigh, max, ultra | low |
| `gpt-6-sol` | low, medium, high, xhigh, max, ultra | medium |
| `gpt-reserve` | low, medium, high, xhigh, max | medium |
| `gpt-6-luna` | low, medium, high, xhigh, max | medium |
| `gpt-5.6-sol` | low, medium, high, xhigh, max, ultra | low |
| `gpt-5.6-terra` | low, medium, high, xhigh, max, ultra | medium |
| `gpt-5.6-luna` | low, medium, high, xhigh, max | medium |
| `codex-auto-review` | low, medium, high, xhigh, max | medium |

Esse é o catálogo observado nesta instalação; disponibilidade pode variar conforme cliente, conta e workspace. A configuração do repositório não fixa modelo nem esforço para os agentes.

## Papéis configurados

Os papéis abaixo são declarados em `.codex/config.toml`; as instruções específicas ficam em `.codex/agents/`.

| Papel | Escopo |
| --- | --- |
| `frontend` | UI Angular, componentes existentes, acessibilidade e identidade editorial |
| `editorial` | Evidência histórica, contexto, classificação de afirmações e direitos de uso |
| `qa` | Verificações pertinentes, rotas, testes, acessibilidade aplicável e regressões |
| `architecture` | Integração, roteamento, prerender e compatibilidade arquitetural |

Exemplos de pedidos ao Codex:

- “Delegue a revisão desta página ao papel `frontend`; não altere arquivos até devolver os achados.”
- “Use o papel `editorial` para conferir as fontes e os direitos destas afirmações e proponha correções citando evidências verificáveis.”
- “Peça ao papel `qa` para executar os testes pertinentes ao diff e registrar os comandos e resultados reais.”
- “Use `architecture` para revisar se a nova rota preserva standalone, Router e prerender estático.”

A disponibilidade e a forma de delegação dependem do cliente Codex ativo. A declaração da configuração ajuda o Codex a selecionar um papel, mas não substitui revisão do agente principal. Mantenha a concorrência em 1 por padrão e nunca delegue edições concorrentes no mesmo arquivo.

## Skills de design instaladas

- **Impeccable** está instalada como skill `impeccable`. Acione em trabalho de interface, por exemplo: `$impeccable audit /` para auditar uma rota ou `$impeccable critique` ao revisar uma direção visual. Também oferece fluxos de documentação, polimento e robustez descritos na própria skill.
- **Taste Skill** está instalada como `design-taste-frontend`. Acione em criação ou reformulação visual com `$design-taste-frontend` para aplicar seu processo de direção visual e inspeção.

Skills orientam o processo; não garantem qualidade por si mesmas. Confirme o resultado contra referências, requisitos do produto, acessibilidade e comportamento real. Não instale ferramentas externas sem conferir a origem.

## Comandos do projeto

Execute na raiz do repositório:

| Comando | Uso |
| --- | --- |
| `npm start` | Servidor Angular de desenvolvimento em `http://localhost:4200` |
| `npm run build` | Build de produção com saída estática e prerender conforme Angular CLI |
| `npm test` | Testes Vitest em execução única |
| `npm run lint` | ESLint para TypeScript e templates |
| `npm run typecheck` | Checagem TypeScript do app e dos testes |
| `codex --strict-config --cd . debug models` | Carregar a configuração de projeto em modo estrito e consultar o catálogo, no Codex CLI compatível |

Rode os comandos pertinentes ao escopo. Para mudanças em telas/rotas, verifique navegação e estados relevantes além de build, lint, testes e tipos. Não registre resultados no workflow; eles pertencem ao relatório da execução que os observou.

## Fontes oficiais de configuração Codex

- [Referência de configuração do Codex](https://developers.openai.com/codex/config-reference) — tabelas de agentes, `config_file`, descrições, limite de concorrência, esforço/modelo e carregamento de configuração de projeto confiável.
- [Colaboração multiagente](https://developers.openai.com/api/docs/guides/agents-api/multi-agent) — conceitos e fluxo de delegação multiagente.
