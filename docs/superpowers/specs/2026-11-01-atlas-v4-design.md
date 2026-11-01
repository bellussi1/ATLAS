# ATLAS V4 — decisão de implementação

Pedido: implementar o redesign enviado em 01/11/2026. A execução já foi solicitada; decisões de composição ficam a cargo do implementador.

Página contínua em `/ideologias/marxismo`, oito capítulos centrais, índice com estimativas, progresso e retorno. Hub `/ideologias` com conexões de descoberta rotuladas. Preservar o Liberalismo e os verbetes, redirecionar as duas URLs anteriores do Marxismo. Sem backend e sem dependências novas.

Abordagens: alterar somente CSS deixaria a fragmentação e os contratos intactos; substituir a aplicação descartaria trabalho funcional. Escolha técnica: renderer de capítulos orientado a JSON, com Zod e referências ao grafo existente, reaproveitando debate, licenciamento e infraestrutura Angular.

Composição: papel #fbf8f1, tinta #141211, vermelho #b81d16 para texto/ações, índigo #363a5f, verde #7fbdb5 e ocre #eec35a como suportes. Manter as fontes locais IBM Plex Sans, Source Serif 4 e IBM Plex Mono e a marca oficial; não requisitar Google Fonts. Abertura tipográfica assimétrica com retrato; origens documentais; pensadores em galeria; cronologia com eixo; divergências em rede e tabela. Os números correspondem à sequência de capítulos.

Rigor: texto editorial próprio, fontes identificadas, conteúdo com fontes sem revisão humana. Genealogia limitada a relações documentadas; não transformar links Wikipédia em influência. Lacunas históricas explícitas em vez de cobertura fictícia. Fontes, créditos e alternativas textuais ficam no contexto da leitura.

Verificação: contratos e integridade referencial, navegação antiga/nova, estado desconhecido, estado de leitura compartilhável, teclado, toque, 320 px, movimento reduzido, axe, prerender e métricas locais (não equivalentes a dados de campo).
