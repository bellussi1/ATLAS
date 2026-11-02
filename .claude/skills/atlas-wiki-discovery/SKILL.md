---
name: atlas-wiki-discovery
description: Descobrir, selecionar e ingerir entidades de uma tradição (ideologias, pessoas, obras, organizações) a partir de Wikidata, Wikipedia e Wikimedia Commons, com registro de proveniência e decisões editoriais. Usar ao popular ou ampliar uma leitura de ideologia com dados externos.
---

# Descoberta e ingestão Wikimedia

A ingestão é **dados e proveniência**, não texto. Ela cria registros (nome, datas, descrição curta, licença de imagem) e nunca redige narrativa histórica. Narrativas continuam sendo escritas com fontes, capítulo a capítulo.

## Limites (não negociáveis)

- **Referências de terceiros não são fonte de dados.** O repositório `RomanCypherpunk/12axes` declara direitos reservados (código, dados, textos, imagens). Use a *ideia* de catálogos separados (ideologias, pessoas, países, partidos, livros), nunca copie seus arquivos. Os dados vêm de Wikidata, Wikipedia e Commons. Ver `docs/research/12axes-audit.md`.
- **Wikipedia** é CC BY-SA 4.0: guarde o título, a URL e a licença junto de qualquer extrato usado.
- **Imagem** é licenciada por arquivo. Só entra com `status: known`, `reproduction: allowed`, atribuição e página do arquivo.
- **Classificação importada ≠ fato.** Um `P1142` (ideologia política) ou `P737` (influenciado por) no Wikidata é um rótulo de contribuidores. Aparece como rótulo, não como influência documentada. Influência entra no grafo só com fonte e natureza.
- **Não publicar sem revisão.** A seleção automática gera uma proposta; `marxismo.decisions.json` registra inclusões e exclusões com motivo.

## Fluxo

1. **Descoberta** (`npm run discover:marxism`): consulta buscas do Wikidata (`haswbstatement`), entidades em lotes de 50, árvore de categorias do Commons (profundidade 2) e o resumo de pt.wikipedia. Grava `scripts/ingestion/wikimedia/discovery/marxismo.json`, com data e fontes.
2. **Seleção** (`npm run select:marxism`): regras explícitas em `selection.mjs` (pessoa: rótulo da tradição, ≥30 wikis e nascimento até 1930; ideologia e obra: ≥20 wikis; inclusões forçadas e exclusões com motivo em `*.decisions.json`). Grava `marxismo.selection.json`, que `configurations.mjs` lê.
3. **Captura** (`npm run ingest:marxism -- --capture <diretório novo> --media remote`): cria um snapshot reproduzível. Diretório novo por execução.
4. **Verificação**: `npm run ingest:verify` (replay offline), `npm run content:build`, testes de ingestão e de conteúdo.
5. **Página**: referenciar os IDs gerados nos blocos do capítulo. O schema recusa ID inexistente.

## Checklist por registro

- [ ] Rótulo pt ou en e descrição curta da fonte.
- [ ] Ano de nascimento/morte quando houver; precisão indicada.
- [ ] Imagem com licença, atribuição e página do arquivo, ou nenhuma imagem.
- [ ] Papel na tradição: rotulado no Wikidata, influência documentada ou apenas associação. Diga qual.
- [ ] Revisão humana pendente até decisão registrada.

## Lacunas conhecidas

- Países e regimes: a busca por `P1142` não retornou países para o marxismo. Precisa de consulta própria (por exemplo, classificação de estado) antes de entrar.
- Pessoas do rótulo `P737` (influenciados por Marx) têm muitos nomes que não são pensadores da tradição. Ficam fora da seleção automática até decisão editorial explícita.
