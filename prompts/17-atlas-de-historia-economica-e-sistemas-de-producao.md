# PROMPT 17 — ATLAS de História econômica e sistemas de produção — V2 (Angular + experiência exploratória)

## Missão

Implemente **um primeiro núcleo historicamente fundamentado e verdadeiramente explorável** do atlas de História econômica e sistemas de produção. Experiência característica: **comparações temporais de produção, trabalho e indicadores**. O objetivo não é listar conceitos: é fazer o visitante continuar sua leitura por conexões significativas.

## Território temático a considerar

economias pré-industriais, escravidão, feudalismo, mercantilismo, colonização, Revolução Industrial, capitalismo financeiro, socialismo, Estado social, globalização, digitalização; açúcar, mineração, café, industrialização brasileira e Plano Real.

**Recorte inicial sugerido (adapte às fontes e ao acervo existente):** Café, industrialização e trabalho no Brasil: investigar um recorte cronológico com indicadores cuja série e método sejam documentados.

## Experiência visual obrigatória deste atlas

**Explorador temporal com duas escalas (mundo/Brasil), unidades verificadas, notas de mudança metodológica e série de dados filtrável; casos sem dados usam cronologia qualitativa em vez de números inventados.**

Reutilize os componentes-base, mas crie a composição e fluxo específicos necessários ao tema. O componente deve conter estados visíveis, filtro/seleção, um painel de contexto e link útil; integrar-se à leitura e voltar ao mesmo contexto. Se os dados não suportarem visualização válida, reduza o escopo ou indique claramente que se trata de um demonstrador técnico.

## Conexões prioritárias a investigar

Produção ↔ trabalho; industrialização ↔ políticas públicas; crise ↔ ideologias econômicas; escravidão ↔ história social brasileira.

*Essas conexões são hipóteses de pesquisa, não relações previamente confirmadas: tipifique e registre somente as que forem fundamentadas.*

## Cautela temática

Não comparar PIB, salários ou produção de épocas distintas sem metodologia; separar tipos ideais de descrições históricas complexas.

## Contrato de execução (obrigatório)

- Trabalhe **no repositório Angular atual**, sem recomeçar o projeto, substituir a stack ou criar um segundo aplicativo. Inspecione `AGENTS.md`, `git status`, rotas, schemas, dados, revisões, componentes e testes antes de editar; preserve alterações preexistentes.
- Execute alterações reais no código nesta rodada. Não conclua com apenas plano, documentação ou mockup. Não execute o próximo prompt. Não faça push, deploy ou mudanças destrutivas sem autorização.
- Preserve o modelo único de entidades e afirmações, IDs estáveis, aliases, relações tipadas, proveniência, período e estados editoriais. **Não marque conteúdo gerado por IA como revisado/verificado por humano.** O termo “lote publicável” significa *lote tecnicamente preparado*, só realmente público após revisão humana e licença confirmadas.
- Não invente localizadores, páginas, URLs de fontes, citações literais, dados, métricas, imagens, autorizações ou relações causais. Pesquise em fontes primárias e historiografia competente; se não conseguir verificar evidência, mantenha o item como rascunho explícito, e não o bloqueie silenciosamente nem o publique como validado.
- Evite copiar longos trechos protegidos. Para imagens/mapas/documentos: origem, autor (se conhecido), licença, restrições e adequação de reprodução. Ausência de licença bloqueia **reprodução do ativo**, não necessariamente a discussão textual.
- Não duplique o grafo, timeline, leitor editorial, previews, busca, acervo ou trilhas. Extraia comportamentos para componentes reutilizáveis; use Angular standalone, Signals, roteamento existente e tipos estritos. Sem novas bibliotecas só por estética; valide custo de bundle se adicionar alguma.
- O ATLAS é **enciclopédia pública interativa**, não SaaS: nenhuma homepage de marketing, hero/CTA de venda, badges decorativos, dashboards genéricos ou cards repetidos. Preserve a direção A + Stitch: papel quente, preto, vermelho, modernismo suíço, cartografia editorial e arquivos museográficos. Motion deve comunicar seleção, mudança temporal, relação e retorno contextual, respeitando `prefers-reduced-motion` e sem scroll hijacking.
- Cada recurso visual exige interação utilizável **por toque, mouse e teclado**, foco visível e alternativa textual/estruturada. Não dependa apenas de hover, arraste ou cor. Prefira scroll de leitura nativo; transições interrompíveis e curtas; preserve contexto e histórico de navegação.
- Faça verificações proporcionais à mudança: validação editorial, unitários, integrações E2E, lint, typecheck, build e links. Capture ao menos desktop e mobile quando houver alteração visual; relate comandos efetivamente rodados e limitações, sem alegar auditoria WCAG integral.

## Lote de conteúdo — escala controlada

1. **Inspecione** o acervo existente e escolha um recorte coeso documentável, evitando entidades duplicadas. O ponto de partida sugerido abaixo é uma hipótese de planejamento, não obrigação de gerar fatos ou artigos sem fonte.
2. Produza, **quando houver fontes verificáveis**, entre 5 e 10 entidades contextualizadas e interligadas, com metadados, fontes e estados editoriais; ao menos 2 devem ter verbete, narrativa expandida e referências para aprofundamento. Na falta de evidências suficientes, reduza o lote e declare precisamente o bloqueio; não preencha com invenções.
3. Produza pelo menos 3 **relações semanticamente diferenciadas** com outro atlas, quando comprováveis, e teste links, direção, temporalidade e retorno contextual. Não classifique uma associação temática como influência/causalidade.
4. Implemente uma visualização principal integrada ao módulo (definida abaixo), e não um SVG ornamental. A visualização deve selecionar conteúdo, abrir contexto e navegar a páginas verdadeiras; exibir método, período, fonte e alternativa textual.
5. Integre uma mini-trilha de aprendizagem usando os contratos do Prompt 11, com exercícios explicados e fonte. Se os conteúdos não estiverem revisados por humano, mostre-a somente como **demonstração em revisão**, sem declarar material historicamente aprovado.
6. Disponibilize somente rotas existentes em navegação e busca; documentos e páginas ainda inexistentes devem estar ausentes do índice ou claramente identificados como indisponíveis.

## Design & experiência — critérios transversais

- **Entrada:** a pessoa chega por busca, artigo, índice temático, grafo ou relação externa. Todos os caminhos dão contexto sobre o tema e seus vínculos.
- **Exploração:** clicar em pessoa, evento, ideologia, obra ou instituição abre uma prévia contextual; a prévia oferece acesso à entidade e preserva caminho de retorno.
- **Continuidade:** ao mudar o período, atualize datas e rótulos de modo compreensível; ao filtrar relações, preserve seleção ou anuncie sua remoção; não faça saltos inesperados de scroll.
- **Linguagem visual:** tipografia de leitura e interface diferenciadas, legendas editoriais, espaço negativo e algumas composições de destaque que nasçam **dos dados** (não de geometrias decorativas). Aparência consistente, mas estrutura distinta entre atlas.
- **Movimento:** transições de seleção (~180–260 ms), painéis (~220–320 ms), mudanças temporais (~300–550 ms) como valores iniciais ajustáveis via tokens. Não exagere movimento nem prenda o usuário esperando uma animação. Com `prefers-reduced-motion`, substitua por feedback instantâneo.
- **Estados:** carregamento, vazio, filtro sem resultados, fonte incompleta, revisão pendente, erro e conexão inacessível devem ser tratados com conteúdo legível e possibilidades de continuação.

## Entrega e evidências

- Descreva o **recorte efetivamente implementado** e a jornada demonstrada no navegador, distinguindo rascunhos de conteúdo aprovado.
- Liste arquivos alterados, novos componentes, relações, fontes e licenças; indique quais visualizações usam dados efetivos e quais são exclusivamente demonstrações rotuladas.
- Execute testes e identifique cobertura existente versus nova. Mostre screenshots desktop/mobile e problemas restantes. Registre limitações históricas sem confundi-las com falhas de engenharia.
- Faça commit local somente se o repositório estiver em estado coerente; não inclua mudanças não relacionadas ou sobreponha trabalho de terceiros.

## Critérios objetivos de aceite para este módulo

- [ ] Há uma rota real com recorte temático explícito e informações editoriais verificáveis.
- [ ] Há ao menos um fluxo completo **entidade → relação → outra entidade → retorno** demonstrado em browser.
- [ ] A experiência específica do atlas indicada acima está implementada com interação e alternativa acessível, não apenas ilustrada.
- [ ] Dados, fontes, licenças, temporalidade e status de revisão são representados fielmente, sem declaração enganosa de publicação.
- [ ] Busca, hipertexto, grafo e estudo reutilizam contratos comuns; testes de integridade e jornada passam.
- [ ] Capturas desktop/mobile e relato objetivo de limitações fazem parte da entrega.
