import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

const sourceRoot = new URL('../../src/', import.meta.url);
// Node-only bridge for the project's pure TS modules; no Angular/compiler dependency.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const aliases = { '@core/': 'app/core/', '@ideologies/': 'app/features/ideologies/' };
    for (const [alias, target] of Object.entries(aliases)) {
      if (specifier.startsWith(alias))
        return nextResolve(
          new URL(`${target}${specifier.slice(alias.length)}.ts`, sourceRoot).href,
          context,
        );
    }
    if (
      context.parentURL?.startsWith(sourceRoot.href) &&
      specifier.startsWith('.') &&
      !/\.[a-z]+$/i.test(specifier)
    ) {
      const path = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(fileURLToPath(path))) return nextResolve(path.href, context);
    }
    return nextResolve(specifier, context);
  },
});
