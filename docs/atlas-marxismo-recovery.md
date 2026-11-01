# Recuperação do Atlas de Marxismo e Comunismo

## Diagnóstico inicial

O registro `atlas-marx-valor` continha cinco entidades e a entrada principal apresentava sobretudo Karl Marx, Adam Smith e a teoria do valor. A rota do debate já oferecia um mapa de duas teses com fontes, mas não dava acesso a uma rede ampla de pessoas, conceitos, obras e acontecimentos.

O Atlas do Liberalismo já tinha uma tela exploratória alimentada por 14 registros Wikimedia, com índice, rede selecionável, linha do tempo, galeria licenciada, painel de fontes e retorno contextual. A diferença central era de cobertura e de acesso a essas vistas. A recuperação ampliou os dados marxistas e passou a reutilizar o mesmo componente e a mesma ingestão configurável; manteve a apresentação específica do debate Marx–Smith.

## O que foi implementado

- O registro marxista legado foi ampliado para 27 entidades, preservando seus IDs, afirmações, fontes, citações, relações, imagens locais e estado de revisão. Karl Marx foi reconciliado em `Q9061`; Adam Smith permanece como `Q9381`.
- A carteira de ingestão contém 23 QIDs, contando a reconciliação de Karl Marx (`Q9061`). Os outros 22 são: Marxismo (`Q7264`), Engels (`Q34787`), Lenin (`Q1394`), Luxemburgo (`Q7231`), Bernstein (`Q75786`), Kautsky (`Q76586`), Gramsci (`Q83003`), Trótski (`Q33391`), Stalin (`Q855`), Mao (`Q5816`), Caio Prado Júnior (`Q1789931`), Luís Carlos Prestes (`Q742047`), Florestan Fernandes (`Q2387448`), José Carlos Mariátegui (`Q335544`), comunismo (`Q6186`), socialismo (`Q7272`), socialismo científico (`Q865354`), materialismo histórico (`Q190004`), _Manifesto Comunista_ (`Q40591`), Comuna de Paris (`Q133132`), Revolução Russa (`Q8729`) e Segunda Internacional (`Q188592`). Adam Smith (`Q9381`) já constava do acervo legado. Cada registro importado mantém link e idioma da Wikipedia, categorias, QID, data de coleta e status pendente.
- As 43 relações do atlas incluem 21 links enciclopédicos, 4 relações documentadas legadas, 4 classificações Wikidata, 10 declarações de influência no Wikidata, uma participação, duas autorias estruturadas e um link editorial de método. Relações importadas preservam direção, propriedade, fonte e revisão pendente; não são apresentadas como comprovação historiográfica. A relação de autoria foi orientada do autor para a obra.
- Cinco arquivos do Commons passaram pelo filtro de licença reutilizável. Atribuição, criador informado, URL do arquivo, licença e proveniência ficam registrados junto ao ativo. Os retratos legados continuam com seus créditos existentes.
- O componente exploratório agora aceita Atlas, raiz, caminho de retorno e apresentação contínua por inputs. Na página de Marxismo, índice, relações em lista textual, linha do tempo e galeria aparecem em sequência no mesmo scroll; o canvas do grafo e os controles que alternavam entre modos ficam reservados ao Atlas do Liberalismo. No celular, a cronologia e os cartões mantêm a leitura vertical.
- As fichas, datas, relações e teses abrem painéis no próprio percurso, sem levar o leitor a outra rota. URLs antigas com parâmetros ainda selecionam uma tese na página completa. A ponte para Adam Smith é contextual e não redireciona a outro Atlas.
- O mapa de argumentos existente foi incorporado ao final da página longa e mantém as teses verificáveis cadastradas sobre Smith e Marx. Selecionar tese ou filtro altera o conteúdo localmente, sem mudar a URL. Não foram geradas novas teses nem citações para preencher um mapa maior.

## Limites editoriais

Os novos registros Wikimedia são metadados para descoberta e estrutura, não verbetes históricos aprovados. Não foram adicionadas afirmações editoriais ou revisões humanas para Engels, Lenin, autores brasileiros/latino-americanos, eventos e correntes importados. Bernstein/Luxemburgo, Lenin/Kautsky e as teorias da dependência ainda não têm jornadas de divergência sustentadas por conteúdo editorial próprio. O mapa de argumentos permanece um recorte menor que a rede enciclopédica. A navegação pública usa o snapshot estático e não consulta a Wikimedia em tempo de execução.

## Evidências visuais

As capturas anteriores do Marxismo ficam em `docs/auditoria-visual/marx-desktop-depois.png` e `marx-mobile-depois.png`. As capturas da experiência expandida e contínua, obtidas pela suíte Playwright, ficam em `output/playwright/atlas-marxismo-desktop.png` e `atlas-marxismo-mobile.png`.
