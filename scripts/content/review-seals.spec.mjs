import assert from 'node:assert/strict';
import test from 'node:test';

import { auditReviewSeals } from './review-seals.mjs';

const translation = (review) => ({
  entityId: 'country-brazil',
  locale: 'en',
  review,
});

test('an approved assistant translation needs a reviewer, a date, a reference and an AI marker', () => {
  assert.deepEqual(
    auditReviewSeals({
      translations: [
        translation({
          status: 'approved',
          method: 'assistant',
          reviewer: 'Codex (IA)',
          reviewedAt: '2026-11-01',
          reference: 'ATLAS-TR-01',
          note: 'Revisão linguística assistida por IA. Sem revisão humana registrada.',
        }),
      ],
    }),
    [],
  );
  assert.equal(
    auditReviewSeals({
      translations: [
        translation({
          status: 'approved',
          method: 'assistant',
          reviewer: 'Codex (IA)',
          reviewedAt: '2026-11-01',
          reference: 'ATLAS-TR-01',
          note: 'Texto conferido.',
        }),
      ],
    }).length,
    1,
  );
});

test('a human review cannot be attributed to an assistant and a concluded review needs a record', () => {
  assert.match(
    auditReviewSeals({
      translations: [
        translation({
          status: 'approved',
          method: 'human',
          reviewer: 'Codex (IA)',
          reviewedAt: '2026-11-01',
          reference: 'ATLAS-TR-01',
          note: 'Revisão humana.',
        }),
      ],
    })[0],
    /revisor é de IA/,
  );
  assert.match(
    auditReviewSeals({
      graph: {
        atlases: [
          {
            id: 'atlas-test',
            reviews: [{ id: 'review-1', status: 'verified', reviewer: null, reviewedAt: null }],
          },
        ],
      },
    })[0],
    /sem revisor ou data/,
  );
  assert.match(
    auditReviewSeals({
      readings: [{ slug: 'marxismo', review: { status: 'revisado', reviewer: null } }],
    })[0],
    /revisada sem revisor/,
  );
});

test('draft and pending reviews do not need a seal', () => {
  assert.deepEqual(
    auditReviewSeals({
      graph: {
        atlases: [
          {
            id: 'atlas-test',
            reviews: [{ id: 'review-1', status: 'pending', reviewer: null, reviewedAt: null }],
          },
        ],
      },
      readings: [{ slug: 'marxismo', review: { status: 'rascunho', reviewer: null } }],
    }),
    [],
  );
});
