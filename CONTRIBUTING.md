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

Dossiês ficam em `content/ideologies/<slug>/page.json`, com fontes e relações em `content/graph/<slug>.json`. O conteúdo compilado é publicado no R2 e o app lê só de lá (veja o [README](README.md#como-funciona)).

Uma tradição nova **não** é uma cópia de outra: ela passa pela pipeline, com portas de verificação por estágio. Comece por `npm run tradicao:coverage -- <slug>` e `npm run tradicao -- <slug> --stage N --dry-run`, e leia `.claude/skills/atlas-pipeline-tradicao/SKILL.md`. A pipeline não publica no R2: a publicação é feita por quem mantém o projeto.

Extrair rascunhos da Wikipedia (`npm run wiki:extract`) exige uma chave da API da Anthropic, que fica no seu ambiente, nunca no repositório. Quem só revisa texto ou contribui com código não precisa dela.

## Conteúdo assistido por IA

- Identifique no PR o que foi gerado ou assistido por IA.
- Revisão de IA nunca é apresentada como revisão humana.
- Toda citação precisa ser literal e conferível no artigo de origem.

## Dados, textos e imagens de terceiros

- Só entram com licença compatível e registrada (autoria, licença e URL do arquivo).
- Não copie catálogos, textos ou imagens de projetos com direitos reservados, mesmo que estejam públicos. Use a ideia, refaça a partir de fontes abertas (Wikidata, Wikipedia, Commons) ou peça autorização por escrito e anexe-a ao PR.
- Wikipedia exige atribuição (CC BY-SA 4.0): guarde título, URL e licença junto do texto.

## Licença das contribuições

Ao contribuir, você concorda que:

- **Código** é licenciado sob a [MIT](LICENSE).
- **Texto, relações e traduções** são licenciados sob [CC BY-SA 4.0](LICENSE-CONTEUDO.md).
- Você tem o direito de oferecer o que está enviando, e não está copiando material sem licença compatível.

Você mantém a autoria da sua contribuição.

## Conduta

Este projeto segue o [código de conduta](CODE_OF_CONDUCT.md). Vulnerabilidades vão pelo [canal privado](SECURITY.md), não por issue pública.

## Pull requests

- Um assunto por PR, com descrição do que muda e como verificar.
- Para conteúdo, liste as fontes usadas.
- Para interface, inclua capturas em desktop e celular.
