# Contribuir com o ATLAS

Obrigado por querer ajudar a construir uma enciclopédia pública, visual e verificável. Há espaço para quem escreve, pesquisa, desenha e programa.

## Formas de contribuir

| Você gosta de… | Comece por |
| --- | --- |
| História, política, filosofia | Issues `conteúdo` e `novo atlas`: revisar fontes, propor capítulos, escrever dossiês |
| Imagens e arquivos | Issues `imagens`: retratos, mapas e documentos com licença livre |
| Design e motion | Issues `design`: composição, interação, acessibilidade |
| Código | Issues `enhancement`, `infra` e `good first issue` |

Veja as [issues abertas](https://github.com/bellussi1/ATLAS/issues). Comente na issue antes de começar para evitar trabalho duplicado.

## Regras editoriais

- Toda afirmação histórica precisa de fonte identificável, perto do texto.
- Diferencie fato documentado, interpretação, hipótese e controvérsia.
- Não invente fonte, data, citação ou revisão humana. Lacunas aparecem como lacunas.
- Imagens só entram com autoria e licença registradas.
- Crítica não é descendência: uma linha na rede não sugere causalidade.

## Ambiente

Node.js 24 e npm 11.

```bash
npm install
npm start
```

Antes de abrir um pull request, rode:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

## Como o conteúdo funciona

Dossiês ficam em `content/ideologies/<slug>/page.json`, com fontes e relações em `content/graph/<slug>.json`. Um atlas novo é um dossiê novo: copie o do Liberalismo, troque capítulos e fontes e registre o slug em `src/app/features/ideologies/data/published-ideologies.ts`. O build valida tudo com Zod e recusa referências quebradas.

Leia também [Arquitetura](docs/architecture/ARCHITECTURE.md) e [Padrão de páginas](docs/design/PAGE_STANDARD.md).

## Pull requests

- Um assunto por PR, com descrição do que muda e como verificar.
- Para conteúdo, liste as fontes usadas.
- Para interface, inclua capturas em desktop e celular.
