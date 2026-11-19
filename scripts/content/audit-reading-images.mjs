#!/usr/bin/env node
/**
 * Auditoria de licenças das imagens usadas nas leituras publicadas (#94).
 *
 *   node scripts/content/audit-reading-images.mjs
 *
 * Percorre as figuras de abertura (`poster.figures`) de todas as leituras do
 * registro, localiza o registro de licença correspondente no atlas dono do
 * ativo e confere criador, licença, URL de licença, URL de origem e permissão
 * de reprodução. Relatório em `generated/image-audit/report.md`; nada é
 * alterado.
 */
import './register-source-modules.mjs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const { publishedIdeologies } =
  await import('../../src/app/features/ideologies/data/published-ideologies.ts');

const knowledgeDir = join(process.cwd(), 'content/knowledge');
const manifest = JSON.parse(await readFile(join(knowledgeDir, 'manifest.json'), 'utf8'));
const atlases = new Map();
const licensesByAsset = new Map();
for (const collection of manifest.collections) {
  const atlas = JSON.parse(await readFile(join(knowledgeDir, collection.file), 'utf8'));
  atlases.set(atlas.slug, atlas);
  for (const license of atlas.assetLicenses ?? []) {
    if (!license.assetPath) continue;
    licensesByAsset.set(license.id, { license, atlas: atlas.slug });
  }
}

const rows = [];
const problems = [];
for (const [slug, source] of Object.entries(publishedIdeologies)) {
  const page = JSON.parse(await readFile(join(process.cwd(), source.page), 'utf8'));
  const figures = page.poster?.figures ?? [];
  if (!figures.length) {
    rows.push({ slug, figures: 0, note: 'sem figuras de abertura (fallback geométrico)' });
    continue;
  }
  rows.push({ slug, figures: figures.length });
  for (const [index, figure] of figures.entries()) {
    const label = `${slug} #${index + 1} (${figure.entityId})`;
    const record = licensesByAsset.get(figure.assetId);
    if (!record) {
      problems.push(`${label}: registro de licença não encontrado para o ativo ${figure.assetId}`);
      continue;
    }
    const { license, atlas } = record;
    if (license.status !== 'known')
      problems.push(`${label}: status ${license.status} (esperado known)`);
    if (license.reproduction !== 'allowed')
      problems.push(`${label}: reprodução ${license.reproduction} (esperado allowed)`);
    if (
      !license.creator &&
      !/autor n[ãa]o identificado|unknown author|anonymous/i.test(license.attribution ?? '')
    )
      problems.push(`${label}: criador ausente e não declarado como não identificado`);
    if (!license.license) problems.push(`${label}: licença ausente`);
    if (!license.licenseUrl || !/^https?:\/\//.test(license.licenseUrl))
      problems.push(`${label}: URL de licença ausente ou inválida`);
    if (!license.sourceUrl || !/^https?:\/\//.test(license.sourceUrl))
      problems.push(`${label}: URL de origem ausente ou inválida`);
    if (license.license && !/cc|dom[ií]nio p[uú]blico|public domain/i.test(license.license))
      problems.push(`${label}: licença fora do padrão esperado (${license.license})`);
    rows.push({
      slug: `${label}`,
      figures: 1,
      note: `${license.license ?? 'sem licença'} · ${license.creator ?? 'sem criador'} · atlas ${atlas}`,
    });
  }
}

const outputDir = join(process.cwd(), 'generated/image-audit');
await mkdir(outputDir, { recursive: true });
const lines = [
  '# Auditoria de licenças das imagens de abertura',
  '',
  `Gerada em ${new Date().toISOString().slice(0, 10)}. Apenas leitura; nada foi alterado.`,
  '',
  `Leituras no registro: ${rows.filter((row) => !row.slug.includes('#')).length}`,
  `Figuras auditadas: ${rows.reduce((sum, row) => sum + (row.slug.includes('#') ? 1 : 0), 0)}`,
  `Problemas: ${problems.length}`,
  '',
  '## Figuras',
  '',
];
for (const row of rows) {
  lines.push(`- ${row.slug}${row.note ? ` — ${row.note}` : ''}`);
}
if (problems.length) {
  lines.push('', '## Problemas', '');
  for (const problem of problems) lines.push(`- ${problem}`);
} else {
  lines.push(
    '',
    'Nenhum problema estrutural encontrado. A conferência de conteúdo (autoria correta e texto de crédito) continua sendo humana.',
  );
}
lines.push('');
await writeFile(join(outputDir, 'report.md'), lines.join('\n'));
console.log(
  `Figuras auditadas: ${rows.reduce((sum, row) => sum + (row.slug.includes('#') ? 1 : 0), 0)}; problemas: ${problems.length}`,
);
for (const problem of problems) console.log(`- ${problem}`);
if (!problems.length) console.log('Estrutura OK; conferência de autoria segue humana (#94).');
