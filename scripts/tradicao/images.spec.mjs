import assert from 'node:assert/strict';
import test from 'node:test';

import { collectImages, imageFiles, pageImageFile, pageImageUrl } from './images.mjs';

test('prefere a bandeira atual (rank preferred) às bandeiras históricas do Wikidata', () => {
  const entity = {
    claims: {
      P41: [
        {
          rank: 'normal',
          mainsnak: { datavalue: { value: 'Merchant flag of Germany (1946–1949).svg' } },
        },
        { rank: 'preferred', mainsnak: { datavalue: { value: 'Flag of Germany.svg' } } },
        {
          rank: 'deprecated',
          mainsnak: { datavalue: { value: 'Flag of Germany (1867–1918).svg' } },
        },
      ],
    },
  };
  assert.deepEqual(imageFiles(entity, 'pais'), [
    'Flag of Germany.svg',
    'Merchant flag of Germany (1946–1949).svg',
  ]);
});

test('a imagem de abertura do artigo vira nome de arquivo do Commons', () => {
  assert.equal(
    pageImageFile({ query: { pages: [{ pageimage: 'Flag_of_Spain_(1945–1977).svg' }] } }),
    'Flag of Spain (1945–1977).svg',
  );
  assert.equal(pageImageFile({ query: { pages: [{ title: 'X' }] } }), null);
  const url = new URL(pageImageUrl('pt', 'Falangismo'));
  assert.equal(url.hostname, 'pt.wikipedia.org');
  assert.equal(url.searchParams.get('prop'), 'pageimages');
});

test('sem imagem no Wikidata, usa a de abertura do artigo, com a mesma checagem de licença', async () => {
  const calls = [];
  const http = {
    json: async (url) => {
      calls.push(url);
      const target = new URL(url);
      if (target.hostname === 'www.wikidata.org') return { entities: { Q1: { claims: {} } } };
      if (target.hostname === 'pt.wikipedia.org')
        return { query: { pages: [{ pageimage: 'Bandeira.svg' }] } };
      return {
        query: {
          pages: {
            1: {
              imageinfo: [
                {
                  url: 'https://upload.wikimedia.org/x/Bandeira.svg',
                  thumburl: 'https://upload.wikimedia.org/thumb/x/640px-Bandeira.svg.png',
                  extmetadata: {
                    LicenseShortName: { value: 'CC0' },
                    LicenseUrl: { value: 'https://creativecommons.org/publicdomain/zero/1.0/' },
                    Artist: { value: 'Fulano' },
                    UsageTerms: { value: 'Creative Commons CC0' },
                  },
                },
              ],
            },
          },
        },
      };
    },
  };
  const result = await collectImages(
    [{ id: 'topic-x', type: 'ideologia', qid: 'Q1', lang: 'pt', title: 'X' }],
    { http, retrievedAt: '2026-11-05' },
  );
  assert.equal(
    calls.some((url) => url.includes('pageimages')),
    true,
  );
  assert.equal(result['topic-x'].status, 'licensed');
  assert.equal(result['topic-x'].asset.fileTitle, 'Bandeira.svg');
});
