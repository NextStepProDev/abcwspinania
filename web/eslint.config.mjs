import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Generowane przez Payloada, nie pisane ręcznie. Sygnatury migracji
    // przyjmują argumenty, z których korzysta tylko część z nich — lint
    // zgłaszał to przy każdej nowej migracji jako nieużywane zmienne.
    'src/migrations/**',
    'src/payload-types.ts',
  ]),
])

export default eslintConfig
