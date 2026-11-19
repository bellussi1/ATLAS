#!/usr/bin/env node
/**
 * Auditoria local das fontes Firecrawl e dos rascunhos de enriquecimento.
 *
 *   node scripts/content/review-firecrawl-queue.mjs
 *
 * Grava `generated/firecrawl-review/review.json` e `review.md`. Não altera
 * `review` nem `ok` de nenhum item: a decisão humana continua separada.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const seedsPath = join(root, 'scripts/ingestion/firecrawl/seeds.json');
const draftsDir = join(root, 'experiments/rag/eval/queues/enrichment-drafts');
const outputDir = join(root, 'generated/firecrawl-review');

const allowedHosts = [
  'pt.wikipedia.org',
  'en.wikipedia.org',
  'www.marxists.org',
  'www.planalto.gov.br',
  'plato.stanford.edu',
  'iep.utm.edu',
  'avalon.law.yale.edu',
  'www2.camara.leg.br',
];

const expectedPolicy = (seed) => {
  if (seed.url.includes('wikipedia.org')) return 'open-reuse';
  if (seed.url.includes('marxists.org')) return 'reference-only';
  if (seed.url.includes('planalto.gov.br') || seed.url.includes('camara.leg.br'))
    return 'open-reuse';
  return seed.usagePolicy;
};

const genericSeeds = new Set([
  'wiki-pt-boston',
  'wiki-pt-brasil',
  'wiki-en-academy-of-marxism',
  'wiki-en-analyse-kritik',
]);

const editorialNotes = {
  'gap-constituicao-1988': [
    'As relações com EC 19/1998, Lei 13.105/2015 e Lei 9.296/1996 usam a URL da Constituição; a fonte não necessariamente nomeia essas normas. Validar cada alvo antes de criar aresta.',
  ],
  'gap-estado-novo-1937': [
    'A relação com a Constituição de 1946 é posterior à fonte de 1937; a relação com o Governo Provisório de 1930 não é sustentada pelo texto constitucional. Tratar como hipótese, não como fato documentado.',
  ],
  'gap-ai5-1968': [
    'A relação "Ruptura revisou AI-2" usa o AI-5 como fonte. O AI-5 não revisou o AI-2; no máximo o sucedeu no endurecimento. Revisar família, rótulo e direção.',
  ],
  'gap-ai1-golpe-1964': [
    'Quatro relações usam a família "Influência" para verbos de instituição e continuidade. Reclassificar família/rótulo antes de promover.',
  ],
};

const files = (await import('node:fs/promises')).readdir;
const draftFiles = (await files(draftsDir).catch(() => [])).filter(
  (name) => name.endsWith('.json') && name !== 'index.json',
);

const seedCatalog = JSON.parse(await readFile(seedsPath, 'utf8'));
const seeds = seedCatalog.seeds.filter((seed) => seed.origin === 'discovery');
const seedIssues = [];
const seenSlugs = new Set();
const seenUrls = new Set();
for (const seed of seeds) {
  if (seenSlugs.has(seed.slug)) seedIssues.push(`${seed.slug}: slug duplicado`);
  if (seenUrls.has(seed.url)) seedIssues.push(`${seed.slug}: URL duplicada`);
  seenSlugs.add(seed.slug);
  seenUrls.add(seed.url);
  const host = new URL(seed.url).hostname;
  if (!allowedHosts.includes(host)) seedIssues.push(`${seed.slug}: host não previsto (${host})`);
  if (seed.usagePolicy !== expectedPolicy(seed))
    seedIssues.push(
      `${seed.slug}: política ${seed.usagePolicy} divergente do esperado ${expectedPolicy(seed)}`,
    );
  if (!seed.title || seed.title.length < 3) seedIssues.push(`${seed.slug}: título curto`);
}

const drafts = [];
for (const file of draftFiles) {
  const draft = JSON.parse(await readFile(join(draftsDir, file), 'utf8'));
  const sourceUrls = new Set((draft.sources_used ?? []).map((source) => source.url));
  const issues = [];
  if (draft.ok !== null) issues.push('ok deveria permanecer null até revisão humana');
  if (!draft.entity?.slug) issues.push('entidade sem slug');
  if (!draft.entity?.title) issues.push('entidade sem título');
  for (const [index, claim] of (draft.claims ?? []).entries()) {
    if (!sourceUrls.has(claim.source_url))
      issues.push(`afirmação ${index + 1}: URL fora de sources_used`);
  }
  for (const [index, relation] of (draft.relations ?? []).entries()) {
    if (!sourceUrls.has(relation.source_url))
      issues.push(`relação ${index + 1}: URL fora de sources_used`);
    if (
      ![
        'Influência',
        'Ruptura',
        'Atuação',
        'Criação',
        'Continuidade',
        'Filiação',
        'Lugar',
      ].includes(relation.family)
    )
      issues.push(`relação ${index + 1}: família inválida (${relation.family})`);
    if (!relation.target_title) issues.push(`relação ${index + 1}: alvo vazio`);
  }
  drafts.push({
    file,
    topic: draft.entity?.title ?? draft.topic,
    claims: draft.claims?.length ?? 0,
    relations: draft.relations?.length ?? 0,
    issues,
    notes: editorialNotes[draft.gap_id] ?? [],
  });
}

const payload = {
  generatedAt: new Date().toISOString(),
  humanReviewed: false,
  seeds: {
    total: seeds.length,
    pending: seeds.filter((seed) => seed.review === 'pending').length,
    generic: [...genericSeeds].filter((slug) => seeds.some((seed) => seed.slug === slug)),
    issues: seedIssues,
  },
  drafts,
};

await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'review.json'), `${JSON.stringify(payload, null, 2)}\n`);

const lines = [
  '# Revisão das fontes Firecrawl e dos rascunhos',
  '',
  `Gerada em ${payload.generatedAt.slice(0, 10)}. Nenhum item foi aprovado ou publicado.`,
  '',
  '## Seeds descobertos',
  '',
  `- Total: ${payload.seeds.total}`,
  `- Pendentes: ${payload.seeds.pending}`,
  `- Sem problemas de metadados: ${payload.seeds.issues.length === 0 ? 'sim' : 'não'}`,
];
if (payload.seeds.generic.length) {
  lines.push(
    `- Baixa centralidade editorial (manter no corpus, não promover como fonte principal): ${payload.seeds.generic.join(', ')}`,
  );
}
if (payload.seeds.issues.length) {
  lines.push('', '### Problemas de metadados');
  for (const issue of payload.seeds.issues) lines.push(`- ${issue}`);
}
lines.push('', '## Rascunhos de enriquecimento', '');
for (const draft of drafts) {
  lines.push(
    `### ${draft.topic}`,
    '',
    `Arquivo: \`${draft.file}\`  `,
    `Afirmações: ${draft.claims} · Relações: ${draft.relations}`,
    '',
  );
  if (draft.issues.length) {
    lines.push('Automação:');
    for (const issue of draft.issues) lines.push(`- ${issue}`);
    lines.push('');
  }
  if (draft.notes.length) {
    lines.push('Leitura editorial:');
    for (const note of draft.notes) lines.push(`- ${note}`);
    lines.push('');
  }
}
lines.push(
  '## Decisão',
  '',
  'Manter todos os itens com `ok: null`. Promover apenas depois de conferir a fonte que sustenta cada afirmação e cada relação, com família, direção e rótulo ajustados.',
  '',
);
await writeFile(join(outputDir, 'review.md'), `${lines.join('\n')}\n`);
console.log(`Revisão gerada em ${outputDir}`);
console.log(
  `Seeds: ${payload.seeds.total} (${payload.seeds.pending} pendentes, ${payload.seeds.issues.length} problemas). Rascunhos: ${drafts.length}.`,
);
