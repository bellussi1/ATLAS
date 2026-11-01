const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const appRoot = path.resolve(__dirname, '../../src/app');
const aliases = {
  '@testing/': '../testing/',
  '@core/': 'core/',
  '@shared/': 'shared/',
  '@ideologies/': 'features/ideologies/',
  '@exploration/': 'features/exploration/',
  '@study/': 'features/study/',
  '@layouts/': 'layouts/',
  '@pages/': 'pages/',
  '@app/': '',
};

function resolveImport(filename, specifier) {
  let target;
  if (specifier.startsWith('.')) target = path.resolve(path.dirname(filename), specifier);
  else {
    const prefix = Object.keys(aliases).find((key) => specifier.startsWith(key));
    if (!prefix) return undefined;
    target = path.resolve(appRoot, aliases[prefix] + specifier.slice(prefix.length));
  }
  return [target, target + '.ts', path.join(target, 'index.ts')].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}

function layer(filename) {
  return path.relative(appRoot, filename).replaceAll('\\', '/');
}

function violation(from, to) {
  const source = layer(from);
  const target = layer(to);
  if (target.startsWith('../testing/') && !source.endsWith('.spec.ts'))
    return 'Fixtures de teste não podem entrar no código de produção.';
  const feature = source.match(/^features\/([^/]+)\//)?.[1];
  const targetFeature = target.match(/^features\/([^/]+)\//)?.[1];
  if (/^(core|shared)\//.test(source) && /^(features|pages|layouts)\//.test(target))
    return 'Core e shared não podem depender de features, páginas ou layouts.';
  if (source.startsWith('core/') && target.startsWith('shared/'))
    return 'Core não pode depender de apresentação compartilhada.';
  if (feature && targetFeature && feature !== targetFeature)
    return 'Features não importam implementações de outras features. Promova um contrato compartilhado deliberadamente.';
  if (feature && /^(pages|layouts)\//.test(target))
    return 'Features não podem depender de páginas globais ou layouts.';
  if (
    !source.endsWith('.spec.ts') &&
    source.includes('/models/') &&
    (target.includes('/components/') || target.includes('/ui/') || target.includes('/pages/'))
  )
    return 'Modelos não podem depender de componentes de apresentação.';
  if (
    !source.endsWith('.spec.ts') &&
    /\/(services|repositories)\//.test(source) &&
    (target.includes('/components/') || target.includes('/ui/') || target.includes('/pages/'))
  )
    return 'Serviços de conteúdo não podem depender de apresentação.';
  return undefined;
}

// Build the graph once per lint process; lazy imports count as dependencies too.
const graph = new Map();
function dependencies(filename) {
  if (graph.has(filename)) return graph.get(filename);
  const targets = [];
  graph.set(filename, targets);
  if (!filename.endsWith('.ts')) return targets;
  const source = ts.createSourceFile(
    filename,
    fs.readFileSync(filename, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    const module =
      ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
        ? node.moduleSpecifier
        : ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword
          ? node.arguments[0]
          : undefined;
    if (module && ts.isStringLiteralLike(module)) {
      const target = resolveImport(filename, module.text);
      if (target) targets.push(target);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return targets;
}

function reaches(start, goal, visited = new Set()) {
  if (start === goal) return true;
  if (visited.has(start)) return false;
  visited.add(start);
  return dependencies(start).some((target) => reaches(target, goal, visited));
}

module.exports = {
  resolveImport,
  violation,
  rules: {
    boundaries: {
      meta: {
        type: 'problem',
        schema: [],
        messages: {
          boundary: '{{reason}}',
          cycle: 'Dependência circular entre {{from}} e {{to}}.',
        },
      },
      create(context) {
        const filename = path.resolve(context.filename);
        function check(node) {
          if (typeof node.source?.value !== 'string') return;
          const target = resolveImport(filename, node.source.value);
          if (!target) return;
          const reason = violation(filename, target);
          if (reason) context.report({ node, messageId: 'boundary', data: { reason } });
          if (reaches(target, filename))
            context.report({
              node,
              messageId: 'cycle',
              data: { from: layer(filename), to: layer(target) },
            });
        }
        return {
          ImportDeclaration: check,
          ExportNamedDeclaration: check,
          ExportAllDeclaration: check,
          ImportExpression: check,
        };
      },
    },
  },
};
