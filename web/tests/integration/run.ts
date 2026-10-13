/**
 * `npm run test:integration` — every suite against a real database and a
 * running server (`TEST_BASE_URL`, default http://localhost:3000). See
 * `harness.ts` for why this is not `node:test` and why no email leaves.
 */
import './access.int'
import './accounts.int'
import './bookings.int'
import './broadcasts.int'
import { run } from './harness'

await run()
