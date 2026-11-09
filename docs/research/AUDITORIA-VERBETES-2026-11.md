Status: resultado
Última verificação: 09/11/2026

# Auditoria dos verbetes e itens citados — 09/11/2026

Validação de escopo e de tipo dos **928 verbetes** de `atlas-verbetes-citados`, não das
relações que eles recebem. A pergunta é se o item tem relevância política, histórica ou
geográfica **por si**, e não se está ligado a algo que tem. A classificação é heurística e
está sujeita a revisão editorial; nada foi apagado ou alterado neste lote.

## Método

- Tipo: a descrição curta do Wikidata foi comparada com o tipo atual do registro. Uma cidade
  cadastrada como conceito, um país como instituição ou um esporte como obra são erros de
  tipo, independentemente de a página funcionar.
- Escopo: o papel próprio do item na descrição, não o grau no grafo. Uma pessoa que foi
  presidente é núcleo; um jornal que cobre política é contexto; um jogador citado por um
  político é incidental.
- Relações: cada aresta foi pesada pelo que ela afirma. `influenciou` e `reagiu contra` não
  valem o mesmo que `é membro de` ou `é classificado com a ideologia`.
- Fora do grafo: itens sem relação (`grau 0`) não foram tratados como irrelevantes por isso.
  A ausência de aresta não prova nada; a presença também não.

## Resultado em números

| Camada | Itens | Observação |
|---|---:|---|
| Verbetes citados | 928 | 1.190 entidades no grafo total |
| Candidatos a correção de tipo | 69 (7,4%) | 54 de alta confiança e 15 para decisão |
| Claramente fora do escopo | 20 (2,2%) | esportes, anos, ficção, profissão genérica e doença |
| Contexto provável | ~64 | mídia, universidade, empresa, religião, filosofia e ciências sociais |
| Relações no grafo dos verbetes | 1.122 | 1.580 no grafo completo |

### Tipos que precisam de correção

Os 69 candidatos estão em `auditoria-verbetes-2026-11/tipos-candidatos.tsv`. Os grupos
principais:

| Tipo atual → sugerido | Casos | Exemplos |
|---|---:|---|
| conceito → lugar | 10 | Barcelona, Berlim, Genebra, Londres, São Paulo |
| instituição → lugar | 8 | Austrália, Grécia, Polônia, Turquia, Ucrânia |
| obra → conceito | 8 | Futebol, Tênis, Voleibol, Advogado, Desporto |
| obra → instituição | 6 | The Economist, The Guardian, The New York Times, Twitter |
| conceito → instituição | 5 | Congresso Nacional, The Guardian, Mother Earth |
| conceito → ideologia | 5 | Escola Austríaca, Novo Trabalhismo, Racionalismo |
| instituição → evento | 4 | GATT, Tratado Norte-Americano de Livre-Comércio |
| lugar → conceito | 4 | Médio Oriente, Mundo islâmico, País em desenvolvimento |
| ideologia → evento | 1 | Holocausto |
| outros grupos | 18 | partido, conceito, obra, instituição |

Entre os 15 casos de decisão editorial estão `Nação`, `Serviço militar`, `Parlamento`,
`Reichstag`, `Racionalismo`, `Cinismo`, `O Príncipe` e `Ação Integralista Brasileira`. Eles
podem continuar no tipo atual ou mudar conforme o recorte que a página assume.

### Itens claramente fora do escopo

A lista fechada está em `auditoria-verbetes-2026-11/fora-de-escopo.tsv`:

- **Anos:** 1871, 1945.
- **Esportes:** Futebol, Tênis, Voleibol, Basebol, Basquetebol, Desporto, Copa América,
  Copa do Mundo FIFA.
- **Ficção e entretenimento:** O Dono do Mar, A Casa dos Espíritos (filme), God.
- **Conceitos genéricos:** Arte, Literatura, Música, Teatro, Compêndio.
- **Profissão e saúde:** Advogado, Câncer.

Esses 20 itens recebem apenas **10 arestas** no total. O problema deles não é a quantidade
de relações; é ocuparem um registro, um ícone e um endereço no acervo político.

### Contexto, não núcleo

Cerca de 64 itens são provavelmente contexto e não núcleo político. Exemplos: The Economist,
The Guardian, The New York Times, Twitter, Facebook, BBC, universidades, bancos, igrejas,
filósofos, economistas, sociólogos e conceitos sociais como educação, saúde e família. Eles
podem explicar uma relação, mas não devem ser contados como “políticos” só por aparecerem
no grafo.

### O peso das relações

| Peso | Relações | % |
|---|---:|---:|
| Histórico explícito: influenciou, reagiu, desenvolveu | 150 | 13,4% |
| Ação documentada: participou, fundou, governou, escreveu | 342 | 30,5% |
| Vínculo administrativo: membro, filiação, sede, sucessão | 417 | 37,2% |
| Rótulo de catálogo: `associated_with` | 213 | 19,0% |
| Total | 1.122 | 100% |

**630 relações (56,1%) são administrativas ou de catálogo.** Elas não demonstram influência
política. Outras **150 (13,4%)** afirmam influência, crítica ou desenvolvimento. O meio
(participação, fundação, governo, autoria) tem peso próprio e não deve ser somado ao
primeiro grupo.

Exemplos de relação que não cria importância política:

- `Carlo Cafiero → Compêndio` (`wrote`): o tipo errado transformou uma nota editorial em
  “obra escrita por”.
- `Michael Lewis → The Economist` (`reacted_against`): um comentário de jornalista sobre
  uma revista, não uma relação política histórica.
- `Asja Lācis → Partido Comunista da União Soviética` (`documented-association`): vínculo
  administrativo de uma artista de teatro, não um papel político central.
- `Pandemia de COVID-19 → Estados Unidos` (`documented-association`): local/associação, não
  uma relação política por si.

## Recomendação

1. **Corrigir os 54 tipos de alta confiança antes de qualquer limpeza de escopo.** Tipo errado
   contamina catálogo, ícone, contagem e relação.
2. **Criar o campo `scope`** (`nucleo`, `contexto`, `fora`) no contrato da entidade e usá-lo
   como filtro no acervo e no grafo. O escopo é uma propriedade do item, nunca da aresta.
3. **Pesar as relações** com uma natureza (`historical`, `action`, `administrative`,
   `catalog`) e contar “relevância política” apenas com as duas primeiras. As duas últimas
   continuam visíveis como contexto.
4. **Revisar os 20 itens fora** e os 64 de contexto. Não apagar em lote: decidir caso a caso
   entre remover do catálogo político, manter como contexto ou transformar em verbete.
5. **Reexecutar esta auditoria** depois das correções e comparar os números.

## Limites

- A descrição do Wikidata é curta e pode esconder o papel político de um item; por isso há
  uma faixa de decisão editorial.
- A classificação de contexto é uma estimativa; não substitui leitura da fonte.
- Nenhuma fonte foi reaberta nesta rodada. O objetivo foi separar o que merece revisão do
  que já está claramente fora do recorte.
- A lista completa de tipos está em `tipos-candidatos.tsv`; a de fora de escopo, em
  `fora-de-escopo.tsv`. As duas são candidatas, não sentenças.
