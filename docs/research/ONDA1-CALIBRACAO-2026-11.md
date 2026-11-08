Status: plano
Última verificação: 08/11/2026

# Onda 1 — calibração Haiku (08/11/2026)

Amostra de 20 artigos de Social-democracia e Anarquismo, mesmos artigos nos dois braços. Custo
total da execução: **US$ 0,0706**, dentro do teto autorizado de US$ 0,30.

| Braço | Rascunhos | Citações rejeitadas | Relações aceitas | Rejeição de relações | Custo |
|---|---:|---:|---:|---:|---:|
| Haiku 5.5 low | 20 | 0/216 (0%) | 7 de 27 | 74,1% | US$ 0,030 |
| Haiku 5.5 medium | 20 | 2/262 (0,8%) | 17 de 37 | 54,1% | US$ 0,041 |

## Leitura

- O texto do Haiku medium ficou abaixo de 1% de citação rejeitada.
- As relações continuam sendo o gargalo: mais da metade das propostas é descartada pela segunda
  passada ou pelas travas de código. O Haiku medium aceitou 17 relações, contra 7 do low.
- **O braço Sonnet low para relações não foi executado.** O custo estimado só da segunda passada
  com Sonnet passaria do teto restante; a comparação de desenhos da Onda 1 continua aberta.
- **A precisão humana não foi medida:** os 100 itens de `revisao.json` estão com `ok: null`.

## Fila humana

`revisao.md` e `revisao.json` nesta pasta contêm 100 itens para conferência. A marcação é humana e
segue a regra do gold set: `true`, `false`, `"inverte"` ou `"fonte_errada"`, com nota. Sem isso, a
porta de precisão ≥ 95% não fecha e a Onda 2 não deve escalar.

## Próximo passo

1. Conferir os 100 itens e rodar `score` para decidir o modelo.
2. Se a precisão humana fechar, implementar o braço Sonnet low dentro de um novo teto e comparar.
3. Só então iniciar a Onda 2 com as metas documentadas recalibradas.
