# PROMPT 01 — CONFIGURE Codex e governança, criando arquivos reais

O ATLAS é uma aplicação **Angular moderna**, já inicializada pelo Prompt 00. Esta tarefa deve **escrever/alterar arquivos**, não somente sugerir uma configuração.

1. Leia `package.json`, README e código Angular real. Preserve implementações. Verifique versão instalada do Codex, recursos de subagentes, modelos e esforços de raciocínio. **Não invente parâmetros TOML nem identificadores**.
2. Crie/atualize `AGENTS.md` na raiz: missão, stack Angular, roteamento, Signals, Angular CDK, SCSS/Tailwind, SSG quando disponível, comandos testados, padrão de testes, acessibilidade, fontes, direitos autorais, critérios de aceite e política de integração.
3. Se o cliente Codex realmente suportar papéis personalizados, crie `.codex/config.toml` e configurações de agentes sob `.codex/agents/`: frontend (Angular UI), editorial (fontes e direitos), QA (testes), arquitetura (integração). Limite paralelismo a 1 por padrão. Não configure opções sem suporte documental.
4. Inspecione as skills Impeccable e Taste Skill se instaladas; registre como acioná-las sem prometer que bastam para gerar bom design. Não instale software externo sem verificar origem.
5. Crie `docs/CODEX-WORKFLOW.md` com comandos, papéis efetivamente disponíveis e exemplos de delegação, nunca resultados inventados.
6. Execute checagens de config suportadas e os scripts do projeto. Corrija problemas introduzidos.

**Aceite:** `AGENTS.md` integrado ao repositório, configuração válida quando suportada, workflow documentado, validações reais executadas. Sem perguntas para autorização de detalhes já decididos. Não avance ao Prompt 02.
