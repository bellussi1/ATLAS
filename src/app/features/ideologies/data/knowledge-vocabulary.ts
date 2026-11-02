import { type KnowledgeTerm } from '@ideologies/models/knowledge-term';

/**
 * Words that become explorable in the dossiers. Each definition is a one-line orientation
 * shown on hover/focus; the full sourced context opens on click. Several labels may share
 * an entity (full name and surname); only the first occurrence per paragraph is linked.
 */
const term = (labels: string[], entityId: string, kind: string, definition: string) =>
  labels.map((label) => ({ label, entityId, kind, definition }));

export const terms: KnowledgeTerm[] = [
  ...term(
    ['Karl Marx', 'Marx'],
    'person-karl-marx',
    'Pensador',
    'Filósofo e economista alemão (1818–1883), autor de O capital e coautor do Manifesto.',
  ),
  ...term(
    ['Friedrich Engels', 'Engels'],
    'person-friedrich-engels',
    'Pensador',
    'Parceiro intelectual de Marx (1820–1895); editou os volumes póstumos de O capital.',
  ),
  ...term(
    ['Lenin'],
    'person-vladimir-lenin',
    'Pensador',
    'Dirigente bolchevique (1870–1924) e teórico do partido e do Estado revolucionário.',
  ),
  ...term(
    ['Rosa Luxemburg', 'Luxemburg'],
    'person-rosa-luxemburg',
    'Pensadora',
    'Marxista polonesa-alemã (1871–1919), crítica do reformismo e do autoritarismo bolchevique.',
  ),
  ...term(
    ['Eduard Bernstein', 'Bernstein'],
    'person-eduard-bernstein',
    'Pensador',
    'Social-democrata alemão (1850–1932) que propôs revisar Marx rumo a reformas graduais.',
  ),
  ...term(
    ['Karl Kautsky', 'Kautsky'],
    'person-karl-kautsky',
    'Pensador',
    'Principal teórico da Segunda Internacional (1854–1938).',
  ),
  ...term(
    ['Antonio Gramsci', 'Gramsci'],
    'person-antonio-gramsci',
    'Pensador',
    'Marxista italiano (1891–1937) conhecido pelo conceito de hegemonia.',
  ),
  ...term(
    ['Trotsky'],
    'person-leon-trotsky',
    'Pensador',
    'Dirigente da Revolução Russa (1879–1940) e teórico da revolução permanente.',
  ),
  ...term(
    ['Stalin'],
    'person-joseph-stalin',
    'Dirigente',
    'Líder da União Soviética (1878–1953) e defensor do socialismo em um só país.',
  ),
  ...term(
    ['Mao'],
    'person-mao-zedong',
    'Dirigente',
    'Líder do Partido Comunista Chinês (1893–1976) e fundador da República Popular.',
  ),
  ...term(
    ['Mariátegui'],
    'person-jose-carlos-mariategui',
    'Pensador',
    'Marxista peruano (1894–1930), autor dos Sete ensaios sobre a realidade peruana.',
  ),
  ...term(
    ['Caio Prado Júnior'],
    'person-caio-prado-junior',
    'Pensador',
    'Historiador brasileiro (1907–1990) que reinterpretou a formação colonial do Brasil.',
  ),
  ...term(
    ['Florestan Fernandes'],
    'person-florestan-fernandes',
    'Pensador',
    'Sociólogo brasileiro (1920–1995), autor de A revolução burguesa no Brasil.',
  ),
  ...term(
    ['Materialismo histórico'],
    'concept-historical-materialism',
    'Conceito',
    'Abordagem que explica a mudança histórica pelas relações de produção.',
  ),
  ...term(
    ['tempo de trabalho socialmente necessário'],
    'concept-trabalho-socialmente-necessario',
    'Conceito',
    'Em Marx, o tempo médio de trabalho que determina o valor de uma mercadoria.',
  ),
  ...term(
    ['Manifesto Comunista', 'Manifesto do Partido Comunista'],
    'work-communist-manifesto',
    'Obra',
    'Panfleto de Marx e Engels publicado em 1848 para a Liga dos Comunistas.',
  ),
  ...term(
    ['O capital'],
    'work-capital-volume-i',
    'Obra',
    'Crítica da economia política de Marx; o primeiro volume saiu em 1867.',
  ),
  ...term(
    ['Comuna de Paris'],
    'event-paris-commune',
    'Acontecimento',
    'Governo revolucionário de Paris entre março e maio de 1871.',
  ),
  ...term(
    ['Revolução Russa'],
    'event-russian-revolution',
    'Acontecimento',
    'Revoluções de 1917 que derrubaram o czarismo e levaram os bolcheviques ao poder.',
  ),
  ...term(
    ['Segunda Internacional'],
    'institution-second-international',
    'Instituição',
    'Federação de partidos socialistas fundada em 1889.',
  ),
  ...term(
    ['John Locke', 'Locke'],
    'person-john-locke',
    'Pensador',
    'Filósofo inglês (1632–1704) que fundou o governo no consentimento e nos direitos naturais.',
  ),
  ...term(
    ['Adam Smith', 'Smith'],
    'person-adam-smith',
    'Pensador',
    'Filósofo escocês (1723–1790), autor de A riqueza das nações.',
  ),
  ...term(
    ['Montesquieu'],
    'person-montesquieu',
    'Pensador',
    'Filósofo francês (1689–1755) que defendeu a separação dos poderes.',
  ),
  ...term(
    ['Tocqueville'],
    'person-alexis-de-tocqueville',
    'Pensador',
    'Pensador francês (1805–1859), autor de A democracia na América.',
  ),
  ...term(
    ['John Stuart Mill', 'Mill'],
    'person-john-stuart-mill',
    'Pensador',
    'Filósofo inglês (1806–1873), autor de Sobre a liberdade e do princípio do dano.',
  ),
  ...term(
    ['Friedrich Hayek', 'Hayek'],
    'person-friedrich-hayek',
    'Pensador',
    'Economista austríaco (1899–1992), crítico do planejamento econômico.',
  ),
  ...term(
    ['Isaiah Berlin', 'Berlin'],
    'person-isaiah-berlin',
    'Pensador',
    'Filósofo britânico (1909–1997) que distinguiu liberdade negativa e positiva.',
  ),
  ...term(
    ['A riqueza das nações'],
    'work-wealth-of-nations',
    'Obra',
    'Obra de Adam Smith publicada em 1776 sobre divisão do trabalho e comércio.',
  ),
  ...term(
    ['Revolução Gloriosa'],
    'event-glorious-revolution',
    'Acontecimento',
    'Deposição de Jaime II na Inglaterra (1688–1689), que fortaleceu o Parlamento.',
  ),
  ...term(
    ['Revolução Americana'],
    'event-american-revolution',
    'Acontecimento',
    'Independência das Treze Colônias (1775–1783).',
  ),
  ...term(
    ['Revolução Francesa'],
    'event-french-revolution',
    'Acontecimento',
    'Revolução iniciada em 1789 que proclamou os direitos do homem e do cidadão.',
  ),
  ...term(
    ['liberalismo clássico'],
    'ideology-classical-liberalism',
    'Tradição',
    'Vertente que enfatiza governo limitado, propriedade e mercado livre.',
  ),
  ...term(
    ['liberalismo social'],
    'ideology-social-liberalism',
    'Tradição',
    'Vertente que defende condições materiais garantidas para tornar a liberdade efetiva.',
  ),
  ...term(
    ['neoliberalismo'],
    'ideology-neoliberalism',
    'Tradição',
    'Rótulo disputado para a defesa renovada do mercado desde meados do século XX.',
  ),
];
