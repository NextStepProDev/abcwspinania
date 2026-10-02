/**
 * Most między aliasem `@/` z tsconfig.json a `node --test`.
 *
 * Testy odpalamy gołym Node-em (od 24 sam usuwa adnotacje typów z plików .ts),
 * więc nie ma tu bundlera, który rozwiązywałby `@/lib/...`. Ten hook robi jedno:
 * zamienia `@/x` na ścieżkę do `src/x` i dokleja `.ts`, gdy import jest bez
 * rozszerzenia. Dzięki temu testy importują dokładnie te same moduły, które widzi
 * aplikacja — bez lustrzanych kopii ścieżek i bez nowej zależności w package.json.
 *
 * Rejestrowany przez `npm test` (patrz package.json).
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
