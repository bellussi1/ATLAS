import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../content/ideologies/', import.meta.url);
const situational = ['epocas', 'pensadores', 'vertentes', 'experiencias', 'debates'];
const words = (text) => text.match(/\S+/g)?.length ?? 0;

async function pages() {
  const entries = await readdir(root, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === 'examples') continue;
    try {
      result.push(JSON.parse(await readFile(new URL(`${entry.name}/page.json`, root), 'utf8')));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return result;
}

test('published readings keep enough context in Situar and Avaliar', async () => {
  const published = (await pages()).filter((page) => page.published);
  assert.ok(published.length >= 2);
  for (const page of published) {
    const total = page.chapters.reduce(
      (sum, chapter) => sum + words(chapter.narrative.join(' ')),
      0,
    );
    assert.ok(total >= 1000, `${page.slug} tem apenas ${total} palavras`);
    for (const id of situational) {
      const chapter = page.chapters.find((item) => item.id === id);
      assert.ok(chapter, `${page.slug} não tem ${id}`);
      assert.ok(chapter.sourceIds.length > 0, `${page.slug}/${id} precisa de ao menos uma fonte`);
      assert.ok(
        words(chapter.narrative.join(' ')) >= 60,
        `${page.slug}/${id} ainda é curto demais`,
      );
    }
  }
});

test('draft readings stay drafts and declare their gaps', async () => {
  const drafts = (await pages()).filter((page) => !page.published);
  for (const page of drafts) {
    assert.notEqual(
      page.review.status,
      'revisado',
      `${page.slug} não pode ser revisado sem pessoa identificada`,
    );
    const pending = page.chapters.filter((chapter) => chapter.coverage !== 'complete');
    assert.ok(pending.length > 0, `${page.slug} deveria declarar cobertura parcial ou pendente`);
    for (const chapter of pending) assert.ok(chapter.gap, `${page.slug}/${chapter.id} sem gap`);
  }
});

function collectSourceIds(value, found = new Set()) {
  if (Array.isArray(value)) {
    for (const item of value) collectSourceIds(item, found);
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'sourceIds' && Array.isArray(item)) for (const id of item) found.add(id);
    else collectSourceIds(item, found);
  }
  return found;
}

test('the bibliography lists every source cited by the reading', async () => {
  for (const page of (await pages()).filter((item) => item.published)) {
    const cited = collectSourceIds(page);
    const bibliography = page.chapters
      .find((chapter) => chapter.id === 'fontes')
      .blocks.find((block) => block.type === 'sources');
    for (const id of cited) {
      assert.ok(
        bibliography.sourceIds.includes(id),
        `${page.slug}: ${id} é citada, mas não aparece na bibliografia`,
      );
    }
    assert.equal(
      page.chapters.find((chapter) => chapter.id === 'fontes').kicker,
      'Fontes e metodologia',
    );
  }
});

test('published readings keep chapter reviews and a curated opening', async () => {
  for (const page of (await pages()).filter((item) => item.published)) {
    assert.ok(
      page.chapters.some((chapter) => chapter.review),
      `${page.slug} perdeu as revisões de capítulo`,
    );
    assert.ok(
      page.poster.figures.length > 0,
      `${page.slug} perdeu a seleção editorial de imagens de abertura`,
    );
  }
});
