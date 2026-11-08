Status: atual
Última verificação: 08/11/2026

# Tipos de nó e de ligação no grafo

Registro da revisão das famílias do grafo, das correções de classificação e da nova legenda.

## Problema observado

- Países apareciam em **Lugares** quando o registro era `place` sem `placeType`, e em **Organizações** quando a captura classificava o país como `institution`.
- **Conceitos** recebiam livros, cidades, organizações e países porque a extração usa `concept` como categoria ampla.
- A legenda misturava 8 tipos de nó com 11 tipos de ligação, alguns muito próximos (`Fundou`/`Escreveu`, `Participou de`/`Foi membro de`, `Governou`, `Ocorreu em`).

## Tipos de nó

Agora são 10 famílias, agrupadas na legenda:

| Grupo | Tipos |
| --- | --- |
| Pessoas e ideias | Ideologia, Pessoa, Conceito |
| Obras e acontecimentos | Obra, Acontecimento |
| Instituições e territórios | Organização, Partido, País, Formação política, Lugar |

- `place` com `placeType: country` e descrições que começam por “País”/“Estado soberano” viram **País**.
- `place` com `placeType: regime`, `historical-polity` e `government` viram **Formação política**.
- Cidades e territórios sem soberania continuam em **Lugar**.
- As demais entidades seguem o `kind` do registro.

### Correções editoriais no grafo

Como o grafo publicado ainda carrega a classificação antiga, `networkKindOverrides` corrige, só na visualização, os casos revisados:

- países: Austrália, Grécia, Hungria, Lituânia, Polónia, Suécia, Turquia, Ucrânia, Canadá, Escócia, União Soviética;
- formação política: Alemanha Nazista;
- cidades: Porto Alegre, Santos, Barcelona, Berlim, Budapeste, Buenos Aires, Genebra, Havana, Londres, Nova Iorque, São Paulo;
- obras: Carta das Nações Unidas, Discurso sobre a Origem da Desigualdade, Paula, A Arte da Guerra, Constituição brasileira de 1988;
- acontecimentos: Diretas Já, Conspiração dos Iguais;
- organizações: Congresso dos Estados Unidos, Congresso Nacional do Brasil;
- conceitos que chegaram como instituição: Cooperativismo, Iluminismo, Renascimento, Ateísmo, Autocracia, Vanguarda, Governo, Sindicato, Associação, Confederação, Empresa estatal, Capitalismo, Democracia liberal, Burocracia, Estado socialista, Bolsa-escola, Tribo, Britânicos, Despotismo, Ditadura militar, Evangelicalismo, Manufatura, Monarquia, Narodnik, Nova Direita, Nova Esquerda, Oligarquia, Presidencialismo, Realismo, Reformismo, Romantismo, Unipartidarismo;
- partidos: Bolchevique, Menchevique.

O override é uma dívida declarada: a classificação de origem deve ser corrigida numa onda de dados. Até lá, ele mantém o grafo coerente sem alterar o registro.

## Tipos de ligação

De 11 famílias para 7:

| Família | Tipos reunidos | Leitura |
| --- | --- | --- |
| Influência | `influenced`, `influenced_by`, `causal_claim`, `event_influenced_ideology` | Uma corrente, pessoa ou obra influenciou outra |
| Ruptura | `reacted_against` | Uma posição se formou contra outra |
| Atuação | `participated_in`, `member_of`, `governed` | Participação, militância, cargo ou governo |
| Criação | `founded`, `founded_by`, `wrote`, `authored` | Fundação de organização ou autoria de obra |
| Continuidade | `developed_into`, `succeeded`, `preceded_by` | Uma forma se desdobrou ou sucedeu outra |
| Relação documentada | `documented_association` | Associação histórica registrada numa fonte, sem verbo mais específico |
| Conexão | `associated_with`, `related_to`, `occurred_in`, `located_in`, links editoriais e de navegação | Vínculo de catálogo, localização ou navegação |

O verbo exato continua no texto de cada ligação; a família serve para cor, traço e filtro. Navegação e catálogo não são apresentados como influência.

## Legenda

- Cada tipo tem um **tile** com moldura, a forma colorida e um índice de catálogo (`01`–`10`).
- A legenda é dividida em três grupos com títulos em monoespaçada.
- O estado desligado risca o nome e reduz o tile, sem depender só da cor.
- Os rótulos de ligação agora são frases curtas (`Influência`, `Ruptura`, `Atuação`, `Criação`, `Continuidade`, `Relação documentada`, `Conexão`).

## Contagens depois da revisão

| Tipo | Antes | Depois |
| --- | --- | --- |
| Países | 0 (espalhados em Lugares/Organizações) | 69 |
| Lugares | 127 | 79 |
| Organizações | 199 | 153 |
| Conceitos | 238 | 251 |
| Formações políticas | 0 | 3 |

As ligações ficaram: Influência 132, Ruptura 77, Atuação 47, Criação 53, Continuidade 7, Relação documentada 308, Conexão 212.

## Limites

- Os overrides são curados para os casos visíveis; não substituem a reclassificação na captura.
- Movimentos políticos ambíguos (Movimento 26 de Julho, MFA) permanecem como organização.
- A contagem de “Relação documentada” ainda é grande porque o tipo genérico é o mais frequente no Wikidata; a ficha mostra o contexto e a fonte de cada ligação.
