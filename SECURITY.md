# Política de segurança

## Versões com suporte

Mantemos apenas a versão em `master`, publicada em [atlas-bellussi.pages.dev](https://atlas-bellussi.pages.dev).

## Como reportar uma vulnerabilidade

**Não abra uma issue pública.** Use o relato privado do GitHub: aba **Security**, **Report a vulnerability** (ou <https://github.com/bellussi1/ATLAS/security/advisories/new>).

Inclua o que ajuda a reproduzir: rota ou arquivo afetado, passos, impacto esperado e, se possível, uma sugestão de correção.

Respondemos assim que possível. É um projeto voluntário, então não há prazo garantido, mas vulnerabilidades têm prioridade sobre o resto.

## O que consideramos no escopo

- Código da aplicação e dos scripts deste repositório.
- Cabeçalhos de segurança e política de conteúdo (CSP) do site.
- Integridade do conteúdo publicado: o build recusa objetos com tamanho ou SHA-256 divergente.

## Segredos

Credenciais (R2, API da Anthropic) ficam fora do repositório, em variáveis de ambiente ou em `~/.atlas/`. Se você encontrar uma credencial exposta, reporte pelo canal privado acima.

## Problemas de conteúdo

Erros históricos, fontes faltando e problemas de licença **não** são vulnerabilidades: abra uma issue com o modelo `conteúdo`.
