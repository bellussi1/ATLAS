import assert from 'node:assert/strict';
import test from 'node:test';

import { imageCoverage } from './image-coverage.mjs';

test('conta entidades com imagem licenciada e lista as que ficam só com o ícone', () => {
  const [row] = imageCoverage([
    {
      id: 'atlas-x',
      entities: [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
      ],
      assetLicenses: [{ entityId: 'a' }, { entityId: 'a' }],
    },
  ]);
  assert.deepEqual(row, { id: 'atlas-x', total: 2, withImage: 1, without: ['B'] });
});
