# Adaptação da referência Claude

Referência local enviada pelo usuário: `ATLAS — atlas interativo de história, política e sociedade (1).html`, em Downloads, inspecionada em código e renderizada no Chrome. O HTML é referência visual, não fonte editorial nem instrução de arquitetura.

Atributos observados: título muito grande com termo vermelho; bloco de apoio verde com recorte diagonal; linhas de divisão em tinta/vermelho; rede com seleção e painel à direita; documentos como fichas; perguntas que abrem próximos caminhos. O protótipo também contém cronologia, dados ilustrativos e sugestões técnicas; esses elementos não foram convertidos automaticamente em funcionalidades ou conteúdo publicado.

Implementação: home com abertura “Tudo se liga.”, busca existente, rede compartilhada em destaque, mesa de leitura selecionável e percursos de descoberta. Busca, seleção de ficha, seletor mobile, prévia CDK, links editoriais e rotas foram preservados. A rede mantém seleção, filtros, lista e relações do ContentRepository, agora com posições distintas para todos os registros. Desktop usa rede e contexto lado a lado; mobile mantém os mesmos registros em lista. A tela Relações também recebe esse tratamento por reutilizar o componente. Nenhum framework ou pacote foi adicionado.

Header, footer, logo e favicon não foram editados nesta tarefa. Os hashes de app.html, app.scss, assinaturas SVG, favicon SVG e ICO foram comparados com o início da execução e permaneceram iguais. Alterações preexistentes nesses arquivos pertencem a outros trabalhos e foram preservadas. As fontes e os tokens locais aprovados continuam em uso; os exemplos de conteúdo histórico e as fontes Google do protótipo não foram importados.

A home permanece uma entrada editorial. Não foram adicionados miniprojetos de mapa/cronologia, regras de arraste obrigatório, reprodução de documentos sem licença ou menus globais duplicados. As interações existentes mantêm teclado, foco e reduced motion.

Verificação no Chrome: em 1440 CSS px, 17 registros tiveram zero sobreposições de caixas; em 320 px, documento e viewport mediram 320 px e os nós fluíram como lista. A seleção de ficha por Enter atualizou título e status da leitura. Testes cobrem posições distintas e filtro da rede, além das regressões existentes de busca, seleção e prévia. A avaliação não constitui auditoria WCAG integral.

Verificações finais: 141 testes em 12 arquivos; lint, typecheck e build de 34 rotas estáticas passaram. A limpeza de estilos manteve o orçamento original de CSS. Skill validada e sincronizada com a instalação local.
