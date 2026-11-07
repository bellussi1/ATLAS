import assert from 'node:assert/strict';
import test from 'node:test';

import { hostnameOf, isCommonsHost, isWikidataHost } from './hosts.mjs';

test('host checks read the parsed hostname, never a substring of the URL', () => {
  assert.equal(hostnameOf('https://www.wikidata.org/w/api.php'), 'www.wikidata.org');
  assert.equal(hostnameOf('not a url'), '');

  assert.equal(isWikidataHost('https://www.wikidata.org/w/api.php'), true);
  assert.equal(isWikidataHost('https://wikidata.org/'), true);
  assert.equal(isWikidataHost('https://evil.example/?next=https://www.wikidata.org'), false);
  assert.equal(isWikidataHost('https://www.wikidata.org.evil.example/'), false);
  assert.equal(isWikidataHost('https://notwikidata.org/'), false);
  assert.equal(isWikidataHost('/wiki/Q1'), false);

  assert.equal(isCommonsHost('https://commons.wikimedia.org/w/api.php'), true);
  assert.equal(isCommonsHost('https://commons.wikimedia.org.evil.example/'), false);
  assert.equal(isCommonsHost('https://evil.example/commons.wikimedia.org'), false);
  assert.equal(isCommonsHost('https://upload.wikimedia.org/test.png'), false);
});
