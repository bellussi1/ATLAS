#!/usr/bin/env node
/**
 * Prepara o próximo post da série: confere a pauta, regenera o carrossel e
 * mostra o que ainda falta antes de publicar.
 *
 *   node docs/social/linkedin/prepare.mjs [--today AAAA-MM-DD]
 *
 * Não publica. Para publicar, use `publish.mjs` depois de revisar o PDF.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { buildReadiness, renderPauta } from './schedule.mjs';

const here = dirname(fileURLToPath(import.meta.url));

const { values } = parseArgs({ options: { today: { type: 'string' } } });

try {
  const report = await buildReadiness({ today: values.today });
  const next =
    report.items.find(
      (item) =>
        !item.published && item.folder && (!report.next || item.number === report.next.number),
    ) ?? report.items.find((item) => !item.published && item.folder);

  if (!next) {
    console.log('Nenhum post pendente no calendário.');
    process.exitCode = 0;
  } else {
    console.log(
      `[prepare] próximo post: ${next.number} ${next.title} (${next.date ?? 'sem data'})`,
    );
    console.log(`[prepare] pasta: posts/${next.folder}`);
    const render = spawnSync(
      process.execPath,
      [join(here, 'render-carousels.mjs'), '--post', next.folder],
      { stdio: 'inherit' },
    );
    if (render.status !== 0) {
      throw new Error(`render-carousels falhou para ${next.folder}`);
    }

    const after = await buildReadiness({ today: values.today });
    console.log(`\n${renderPauta(after)}`);
    const afterItem = after.items.find((item) => item.number === next.number);
    if (afterItem && afterItem.issues.length > 0) {
      console.log('\n[prepare] ainda há pendências antes de publicar:');
      for (const issue of afterItem.issues) console.log(`  - ${issue}`);
      process.exitCode = 2;
    } else {
      console.log(`\n[prepare] pronto. Revise o PDF e rode:`);
      console.log(`  node docs/social/linkedin/publish.mjs --post ${next.folder} --dry-run`);
      console.log(`  node docs/social/linkedin/publish.mjs --post ${next.folder} --publish`);
    }
  }
} catch (error) {
  console.error(`[prepare] Falhou: ${error.message}`);
  process.exitCode = 1;
}
