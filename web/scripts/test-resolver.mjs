/**
 * A bridge between the `@/` alias from tsconfig.json and `node --test`.
 *
 * Tests run on bare Node (since 24 it strips type annotations from .ts files
 * itself), so there is no bundler to resolve `@/lib/...`. This hook does one
 * thing: it turns `@/x` into a path to `src/x` and appends `.ts` when the
 * import has no extension. Tests thus import exactly the modules the app
 * sees — no mirrored path copies and no new dependency in package.json.
 *
 * Registered by `npm test` (see package.json).
 *
 * Relative imports without an extension (`../lib/topics`) from a `.ts` file
 * get `.ts` too: collections are written that way, and the access test loads
 * every collection to check its rules.
 */
import { register } from 'node:module'
import { pathToFileURL } from 'node:url'

const SRC = pathToFileURL(new URL('../src/', import.meta.url).pathname).href

register(
  `data:text/javascript,
   const SRC = ${JSON.stringify(SRC)};
   export async function resolve(specifier, context, nextResolve) {
     if (specifier.startsWith("@/")) {
       const path = SRC + specifier.slice(2);
       const withExt = /\\.[a-z]+$/.test(path) ? path : path + ".ts";
       return nextResolve(withExt, context);
     }
     if (/^\\.\\.?\\//.test(specifier) && !/\\.[a-z]+$/.test(specifier) && context.parentURL?.endsWith(".ts")) {
       return nextResolve(specifier + ".ts", context);
     }
     return nextResolve(specifier, context);
   }`,
  import.meta.url,
)
