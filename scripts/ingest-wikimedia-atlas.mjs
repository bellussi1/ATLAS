import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { configurations } from './ingestion/wikimedia/configurations.mjs';
import { runIngestion } from './ingestion/wikimedia/pipeline.mjs';

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      capture: { type: 'string' },
      offline: { type: 'string' },
      output: { type: 'string' },
      input: { type: 'string' },
      media: { type: 'string' },
    },
  });
  const collectionKey = positionals[0] ?? 'liberalism';
  const config = configurations[collectionKey];
  if (!config || positionals.length > 1) throw Error(`Coleção inválida: ${collectionKey}`);
  if (Boolean(values.capture) === Boolean(values.offline))
    throw Error(
      'Use --capture <diretório novo> OU --offline <diretório capturado>. Rede nunca é implícita.',
    );
  if (values.media && !['preserve', 'refresh', 'remote'].includes(values.media))
    throw Error('Use --media preserve, refresh ou remote.');
  if (values.offline && (values.input || values.media))
    throw Error('No modo offline, entrada e política de mídia vêm exclusivamente do manifest.');
  const result = await runIngestion({
    collectionKey,
    config: values.offline ? undefined : config,
    mode: values.offline ? 'offline' : 'capture',
    archiveDir: resolve(values.offline ?? values.capture),
    ...(values.input ? { baselinePath: resolve(values.input) } : {}),
    ...(values.output ? { outputPath: resolve(values.output) } : {}),
    ...(values.media ? { mediaMode: values.media } : {}),
    onProgress: console.log,
  });
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
