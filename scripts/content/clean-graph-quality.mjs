#!/usr/bin/env node
/**
 * Higieniza aliases colidentes, reclassifica tipos incorretos, remove relações ruidosas
 * e promove relações órfãs de alta confiança da fila RAG sem alterar os arquivos da fila.
 */
import './register-source-modules.mjs';
import { readdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { readSourceGraph, sourceDirectory, writeSourceGraph } from './source-graph.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const candidatesPath = join(projectRoot, 'experiments/rag/eval/queues/relacoes-candidatas.json');

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();

const CANONICAL_ALIAS_OWNERS = new Map([
  ['marx', 'person-karl-marx'],
  ['weber', 'wiki-topic-max-weber'],
  ['vargas', 'wiki-topic-getulio-vargas'],
  ['locke', 'person-john-locke'],
  ['montesquieu', 'person-montesquieu'],
  ['lenin', 'person-vladimir-lenin'],
  ['trotsky', 'person-leon-trotsky'],
  ['stalin', 'person-joseph-stalin'],
  ['bakunin', 'wiki-topic-mikhail-bakunin'],
  ['kropotkin', 'wiki-topic-piotr-kropotkin'],
  ['proudhon', 'wiki-topic-pierre-joseph-proudhon'],
  ['keynes', 'wiki-topic-john-maynard-keynes'],
  ['hayek', 'person-friedrich-hayek'],
  ['smith', 'person-adam-smith'],
]);

const CLASSE_SOCIAL_STRIP = new Set(['sorokin', 'abep', 'ipea', 'cbo', 'cceb']);

const KIND_OVERRIDES = {
  'wiki-topic-capitalismo': 'concept',
  'wiki-topic-cidadania': 'concept',
  'wiki-topic-britanicos': 'concept',
  'wiki-topic-economia-politica': 'concept',
  'wiki-topic-castilhismo': 'ideology',
  'wiki-topic-tenentismo': 'ideology',
  'wiki-topic-presidente-do-brasil': 'institution',
};

const REMOVE_RELATIONS = new Set([
  'rel-wiki-topic-karl-marx-002',
  'rel-ai-exp-person-karl-marx-wiki-topic-casamento-42324b',
  'rel-wd-person-karl-marx-p50-wiki-topic-o-capital',
  'rel-ai-exp-wiki-topic-getulio-v-wiki-topic-1945-a091da',
  'rel-wiki-pessoa-jair-bolsonaro-001',
]);

const BRAZIL_POLITICAL_RELATIONS = [
  {
    id: 'rel-br-bolsonaro-presidente',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Tomou posse como presidente da República do Brasil em 1.º de janeiro de 2019, exercendo o mandato até 1.º de janeiro de 2023.',
    evidenceIds: ['ev-wiki-pessoa-jair-bolsonaro-004'],
  },
  {
    id: 'rel-br-bolsonaro-camara',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-camara-dos-deputados-do-brasil',
    type: 'participated_in',
    label: 'foi deputado federal em',
    reverseLabel: 'teve como deputado federal',
    context:
      'Foi eleito deputado federal em 1990 e exerceu sete mandatos consecutivos pelo Rio de Janeiro na Câmara dos Deputados.',
    evidenceIds: ['ev-wiki-pessoa-jair-bolsonaro-006'],
  },
  {
    id: 'rel-br-bolsonaro-exercito',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-exercito-brasileiro',
    type: 'participated_in',
    label: 'serviu como militar em',
    reverseLabel: 'teve em seus quadros',
    context:
      'Ingressou na carreira militar após formar-se na Academia Militar das Agulhas Negras (AMAN) em 1977.',
    evidenceIds: ['ev-wiki-topic-jair-bolsonaro-001'],
  },
  {
    id: 'rel-br-bolsonaro-covid',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-pandemia-de-covid-19-no-brasil',
    type: 'participated_in',
    label: 'governou durante',
    reverseLabel: 'ocorreu durante o governo de',
    context:
      'Conduziu a gestão federal durante a pandemia de COVID-19 no Brasil, alvo de críticas pela postura apontada como negacionista.',
    evidenceIds: ['ev-wiki-pessoa-jair-bolsonaro-002'],
  },
  {
    id: 'rel-br-bolsonaro-temer',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-michel-temer',
    type: 'documented-association',
    label: 'sucedeu na presidência',
    reverseLabel: 'foi sucedido na presidência por',
    context:
      'Assumiu a presidência da República em 1.º de janeiro de 2019, sucedendo o governo de Michel Temer.',
    evidenceIds: ['ev-wiki-pessoa-jair-bolsonaro-004'],
  },
  {
    id: 'rel-br-bolsonaro-lula',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-luiz-inacio-lula-da-silva',
    type: 'reacted_against',
    label: 'disputou a presidência e foi sucedido por',
    reverseLabel: 'derrotou e sucedeu',
    context:
      'Disputou a reeleição presidencial em 2022 e foi sucedido na presidência por Luiz Inácio Lula da Silva.',
    evidenceIds: ['ev-wiki-pessoa-jair-bolsonaro-008'],
  },
  {
    id: 'rel-br-bolsonaro-haddad',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-fernando-haddad',
    type: 'reacted_against',
    label: 'disputou a eleição presidencial de 2018 contra',
    reverseLabel: 'enfrentou no segundo turno de 2018',
    context:
      'Enfrentou Fernando Haddad no segundo turno da eleição presidencial brasileira de 2018.',
    evidenceIds: ['ev-rel-curation-haddad-lula'],
  },
  {
    id: 'rel-br-bolsonaro-conservadorismo',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-conservadorismo',
    type: 'documented-association',
    label: 'associou-se a pautas de',
    reverseLabel: 'associado à trajetória de',
    context:
      'Apresentou-se na campanha presidencial de 2018 como defensor de valores familiares, pauta pró-mercado e discurso antissistema.',
    evidenceIds: ['ev-wiki-topic-jair-bolsonaro-002'],
  },
  {
    id: 'rel-br-bolsonaro-direita',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-direita-politica',
    type: 'documented-association',
    label: 'situou-se no campo da',
    reverseLabel: 'teve atuação de',
    context:
      'Campanha eleitoral e agenda governamental associadas ao campo da direita política no Brasil contemporâneo.',
    evidenceIds: ['ev-wiki-topic-jair-bolsonaro-002'],
  },
  {
    id: 'rel-br-bolsonaro-extrema-direita',
    fromEntityId: 'wiki-topic-jair-bolsonaro',
    toEntityId: 'wiki-topic-extrema-direita',
    type: 'documented-association',
    label: 'associou-se ao campo da',
    reverseLabel: 'associado à atuação de',
    context:
      'Sua atuação política e o movimento bolsonarista são analisados pela literatura política em relação à extrema-direita contemporânea.',
    evidenceIds: ['ev-wiki-topic-jair-bolsonaro-002'],
  },
  {
    id: 'rel-br-washington-luis-presidente',
    fromEntityId: 'wiki-topic-washington-luis',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context: 'Assumiu a presidência da República em 15 de novembro de 1926.',
    evidenceIds: ['ev-wiki-topic-washington-luis-003'],
  },
  {
    id: 'rel-br-washington-luis-republica-velha',
    fromEntityId: 'wiki-topic-washington-luis',
    toEntityId: 'wiki-topic-primeira-republica-brasileira',
    type: 'participated_in',
    label: 'foi o último presidente da',
    reverseLabel: 'teve como último presidente',
    context: 'Presidiu o Brasil como o último mandatário da chamada República Velha.',
    evidenceIds: ['ev-wiki-topic-washington-luis-005'],
  },
  {
    id: 'rel-br-washington-luis-vargas',
    fromEntityId: 'wiki-topic-washington-luis',
    toEntityId: 'wiki-topic-getulio-vargas',
    type: 'reacted_against',
    label: 'foi deposto pelo movimento liderado por',
    reverseLabel: 'liderou o movimento que depôs',
    context:
      'Foi deposto em 24 de outubro de 1930 pelo movimento revolucionário que levou Getúlio Vargas ao poder.',
    evidenceIds: ['ev-wiki-topic-era-vargas-001'],
  },
  {
    id: 'rel-br-oswaldo-aranha-washington-luis',
    fromEntityId: 'wiki-topic-oswaldo-aranha',
    toEntityId: 'wiki-topic-washington-luis',
    type: 'reacted_against',
    label: 'articulou o levante que depôs',
    reverseLabel: 'foi deposto com articulação de',
    context:
      'Agiu nos bastidores para organizar o levante armado de 1930 que depôs Washington Luís.',
    evidenceIds: ['ev-wiki-topic-oswaldo-aranha-002'],
  },
  {
    id: 'rel-br-oswaldo-aranha-vargas',
    fromEntityId: 'wiki-topic-oswaldo-aranha',
    toEntityId: 'wiki-topic-getulio-vargas',
    type: 'participated_in',
    label: 'foi ministro e aliado de',
    reverseLabel: 'teve como ministro e aliado',
    context:
      'Ganhou destaque nacional a partir de 1930 como ministro e articulador político do governo Getúlio Vargas.',
    evidenceIds: ['ev-wiki-topic-oswaldo-aranha-004'],
  },
  {
    id: 'rel-br-oswaldo-aranha-era-vargas',
    fromEntityId: 'wiki-topic-oswaldo-aranha',
    toEntityId: 'wiki-topic-era-vargas',
    type: 'participated_in',
    label: 'participou da',
    reverseLabel: 'teve atuação de',
    context:
      'Exerceu papel central nos ministérios da Justiça, Fazenda e Relações Exteriores durante a Era Vargas.',
    evidenceIds: ['ev-wiki-topic-oswaldo-aranha-004'],
  },
  {
    id: 'rel-br-julio-prestes-republica-velha',
    fromEntityId: 'wiki-topic-julio-prestes',
    toEntityId: 'wiki-topic-primeira-republica-brasileira',
    type: 'documented-association',
    label: 'foi o último presidente eleito na',
    reverseLabel: 'teve como último presidente eleito',
    context:
      'Foi o último presidente eleito durante a Primeira República, impedido de tomar posse pela Revolução de 1930.',
    evidenceIds: ['ev-wiki-topic-julio-prestes-002'],
  },
  {
    id: 'rel-br-julio-prestes-washington-luis',
    fromEntityId: 'wiki-topic-julio-prestes',
    toEntityId: 'wiki-topic-washington-luis',
    type: 'documented-association',
    label: 'foi eleito para suceder',
    reverseLabel: 'apoiou a eleição de',
    context:
      'Venceu as eleições de 1.º de março de 1930 com apoio do governo Washington Luís, sem chegar a assumir.',
    evidenceIds: ['ev-wiki-topic-julio-prestes-009'],
  },
  {
    id: 'rel-br-julio-prestes-vargas',
    fromEntityId: 'wiki-topic-julio-prestes',
    toEntityId: 'wiki-topic-getulio-vargas',
    type: 'reacted_against',
    label: 'foi impedido de assumir pelo movimento de',
    reverseLabel: 'liderou o movimento que impediu a posse de',
    context:
      'Impedido de assumir a presidência pela Revolução de 1930, que conduziu Getúlio Vargas ao Governo Provisório.',
    evidenceIds: ['ev-wiki-topic-julio-prestes-002'],
  },
  {
    id: 'rel-br-deodoro-presidente',
    fromEntityId: 'wiki-topic-deodoro-da-fonseca',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'foi o primeiro',
    reverseLabel: 'teve como primeiro titular',
    context:
      'Foi eleito pelo Congresso Constituinte como o primeiro presidente constitucional da República.',
    evidenceIds: ['ev-wiki-topic-deodoro-da-fonseca-013'],
  },
  {
    id: 'rel-br-deodoro-republica-velha',
    fromEntityId: 'wiki-topic-deodoro-da-fonseca',
    toEntityId: 'wiki-topic-primeira-republica-brasileira',
    type: 'participated_in',
    label: 'proclamou e presidiu o início da',
    reverseLabel: 'foi iniciada por',
    context:
      'Liderou a Proclamação da República em 15 de novembro de 1889, inaugurando a Primeira República Brasileira.',
    evidenceIds: ['ev-wiki-topic-deodoro-da-fonseca-007'],
  },
  {
    id: 'rel-br-deodoro-exercito',
    fromEntityId: 'wiki-topic-deodoro-da-fonseca',
    toEntityId: 'wiki-topic-exercito-brasileiro',
    type: 'participated_in',
    label: 'foi marechal do',
    reverseLabel: 'teve como marechal',
    context: 'Seguiu carreira militar no Exército Brasileiro, alcançando o posto de marechal.',
    evidenceIds: ['ev-wiki-topic-deodoro-da-fonseca-001'],
  },
  {
    id: 'rel-br-deodoro-pedro-ii',
    fromEntityId: 'wiki-topic-deodoro-da-fonseca',
    toEntityId: 'wiki-topic-pedro-ii-do-brasil',
    type: 'reacted_against',
    label: 'participou da deposição de',
    reverseLabel: 'foi deposto no movimento liderado por',
    context:
      'Participou do movimento republicano de 15 de novembro de 1889 que pôs fim ao reinado de Pedro II.',
    evidenceIds: ['ev-wiki-topic-deodoro-da-fonseca-007'],
  },
  {
    id: 'rel-br-temer-presidente',
    fromEntityId: 'wiki-topic-michel-temer',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Assumiu a presidência da República em 2016, governando o Brasil até 1.º de janeiro de 2019.',
    evidenceIds: ['ev-wiki-topic-michel-temer-008'],
  },
  {
    id: 'rel-br-temer-dilma',
    fromEntityId: 'wiki-topic-michel-temer',
    toEntityId: 'wiki-topic-dilma-rousseff',
    type: 'documented-association',
    label: 'foi vice-presidente e sucedeu',
    reverseLabel: 'teve como vice-presidente e sucessor',
    context:
      'Exerceu a vice-presidência nos governos de Dilma Rousseff e assumiu o cargo após o impeachment de 2016.',
    evidenceIds: ['ev-wiki-topic-michel-temer-008'],
  },
  {
    id: 'rel-br-temer-impeachment',
    fromEntityId: 'wiki-topic-michel-temer',
    toEntityId: 'wiki-topic-impeachment-de-dilma-rousseff',
    type: 'documented-association',
    label: 'assumiu a presidência em decorrência do',
    reverseLabel: 'levou à posse presidencial de',
    context:
      'Assumiu definitivamente a presidência da República após a cassação do mandato de Dilma Rousseff em 31 de agosto de 2016.',
    evidenceIds: ['ev-wiki-topic-dilma-rousseff-007'],
  },
  {
    id: 'rel-br-temer-camara',
    fromEntityId: 'wiki-topic-michel-temer',
    toEntityId: 'wiki-topic-camara-dos-deputados-do-brasil',
    type: 'participated_in',
    label: 'atuou como deputado na',
    reverseLabel: 'teve participação parlamentar de',
    context:
      'Construiu carreira parlamentar na Câmara dos Deputados e publicou obra de referência sobre direito constitucional.',
    evidenceIds: ['ev-wiki-topic-michel-temer-002'],
  },
  {
    id: 'rel-br-janio-presidente',
    fromEntityId: 'wiki-topic-janio-quadros',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Eleito presidente da República em outubro de 1960, governou entre 31 de janeiro e 25 de agosto de 1961.',
    evidenceIds: ['ev-wiki-topic-janio-quadros-008'],
  },
  {
    id: 'rel-br-janio-goulart',
    fromEntityId: 'wiki-topic-janio-quadros',
    toEntityId: 'wiki-topic-joao-goulart',
    type: 'documented-association',
    label: 'renunciou e foi sucedido por',
    reverseLabel: 'sucedeu após a renúncia de',
    context:
      'Renunciou ao mandato presidencial em 25 de agosto de 1961, abrindo a crise sucessória que levou João Goulart à presidência.',
    evidenceIds: ['ev-wiki-topic-janio-quadros-010'],
  },
  {
    id: 'rel-br-janio-camara',
    fromEntityId: 'wiki-topic-janio-quadros',
    toEntityId: 'wiki-topic-camara-dos-deputados-do-brasil',
    type: 'participated_in',
    label: 'foi deputado federal na',
    reverseLabel: 'teve como deputado federal',
    context: 'Elegeu-se deputado federal pelo estado do Paraná em 1958.',
    evidenceIds: ['ev-wiki-topic-janio-quadros-007'],
  },
  {
    id: 'rel-br-jk-presidente',
    fromEntityId: 'wiki-topic-juscelino-kubitschek',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context: 'Foi o 21.º presidente do Brasil, governando entre 1956 e 1961.',
    evidenceIds: ['ev-wiki-topic-juscelino-kubitschek-008'],
  },
  {
    id: 'rel-br-jk-ditadura',
    fromEntityId: 'wiki-topic-juscelino-kubitschek',
    toEntityId: 'wiki-topic-ditadura-militar-brasileira',
    type: 'reacted_against',
    label: 'sofreu perseguição e teve morte apurada sob a',
    reverseLabel: 'cassou direitos políticos de',
    context:
      'Cassado após 1964, teve as circunstâncias de sua morte investigadas posteriormente pela Comissão Nacional da Verdade.',
    evidenceIds: ['ev-wiki-topic-juscelino-kubitschek-009'],
  },
  {
    id: 'rel-br-figueiredo-presidente',
    fromEntityId: 'wiki-topic-joao-figueiredo',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context: 'Foi o 30.º presidente do Brasil, exercendo o mandato de 1979 a 1985.',
    evidenceIds: ['ev-wiki-topic-joao-figueiredo-007'],
  },
  {
    id: 'rel-br-figueiredo-ditadura',
    fromEntityId: 'wiki-topic-joao-figueiredo',
    toEntityId: 'wiki-topic-ditadura-militar-brasileira',
    type: 'participated_in',
    label: 'foi o último presidente da',
    reverseLabel: 'teve como último presidente',
    context:
      'Presidiu a etapa final da ditadura militar brasileira, dando sequência à abertura política iniciada no governo Geisel.',
    evidenceIds: ['ev-wiki-topic-joao-figueiredo-002'],
  },
  {
    id: 'rel-br-figueiredo-sarney',
    fromEntityId: 'wiki-topic-joao-figueiredo',
    toEntityId: 'wiki-topic-jose-sarney',
    type: 'documented-association',
    label: 'foi sucedido na presidência por',
    reverseLabel: 'sucedeu na presidência',
    context:
      'Recusou-se a entregar a faixa presidencial a José Sarney na posse de 15 de março de 1985.',
    evidenceIds: ['ev-wiki-topic-joao-figueiredo-009'],
  },
  {
    id: 'rel-br-figueiredo-redemocratizacao',
    fromEntityId: 'wiki-topic-joao-figueiredo',
    toEntityId: 'wiki-topic-redemocratizacao-do-brasil',
    type: 'participated_in',
    label: 'governou durante a transição para a',
    reverseLabel: 'avançou ao fim do governo de',
    context:
      'Seu mandato acompanhou a transição que culminou na redemocratização do Brasil em 1985.',
    evidenceIds: ['ev-wiki-topic-joao-figueiredo-002'],
  },
  {
    id: 'rel-br-geisel-presidente',
    fromEntityId: 'wiki-topic-ernesto-geisel',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context: 'Foi o 29.º presidente do Brasil entre 15 de março de 1974 e 15 de março de 1979.',
    evidenceIds: ['ev-wiki-topic-ernesto-geisel-005'],
  },
  {
    id: 'rel-br-geisel-castelo-branco',
    fromEntityId: 'wiki-topic-ernesto-geisel',
    toEntityId: 'wiki-topic-humberto-castelo-branco',
    type: 'participated_in',
    label: 'chefiou a Casa Militar de',
    reverseLabel: 'nomeou para a Casa Militar',
    context:
      'Ingressou na cúpula política ao ser nomeado chefe da Casa Militar do governo Castelo Branco em 1964.',
    evidenceIds: ['ev-wiki-topic-ernesto-geisel-001'],
  },
  {
    id: 'rel-br-geisel-redemocratizacao',
    fromEntityId: 'wiki-topic-ernesto-geisel',
    toEntityId: 'wiki-topic-redemocratizacao-do-brasil',
    type: 'participated_in',
    label: 'conduziu a distensão rumo à',
    reverseLabel: 'teve abertura iniciada no governo de',
    context:
      'Conduziu a política de distensão lenta, gradual e segura que antecedeu a redemocratização do Brasil.',
    evidenceIds: ['ev-wiki-topic-ernesto-geisel-010'],
  },
  {
    id: 'rel-br-costa-e-silva-presidente',
    fromEntityId: 'wiki-topic-costa-e-silva',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Foi o segundo presidente do período da ditadura militar brasileira, sucedendo Humberto Castelo Branco.',
    evidenceIds: ['ev-wiki-topic-costa-e-silva-002'],
  },
  {
    id: 'rel-br-costa-e-silva-ditadura',
    fromEntityId: 'wiki-topic-costa-e-silva',
    toEntityId: 'wiki-topic-ditadura-militar-brasileira',
    type: 'participated_in',
    label: 'foi o segundo presidente da',
    reverseLabel: 'teve como segundo presidente',
    context:
      'Presidiu o país entre 1967 e 1969, durante o endurecimento institucional da ditadura militar brasileira.',
    evidenceIds: ['ev-wiki-topic-costa-e-silva-002'],
  },
  {
    id: 'rel-br-castelo-branco-presidente',
    fromEntityId: 'wiki-topic-humberto-castelo-branco',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Foi o 26.º presidente do Brasil e primeiro governante do regime instaurado pelo golpe militar de 1964.',
    evidenceIds: ['ev-wiki-topic-humberto-castelo-branco-003'],
  },
  {
    id: 'rel-br-castelo-branco-ditadura',
    fromEntityId: 'wiki-topic-humberto-castelo-branco',
    toEntityId: 'wiki-topic-ditadura-militar-brasileira',
    type: 'participated_in',
    label: 'foi o primeiro presidente da',
    reverseLabel: 'foi inaugurada por',
    context:
      'Primeiro presidente do período da ditadura militar brasileira, governando entre 1964 e 1967.',
    evidenceIds: ['ev-wiki-topic-humberto-castelo-branco-003'],
  },
  {
    id: 'rel-br-tancredo-presidente',
    fromEntityId: 'wiki-topic-tancredo-neves',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'documented-association',
    label: 'foi eleito',
    reverseLabel: 'teve como titular eleito em 1985',
    context:
      'Em 15 de janeiro de 1985 foi eleito presidente do Brasil pelo voto indireto de um colégio eleitoral.',
    evidenceIds: ['ev-wiki-topic-tancredo-neves-003'],
  },
  {
    id: 'rel-br-tancredo-redemocratizacao',
    fromEntityId: 'wiki-topic-tancredo-neves',
    toEntityId: 'wiki-topic-redemocratizacao-do-brasil',
    type: 'participated_in',
    label: 'liderou a transição civil na',
    reverseLabel: 'teve como figura central',
    context:
      'Sua eleição em 1985 pelo Colégio Eleitoral marcou a transição civil na redemocratização do Brasil.',
    evidenceIds: ['ev-wiki-topic-tancredo-neves-003'],
  },
  {
    id: 'rel-br-tancredo-sarney',
    fromEntityId: 'wiki-topic-tancredo-neves',
    toEntityId: 'wiki-topic-jose-sarney',
    type: 'documented-association',
    label: 'formou chapa presidencial com',
    reverseLabel: 'assumiu a presidência após a morte de',
    context:
      'Eleito em 1985 tendo José Sarney como vice-presidente; com a morte de Tancredo, Sarney assumiu em definitivo.',
    evidenceIds: ['ev-wiki-topic-tancredo-neves-003'],
  },
  {
    id: 'rel-br-ulysses-camara',
    fromEntityId: 'person-ulysses-guimaraes',
    toEntityId: 'wiki-topic-camara-dos-deputados-do-brasil',
    type: 'participated_in',
    label: 'presidiu a',
    reverseLabel: 'foi presidida por',
    context:
      'Presidiu a Câmara dos Deputados e, cumulativamente, a Assembleia Nacional Constituinte de 1987–1988.',
    evidenceIds: ['evidence-ulysses-presidency'],
  },
  {
    id: 'rel-br-ulysses-redemocratizacao',
    fromEntityId: 'person-ulysses-guimaraes',
    toEntityId: 'wiki-topic-redemocratizacao-do-brasil',
    type: 'participated_in',
    label: 'liderou o processo constituinte na',
    reverseLabel: 'teve na Constituinte a liderança de',
    context:
      'Conduziu a Assembleia Nacional Constituinte e promulgou a Constituição de 1988 durante a redemocratização.',
    evidenceIds: ['evidence-ulysses-presidency'],
  },
  {
    id: 'rel-br-ulysses-mdb-1980',
    fromEntityId: 'person-ulysses-guimaraes',
    toEntityId: 'wiki-topic-movimento-democratico-brasileiro-1980',
    type: 'participated_in',
    label: 'liderou o',
    reverseLabel: 'teve como liderança histórica',
    context:
      'Presidiu o Movimento Democrático Brasileiro na oposição ao regime militar e na reorganização partidária.',
    evidenceIds: ['ev-wiki-topic-fernando-henrique-cardoso-003'],
  },
  {
    id: 'rel-br-fhc-presidente',
    fromEntityId: 'wiki-topic-fernando-henrique-cardoso',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Foi empossado presidente da República em 1.º de janeiro de 1995, exercendo dois mandatos até 2003.',
    evidenceIds: ['ev-wiki-topic-fernando-henrique-cardoso-008'],
  },
  {
    id: 'rel-br-lula-presidente',
    fromEntityId: 'wiki-topic-luiz-inacio-lula-da-silva',
    toEntityId: 'wiki-topic-presidente-do-brasil',
    type: 'participated_in',
    label: 'exerceu o cargo de',
    reverseLabel: 'foi exercido por',
    context:
      'Tomou posse como 35.º presidente do Brasil em 1.º de janeiro de 2003 e voltou à presidência em 2023.',
    evidenceIds: ['ev-wiki-topic-luiz-inacio-lula-da-silva-011'],
  },
  {
    id: 'rel-br-alckmin-lula',
    fromEntityId: 'wiki-topic-geraldo-alckmin',
    toEntityId: 'wiki-topic-luiz-inacio-lula-da-silva',
    type: 'participated_in',
    label: 'elegeu-se vice-presidente na chapa de',
    reverseLabel: 'teve como vice-presidente',
    context:
      'Filiou-se ao PSB em 2022 e elegeu-se vice-presidente da República na chapa de Luiz Inácio Lula da Silva.',
    evidenceIds: ['ev-wiki-topic-geraldo-alckmin-001'],
  },
  {
    id: 'rel-br-alckmin-serra',
    fromEntityId: 'wiki-topic-geraldo-alckmin',
    toEntityId: 'wiki-topic-jose-serra',
    type: 'participated_in',
    label: 'cofundou o PSDB junto com',
    reverseLabel: 'cofundou o PSDB junto com',
    context:
      'Participou em 1988 da fundação do PSDB ao lado de José Serra, Fernando Henrique Cardoso e Mário Covas.',
    evidenceIds: ['ev-wiki-topic-geraldo-alckmin-004'],
  },
  {
    id: 'rel-br-alckmin-fhc',
    fromEntityId: 'wiki-topic-geraldo-alckmin',
    toEntityId: 'wiki-topic-fernando-henrique-cardoso',
    type: 'participated_in',
    label: 'cofundou o PSDB junto com',
    reverseLabel: 'cofundou o PSDB junto com',
    context:
      'Participou da fundação do PSDB em 1988 junto a Fernando Henrique Cardoso e lideranças paulistas.',
    evidenceIds: ['ev-wiki-topic-geraldo-alckmin-004'],
  },
  {
    id: 'rel-br-serra-fhc',
    fromEntityId: 'wiki-topic-jose-serra',
    toEntityId: 'wiki-topic-fernando-henrique-cardoso',
    type: 'participated_in',
    label: 'cofundou o PSDB junto com',
    reverseLabel: 'cofundou o PSDB junto com',
    context:
      'Foi em junho de 1988 um dos fundadores do PSDB juntamente com Fernando Henrique Cardoso e Mário Covas.',
    evidenceIds: ['ev-wiki-topic-jose-serra-006'],
  },
  {
    id: 'rel-br-serra-dilma',
    fromEntityId: 'wiki-topic-jose-serra',
    toEntityId: 'wiki-topic-dilma-rousseff',
    type: 'reacted_against',
    label: 'disputou o segundo turno de 2010 contra',
    reverseLabel: 'venceu no segundo turno de 2010',
    context: 'Foi derrotado por Dilma Rousseff no segundo turno da eleição presidencial de 2010.',
    evidenceIds: ['ev-wiki-topic-jose-serra-008'],
  },
  {
    id: 'rel-br-ciro-plano-real',
    fromEntityId: 'wiki-topic-ciro-gomes',
    toEntityId: 'wiki-topic-plano-real',
    type: 'participated_in',
    label: 'foi ministro da Fazenda durante o',
    reverseLabel: 'teve passagem ministerial de',
    context:
      'Assumiu o Ministério da Fazenda em setembro de 1994 durante a implantação do Plano Real.',
    evidenceIds: ['ev-wiki-topic-ciro-gomes-008'],
  },
  {
    id: 'rel-br-ciro-lula',
    fromEntityId: 'wiki-topic-ciro-gomes',
    toEntityId: 'wiki-topic-luiz-inacio-lula-da-silva',
    type: 'participated_in',
    label: 'foi ministro no primeiro governo de',
    reverseLabel: 'teve como ministro',
    context:
      'Integrou o governo Lula como ministro da Integração Nacional, conduzindo o projeto de transposição do rio São Francisco.',
    evidenceIds: ['ev-wiki-topic-ciro-gomes-012'],
  },
  {
    id: 'rel-br-ciro-camara',
    fromEntityId: 'wiki-topic-ciro-gomes',
    toEntityId: 'wiki-topic-camara-dos-deputados-do-brasil',
    type: 'participated_in',
    label: 'foi deputado federal na',
    reverseLabel: 'teve como deputado federal',
    context:
      'Foi eleito deputado federal pelo Ceará em 2006 com a maior votação proporcional do país.',
    evidenceIds: ['ev-wiki-topic-ciro-gomes-011'],
  },
  {
    id: 'rel-br-brizola-ptb-1945',
    fromEntityId: 'wiki-topic-leonel-brizola',
    toEntityId: 'wiki-topic-partido-trabalhista-brasileiro-1945',
    type: 'participated_in',
    label: 'iniciou a carreira parlamentar pelo',
    reverseLabel: 'teve nos quadros',
    context:
      'Elegeu-se deputado estadual pelo PTB em 1947, tornando-se liderança trabalhista no Rio Grande do Sul.',
    evidenceIds: ['ev-wiki-topic-leonel-brizola-002'],
  },
  {
    id: 'rel-br-brizola-trabalhismo',
    fromEntityId: 'wiki-topic-leonel-brizola',
    toEntityId: 'wiki-ideologia-trabalhismo-brasileiro',
    type: 'participated_in',
    label: 'foi uma das principais lideranças do',
    reverseLabel: 'teve como liderança central',
    context:
      'Liderou o trabalhismo brasileiro desde o PTB histórico até a fundação do Partido Democrático Trabalhista.',
    evidenceIds: ['ev-wiki-topic-leonel-brizola-rel-001'],
  },
  {
    id: 'rel-br-brizola-goulart',
    fromEntityId: 'wiki-topic-leonel-brizola',
    toEntityId: 'wiki-topic-joao-goulart',
    type: 'documented-association',
    label: 'foi aliado político de',
    reverseLabel: 'teve apoio político de',
    context:
      'Atuou ao lado de João Goulart no PTB gaúcho e na defesa da posse presidencial de 1961.',
    evidenceIds: ['ev-wiki-topic-leonel-brizola-002'],
  },
  {
    id: 'rel-br-plinio-extrema-direita',
    fromEntityId: 'wiki-topic-plinio-salgado',
    toEntityId: 'wiki-topic-extrema-direita',
    type: 'documented-association',
    label: 'liderou movimento associado à',
    reverseLabel: 'teve como expressão no Brasil',
    context:
      'Fundou e liderou a Ação Integralista Brasileira, partido nacionalista católico de extrema-direita inspirado no fascismo italiano.',
    evidenceIds: ['ev-wiki-topic-plinio-salgado-001'],
  },
  {
    id: 'rel-br-plinio-vargas',
    fromEntityId: 'wiki-topic-plinio-salgado',
    toEntityId: 'wiki-topic-getulio-vargas',
    type: 'reacted_against',
    label: 'aliou-se e depois rompeu com',
    reverseLabel: 'enfrentou o levante integralista liderado por',
    context:
      'Apoiou inicialmente Getúlio Vargas em contraposição à esquerda, rompendo após o Estado Novo com o levante integralista de 1938.',
    evidenceIds: ['ev-wiki-topic-plinio-salgado-003'],
  },
  {
    id: 'rel-br-plinio-camara',
    fromEntityId: 'wiki-topic-plinio-salgado',
    toEntityId: 'wiki-topic-camara-dos-deputados-do-brasil',
    type: 'participated_in',
    label: 'foi deputado federal na',
    reverseLabel: 'teve como deputado federal',
    context:
      'Foi eleito deputado federal pelo Paraná em 1958, atuando na Câmara até se aposentar em 1974.',
    evidenceIds: ['ev-wiki-topic-plinio-salgado-008'],
  },
];

function reverseLabelFor(type) {
  if (type === 'reacted_against') return 'foi criticado ou contestado por';
  if (type === 'participated_in') return 'teve participação de';
  if (type === 'influenced') return 'foi influenciado por';
  if (type === 'influenced_by') return 'influenciou';
  if (type === 'authored') return 'foi escrito por';
  return 'tem associação documentada com';
}

export async function cleanGraphQuality() {
  const beforeManifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
  const graph = await readSourceGraph(sourceDirectory);

  const entities = graph.atlases.flatMap((atlas) => atlas.entities);
  const titleOwners = new Map();
  for (const entity of entities) {
    const key = normalize(entity.title);
    if (key && !titleOwners.has(key)) titleOwners.set(key, entity.id);
  }

  let aliasesRemoved = 0;
  let kindsUpdated = 0;
  let relationsRemoved = 0;
  let relationsUpdated = 0;
  let relationsPromoted = 0;

  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) {
      const nextKind = KIND_OVERRIDES[entity.id];
      if (nextKind && entity.kind !== nextKind) {
        entity.kind = nextKind;
        kindsUpdated += 1;
      }

      const seenAliases = new Set();
      const keptAliases = [];
      for (const alias of entity.aliases) {
        const key = normalize(alias);
        if (!key || seenAliases.has(key)) {
          aliasesRemoved += 1;
          continue;
        }
        const preserveCapital = entity.id === 'work-capital-volume-i' && key === 'o capital';
        if (!preserveCapital) {
          const titleOwner = titleOwners.get(key);
          const canonicalOwner = CANONICAL_ALIAS_OWNERS.get(key);
          const isClasseSocialNoise =
            entity.id === 'wiki-topic-classe-social' && CLASSE_SOCIAL_STRIP.has(key);
          if (
            (titleOwner && titleOwner !== entity.id) ||
            (canonicalOwner && canonicalOwner !== entity.id) ||
            isClasseSocialNoise
          ) {
            aliasesRemoved += 1;
            continue;
          }
        }
        seenAliases.add(key);
        keptAliases.push(alias);
      }
      entity.aliases = keptAliases;
    }

    const methodologyIds =
      atlas.id === 'atlas-methodology' ? new Set(atlas.entities.map((e) => e.id)) : null;
    const nextRelations = [];
    for (const rel of atlas.relations) {
      if (
        REMOVE_RELATIONS.has(rel.id) ||
        (methodologyIds &&
          rel.id.startsWith('rel-rag-') &&
          (!methodologyIds.has(rel.fromEntityId) || !methodologyIds.has(rel.toEntityId)))
      ) {
        relationsRemoved += 1;
        continue;
      }
      if (rel.id === 'rel-wiki-topic-presidente-do-brasil-001') {
        if (rel.label !== 'exerceu o cargo de' || rel.reverseLabel !== 'foi exercido por') {
          rel.label = 'exerceu o cargo de';
          rel.reverseLabel = 'foi exercido por';
          relationsUpdated += 1;
        }
      }
      nextRelations.push(rel);
    }
    atlas.relations = nextRelations;
  }

  const allEntityIds = new Set(entities.map((e) => e.id));
  const existingPairs = new Set();
  const existingRelationIds = new Set();
  const claimById = new Map();
  const citationById = new Map();
  const atlasByEvidenceId = new Map();
  const evidenceById = new Map();
  const sourceById = new Map();
  const atlasByEntityId = new Map();

  for (const atlas of graph.atlases) {
    for (const entity of atlas.entities) atlasByEntityId.set(entity.id, atlas);
    for (const source of atlas.sources) sourceById.set(source.id, source);
    for (const rel of atlas.relations) {
      existingRelationIds.add(rel.id);
      existingPairs.add(`${rel.fromEntityId}|${rel.toEntityId}`);
      existingPairs.add(`${rel.toEntityId}|${rel.fromEntityId}`);
    }
    for (const claim of atlas.claims) claimById.set(claim.id, claim);
    for (const citation of atlas.citations) citationById.set(citation.id, citation);
    for (const evidence of atlas.evidences) {
      atlasByEvidenceId.set(evidence.id, atlas);
      evidenceById.set(evidence.id, evidence);
    }
  }

  let brazilRelationsAdded = 0;
  for (const item of BRAZIL_POLITICAL_RELATIONS) {
    if (!allEntityIds.has(item.fromEntityId) || !allEntityIds.has(item.toEntityId)) continue;
    if (existingPairs.has(`${item.fromEntityId}|${item.toEntityId}`)) continue;
    if (existingRelationIds.has(item.id)) continue;
    const evidence = evidenceById.get(item.evidenceIds[0]);
    const targetAtlas = atlasByEvidenceId.get(item.evidenceIds[0]);
    if (!evidence || !targetAtlas) continue;
    const source = sourceById.get(evidence.sourceId);
    const wikipediaUrl = source?.url && /wikipedia\.org/i.test(source.url) ? source.url : undefined;
    targetAtlas.relations.push({
      id: item.id,
      fromEntityId: item.fromEntityId,
      toEntityId: item.toEntityId,
      type: item.type,
      label: item.label,
      reverseLabel: item.reverseLabel,
      context: item.context,
      temporalExtent: null,
      uncertainty: 'low',
      evidenceIds: item.evidenceIds,
      editorialStatus: 'pending',
      ...(wikipediaUrl
        ? {
            provenance: {
              source: 'wikipedia',
              url: wikipediaUrl,
              retrievedAt: evidence.accessedAt,
            },
          }
        : {}),
    });
    existingRelationIds.add(item.id);
    existingPairs.add(`${item.fromEntityId}|${item.toEntityId}`);
    existingPairs.add(`${item.toEntityId}|${item.fromEntityId}`);
    brazilRelationsAdded += 1;
  }

  const rawCandidates = JSON.parse(await readFile(candidatesPath, 'utf8'));
  const candidates = Array.isArray(rawCandidates) ? rawCandidates : (rawCandidates.items ?? []);
  for (const candidate of candidates) {
    const quote = candidate.literal_quote?.trim() ?? '';
    if (
      candidate.from_is_orphan !== true ||
      (candidate.rerank_score ?? 0) < 0.75 ||
      quote.length < 40
    ) {
      continue;
    }
    const fromId = candidate.from?.id;
    const toId = candidate.to?.id;
    if (!fromId || !toId || fromId === toId) continue;
    if (!allEntityIds.has(fromId) || !allEntityIds.has(toId)) continue;
    if (existingPairs.has(`${fromId}|${toId}`)) continue;

    const claim = candidate.quote_origin ? claimById.get(candidate.quote_origin) : undefined;
    const evidenceIds = [
      ...new Set(
        (claim?.citationIds ?? []).map((cid) => citationById.get(cid)?.evidenceId).filter(Boolean),
      ),
    ];
    if (!evidenceIds.length) continue;

    const toAtlas = atlasByEntityId.get(toId);
    const fromAtlas = atlasByEntityId.get(fromId);
    const evidenceAtlas = atlasByEvidenceId.get(evidenceIds[0]);
    const targetAtlas =
      toAtlas && toAtlas.id !== 'atlas-methodology'
        ? toAtlas
        : fromAtlas && fromAtlas.id !== 'atlas-methodology'
          ? fromAtlas
          : evidenceAtlas;
    if (!targetAtlas) continue;

    const sameAtlasEvidenceIds = evidenceIds.filter(
      (evId) => atlasByEvidenceId.get(evId)?.id === targetAtlas.id,
    );
    const chosenEvidenceIds = sameAtlasEvidenceIds.length ? sameAtlasEvidenceIds : evidenceIds;
    const relId = `rel-rag-${String(candidate.id).toLowerCase()}`;
    if (existingRelationIds.has(relId)) continue;

    targetAtlas.relations.push({
      id: relId,
      fromEntityId: fromId,
      toEntityId: toId,
      type: candidate.suggested_type,
      label: candidate.suggested_label,
      reverseLabel: reverseLabelFor(candidate.suggested_type),
      context: `${quote} [conferência de IA]`,
      temporalExtent: null,
      uncertainty: 'moderate',
      evidenceIds: chosenEvidenceIds,
      editorialStatus: 'pending',
    });
    existingRelationIds.add(relId);
    existingPairs.add(`${fromId}|${toId}`);
    existingPairs.add(`${toId}|${fromId}`);
    relationsPromoted += 1;
  }

  const nextManifest = await writeSourceGraph(graph, { directory: sourceDirectory });
  const activeFiles = new Set(nextManifest.collections.map((c) => c.file));
  const oldFiles = beforeManifest.collections.map((c) => c.file).filter((f) => !activeFiles.has(f));
  const collectionsDir = join(sourceDirectory, 'collections');
  const existingOnDisk = new Set(
    (await readdir(collectionsDir)).map((name) => `collections/${name}`),
  );
  let filesRemoved = 0;
  for (const oldFile of oldFiles) {
    if (existingOnDisk.has(oldFile)) {
      await unlink(join(sourceDirectory, oldFile));
      filesRemoved += 1;
    }
  }

  return {
    aliasesRemoved,
    kindsUpdated,
    relationsRemoved,
    relationsUpdated,
    relationsPromoted,
    brazilRelationsAdded,
    filesRemoved,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const summary = await cleanGraphQuality();
  console.log('Saneamento do grafo concluído:', summary);
}
