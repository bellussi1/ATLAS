Status: atual
Última verificação: 08/11/2026

# Fluxo de trabalho do Codex no ATLAS

Configuração verificada neste repositório em 30/10/2026. `.codex/config.toml` só é carregado pelo Codex quando o projeto é confiável no cliente.

## Ambiente detectado

- Codex CLI: `codex-cli 0.166.0-alpha.5.1`.
- App Codex: build `26.1027.30824`, canal `prod`, estado `up_to_date`.
- Recurso `multi_agent`: `stable`, habilitado em `codex features list`.
- Concorrência de subagentes definida no repositório: **1** thread simultânea.

Modelos e esforços do comando `codex debug models` nesta instalação:

| Modelo | Esforços disponíveis | Padrão do catálogo |
|---|---|---|
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

Catálogo observado nesta instalação; disponibilidade varia conforme cliente, conta e workspace. A configuração do repositório não fixa modelo nem esforço dos agentes.

## Papéis configurados

Declarados em `.codex/config.toml`; instruções específicas em `.codex/agents/`.

| Papel | Escopo |
|---|---|
| `frontend` | UI Angular, componentes existentes, acessibilidade e identidade editorial |
| `editorial` | Evidência histórica, contexto, classificação de afirmações e direitos de uso |
| `qa` | Verificações pertinentes, rotas, testes, acessibilidade aplicável e regressões |
| `architecture` | Integração, roteamento, prerender e compatibilidade arquitetural |

Exemplos de pedidos:

- "Delegue a revisão desta página ao papel `frontend`; não altere arquivos até devolver os achados."
- "Use o papel `editorial` para conferir as fontes e os direitos destas afirmações e proponha correções citando evidências verificáveis."
- "Peça ao papel `qa` para executar os testes pertinentes ao diff e registrar os comandos e resultados reais."
- "Use `architecture` para revisar se a nova rota preserva standalone, Router e prerender estático."

A disponibilidade e a forma de delegação dependem do cliente Codex ativo. A declaração ajuda o Codex a escolher um papel, mas não substitui a revisão do agente principal. Manter concorrência em 1 e nunca delegar edições concorrentes no mesmo arquivo.

## Skills de design instaladas

- **Impeccable** (`impeccable`): acionar em trabalho de interface, por exemplo `$impeccable audit /` para auditar uma rota ou `$impeccable critique` para revisar uma direção visual. Oferece também fluxos de documentação, polimento e robustez, descritos na própria skill.
- **Taste Skill** (`design-taste-frontend`): acionar em criação ou reformulação visual com `$design-taste-frontend`.

Skills orientam o processo, não garantem qualidade. Confirmar o resultado contra referências, requisitos, acessibilidade e comportamento real. Não instalar ferramentas externas sem conferir a origem.

## Comandos do projeto

Executar na raiz do repositório:

| Comando | Uso |
|---|---|
| `npm start` | Servidor Angular de desenvolvimento em `http://localhost:4200` |
| `npm run build` | Build de produção com saída estática e prerender conforme Angular CLI |
| `npm test` | Testes Vitest em execução única |
| `npm run lint` | ESLint para TypeScript e templates |
| `npm run typecheck` | Checagem TypeScript do app e dos testes |
| `codex --strict-config --cd . exec --ephemeral "Responda apenas: configuração carregada."` | Execução efêmera do Codex CLI com validação estrita da configuração. Exige conexão funcional ao serviço; HTTP e autorização também afetam o resultado |

Para conferir a sintaxe TOML e a existência dos arquivos de papel sem chamar o serviço, usar Python 3.11 ou posterior:

```powershell
python -c "import pathlib,tomllib; root=pathlib.Path('.codex'); cfg=tomllib.loads((root/'config.toml').read_text(encoding='utf-8')); roles={k:v for k,v in cfg['agents'].items() if isinstance(v,dict)}; assert cfg['agents']['max_concurrent_threads_per_session']==1; assert set(roles)=={'frontend','editorial','qa','architecture'}; [tomllib.loads((root/role['config_file']).read_text(encoding='utf-8')) for role in roles.values()]; print('TOML válido')"
```

Essa conferência verifica sintaxe e caminhos, não a aceitação de cada campo pelo Codex; a validação de esquema usa o comando estrito acima quando o serviço está acessível.

Rodar os comandos pertinentes ao escopo. Em telas e rotas, verificar navegação e estados relevantes além de build, lint, testes e tipos. Não registrar resultados no workflow; eles pertencem ao relatório da execução que os observou.

## Fontes oficiais

- [Referência de configuração do Codex](https://developers.openai.com/codex/config-reference): agentes, `config_file`, descrições, limite de concorrência, esforço e modelo, e carregamento de configuração de projeto confiável.
- [Colaboração multiagente](https://developers.openai.com/api/docs/guides/agents-api/multi-agent): conceitos e fluxo de delegação.
