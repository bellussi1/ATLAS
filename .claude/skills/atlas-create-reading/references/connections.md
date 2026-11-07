# Conexões: até cinco nós

Uma leitura contínua não termina em si. Cada página publicada declara **3 a 5 conexões** em `ideologyReadings[].connections`, com `slug` e `reason`. O componente renderiza a lista depois do último capítulo.

## O que uma conexão deve dizer

A razão responde: **o que muda na compreensão do assunto ao ler o outro?**

Tipos de razão:

- **contraste**: "Compara a crítica da propriedade com a defesa liberal da liberdade individual."
- **continuidade**: "Segue a disputa entre reforma e revolução dentro da tradição socialista."
- **disputa**: "Retoma a ruptura entre Bakunin e Marx sobre Estado e partido."
- **consequência**: "Mostra como a ditadura reconfigurou o campo da esquerda que a leitura anterior descreve."

Não use:

- "Veja também";
- "Outra leitura importante";
- "Temas relacionados";
- razões que repetem o título do outro.

## Limite e ordem

- **Máximo 5**. Acima disso, a leitura perde foco.
- **Mínimo 3** quando houver outras leituras publicadas.
- Ordene por força da razão, não por simetria.
- Só aponte para leitura publicada. `connectionsOf()` descarta rascunhos, mas o dado deve estar limpo.
- Não crie conexão recíproca por obrigação. Se A precisa de B e B não precisa de A, isso é legítimo.
- Uma conexão histórica afirmada na razão precisa de fonte no capítulo `conexoes` ou no grafo.

## Onde a conexão vive

1. `src/app/features/ideologies/data/ideology-readings.ts`: dado curado, testado por `ideology-readings.spec.ts`.
2. Capítulo `conexoes`: argumento e fonte da relação.
3. Grafo (`content/graph/<slug>.json`): aresta tipada quando houver relação histórica documentada.

O dado de navegação não substitui a aresta histórica. Se a razão diz "influenciou", precisa de fonte e tipo de aresta; se diz "compare", pode ser navegação editorial.

## Exemplo de mapa

```
Golpe de 1964
├── Ditadura militar (consequência institucional)
├── Governo João Goulart (conjuntura que o golpe interrompe)
├── Trabalhismo (base política em disputa)
└── Redemocratização (ruptura posterior e memória)

Governo Vargas
├── Trabalhismo (legado e cultura política)
├── Golpe de 1964 (campo de forças que chega ao golpe)
├── Era Vargas / Estado Novo (periodização)
└── Leonel Brizola (continuidade e reinvenção)
```

O mapa acima é **planejamento**. Nenhuma dessas leituras deve ser publicada sem fontes e revisão.
