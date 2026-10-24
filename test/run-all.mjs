/* Unified Test Runner for Arrow Escape:
   Executes:
     1. smoke.mjs       (original generator validation)
     2. engine.test.mjs  (comprehensive game engine validation)
     3. persistence.test.mjs (state storage, bit packing & migrations)
     4. viewport.test.mjs    (mobile responsive sizing & coordinates)
*/

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const suites = [
  'smoke.mjs',
  'engine.test.mjs',
  'persistence.test.mjs',
  'viewport.test.mjs',
  'phase2.test.mjs'
];

async function runSuite(file) {
  console.log(`\n========================================`);
  console.log(`RUNNING: test/${file}`);
  console.log(`========================================`);

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, file)], {
      stdio: 'inherit'
    });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`Test suite ${file} failed with exit code ${code}`));
    });
  });
}

async function main() {
  const start = Date.now();
  for (const suite of suites) {
    await runSuite(suite);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`\n========================================`);
  console.log(`ALL TEST SUITES PASSED in ${elapsed}s!`);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error(`\nTest suite execution failed:`, err.message);
  process.exit(1);
});
