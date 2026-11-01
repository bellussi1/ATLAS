import { main } from './ingest-wikimedia-atlas.mjs';

main(['liberalism', ...process.argv.slice(2)]).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
