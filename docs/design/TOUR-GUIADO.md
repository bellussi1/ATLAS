Status: atual
Última verificação: 20/11/2026

# Tour guiado por página

Tour para sete páginas: `/leituras`, `/leitura/:slug`, `/itinerarios`, `/itinerario/:slug`, `/acervo`, `/mapa` e `/grafos`. Cada passo explica o que a coisa é e o que fazer com ela. Abre sozinho na primeira visita a cada página.

## Biblioteca

[driver.js](https://driverjs.com) 1.14.0, licença MIT. O Shepherd.js e o Intro.js foram descartados por serem AGPL-3.0, que exigiria abrir o código da aplicação ou licença comercial. O driver.js é carregado por `import()` só quando um tour começa, e o CSS dele entra pelo `TourStylesComponent` (`ViewEncapsulation.None`), também só então.

## Como funciona

- **`shared/ui/tour/tours.ts`**: os passos de cada página. Cada passo é um seletor CSS, um título e uma explicação curta. O arquivo não importa nada das features; aponta para o markup delas por seletor. Quem renomear uma classe usada ali deve ajustar o passo (`tours.spec.ts` só garante que os seletores são CSS válido, não que existam).
- **Início automático**: na primeira visita, o `TourService` espera a página ter algo para apontar (até 8 s), dá 0,7 s para assentar e abre o tour. Não abre em link compartilhado (qualquer query que escolha algo, como `?no=`, `?pais=`, `?de=`; `camada` e `pagina` não contam), em páginas já vistas nem em navegador automatizado (`navigator.webdriver`, para não atrapalhar os E2E).
- **Um botão por página, fora do cabeçalho**: no grafo e no mapa é o chip **Tour guiado**, o primeiro da barra de ferramentas; nas outras cinco, um botão fixo **Tour guiado** no canto inferior esquerdo (`TourLauncherComponent`), escondido enquanto o tour roda.
- **Passos ausentes ou recolhidos são pulados**: o mesmo roteiro serve ao desktop e ao celular (por exemplo, "Nesta leitura" no desktop e "Capítulos" no celular). Um passo pode declarar `reveal`, o controle que abre o alvo quando ele está recolhido (a legenda do grafo e a do mapa); o serviço abre antes e recolhe ao final. `centered` explica alvos que ocupam a tela inteira (o globo, a rede) em um cartão central, sem recorte.
- **Memória**: `localStorage`, chave `atlas:tour:v1:<página>`. A página `/cookies` explica o que o site guarda e tem o botão "Mostrar os tours de novo" (`TourService.resetAll()`).

## Cookies e armazenamento

O ATLAS não define cookies. O registro de que um tour foi mostrado fica só no navegador, serve à própria função pedida pelo leitor e não identifica ninguém; por isso não há faixa de consentimento. `/cookies` lista cada item guardado (esse e o `atlas:chunk-reload`, da aba), o motivo e a duração, e remete à página de privacidade para a medição sem cookies. Revisar com o responsável se a política mudar (um item novo exige uma linha nova na tabela).

## Rolagem

- **Ao iniciar**: a página volta ao topo antes de o destaque aparecer (rolagem suave, esperando o `scrollend`, com sondagem e teto de 1,5 s como reserva), então nada pisca durante a rolagem. Páginas que não rolam (grafo, mapa) seguem direto.
- **Ao encerrar**: volta ao topo do mesmo jeito.
- **Entre passos**: o driver.js rola direto até o alvo seguinte; voltar ao topo a cada passo esconderia os alvos que ficam mais abaixo. O destaque respeita o cabeçalho fixo (`scroll-margin-block-start` com `--header-offset`).
- **Ao trocar de rota**: o tour é encerrado e o roteador já posiciona a nova página no topo.
- **Movimento reduzido** (`prefers-reduced-motion` ou `html.atlas-reduced-motion`): a volta ao topo é imediata e o driver.js roda sem animação nem rolagem suave.

## Acessibilidade e movimento

Teclado: setas e Esc do driver.js; os botões têm 44 px e foco visível. O foco volta ao botão que abriu o tour. Com `prefers-reduced-motion`, sem animação e sem rolagem suave. O cartão do tour segue o registro "mesa" (papel, contorno de tinta, sombra deslocada).

## Pendências

- Os textos dos passos foram redigidos aqui e merecem revisão editorial.
- No celular o mapa pula os passos da linha do tempo enquanto o guia está aberto (o dock fica escondido nessa situação).
