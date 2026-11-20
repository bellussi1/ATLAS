import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compactIndex,
  extensionFor,
  imageSize,
  mirrorEntry,
  selectCandidates,
  sniffImage,
} from './media-mirror.mjs';

const thumb = (name) =>
  `https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/${name}/960px-${name}`;
const license = (name, overrides = {}) => ({
  id: `asset-${name}`,
  assetPath: thumb(name),
  creator: 'Autora',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
  status: 'known',
  reproduction: 'allowed',
  sourceUrl: `https://upload.wikimedia.org/${name}`,
  filePageUrl: `https://commons.wikimedia.org/wiki/File:${name}`,
  ...overrides,
});

test('so espelha licenças reproduzíveis e sem derivados', () => {
  const atlas = {
    assetLicenses: [
      license('livre.jpg'),
      license('desconhecida.jpg', {
        status: 'unknown',
        reproduction: 'blocked',
        license: null,
        licenseUrl: null,
      }),
      license('nd.jpg', {
        license: 'CC BY-ND 4.0',
        licenseUrl: 'https://creativecommons.org/licenses/by-nd/4.0',
      }),
      license('livre.jpg'),
      { ...license('local.jpg'), assetPath: '/images/local.jpg' },
    ],
  };
  const { candidates, skipped } = selectCandidates([atlas]);
  assert.deepEqual(
    candidates.map((item) => item.id),
    ['asset-livre.jpg'],
  );
  assert.equal(skipped.length, 2);
});

test('sniffImage e imageSize leem os bytes', () => {
  const png = Buffer.concat([
    Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
    Buffer.from([0, 0, 1, 0xc0, 0, 0, 0, 0x64]),
  ]);
  assert.equal(sniffImage(png), 'image/png');
  assert.deepEqual(imageSize(png, 'image/png'), { width: 448, height: 100 });
  assert.equal(sniffImage(Buffer.from('<html>erro</html>')), null);
  assert.equal(
    sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    'image/svg+xml',
  );
  assert.equal(extensionFor('image/jpeg; charset=x'), 'jpg');
});

test('o registro guarda hash, origem, criador e licença', () => {
  const bytes = Buffer.from('89504e470d0a1a0a0000000d49484452000001c000000064', 'hex');
  const entry = mirrorEntry({
    license: license('livre.jpg'),
    bytes,
    contentType: 'image/png',
    mirroredAt: '2026-11-20',
  });
  assert.match(entry.key, /^m\/[a-f0-9]{64}\.png$/);
  assert.equal(entry.creator, 'Autora');
  assert.equal(entry.sourceUrl, 'https://upload.wikimedia.org/livre.jpg');
  assert.equal(entry.width, 448);
});

test('o índice compacto mapeia o endereço ao objeto e é estável', () => {
  const entries = [
    { path: thumb('a.jpg'), key: `m/${'a'.repeat(64)}.jpg` },
    { path: thumb('b.jpg'), key: `m/${'b'.repeat(64)}.png` },
  ];
  const first = compactIndex(entries);
  assert.equal(first, compactIndex([...entries].reverse()));
  assert.equal(Object.keys(JSON.parse(first).entries).length, 2);
});
