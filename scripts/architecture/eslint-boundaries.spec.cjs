const assert = require('node:assert/strict');
const path = require('node:path');
const { test } = require('node:test');
const { Linter } = require('eslint');
const architecture = require('./eslint-boundaries.cjs');

function lint(file, code) {
  return new Linter().verify(
    code,
    [
      {
        files: ['**/*.ts'],
        plugins: { architecture },
        rules: { 'architecture/boundaries': 'error' },
      },
    ],
    { filename: path.resolve('src/app', file) },
  );
}

test('blocks alias and relative imports from core/shared to a feature', () => {
  for (const file of ['core/example.ts', 'shared/example.ts']) {
    for (const specifier of [
      '@ideologies/models/ideology-page.schema',
      '../features/ideologies/models/ideology-page.schema',
    ]) {
      const messages = lint(file, `import '${specifier}';`);
      assert.equal(messages.length, 1);
      assert.equal(messages[0].messageId, 'boundary');
    }
  }
});

test('checks lazy imports and prohibits imports between features', () => {
  const messages = lint(
    'features/study/example.ts',
    "const component = import('@ideologies/components/ideology-block/ideology-block.component');",
  );
  assert.equal(messages.length, 1);
  assert.equal(messages[0].messageId, 'boundary');
});

test('allows feature to core and central route composition', () => {
  assert.deepEqual(
    lint('features/study/example.ts', "import '@core/content/models/study-schema';"),
    [],
  );
  assert.deepEqual(lint('app.routes.ts', "import '@ideologies/routes/ideologies.routes';"), []);
});

test('keeps models and services independent of presentation', () => {
  for (const file of [
    'features/ideologies/models/example.ts',
    'features/ideologies/services/example.ts',
  ]) {
    const messages = lint(
      file,
      "import '@ideologies/components/ideology-block/ideology-block.component';",
    );
    assert.equal(messages.length, 1);
    assert.equal(messages[0].messageId, 'boundary');
  }
});

test('detects a circular dependency', () => {
  const messages = lint('core/content/models/content-schema.ts', "import './content-schema';");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].messageId, 'cycle');
  const indirect = lint(
    'core/content/models/content-schema.ts',
    "import '@core/content/repositories/content-repository.service';",
  );
  assert.equal(indirect.length, 1);
  assert.equal(indirect[0].messageId, 'cycle');
});
