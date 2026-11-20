import assert from 'node:assert/strict';
import test from 'node:test';

import { initialFiles } from './perf.mjs';

test('initialFiles lista scripts, estilos e modulepreloads do index', () => {
  const html =
    '<link rel="stylesheet" href="styles-ABC.css"><link rel="modulepreload" href="chunk-1.js">' +
    '<script src="main-XYZ.js" type="module"></script><a href="/acervo/">x</a>';
  assert.deepEqual(initialFiles(html).sort(), ['chunk-1.js', 'main-XYZ.js', 'styles-ABC.css']);
});
