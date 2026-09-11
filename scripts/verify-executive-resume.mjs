/**
 * Master Verification Suite: CareerBot AI Executive Resume Engine
 * Verifies parity with job-application-agent (cv-tailor.mjs)
 */
import { spawnSync } from 'child_process';

const suites = [
  { name: 'Milestone 1 Unit Tests', cmd: 'node', args: ['scripts/test-m1.mjs'] },
  { name: 'Milestone 1 Adversarial & Stress Tests', cmd: 'node', args: ['scripts/stress-m1-adversarial.mjs'] },
  { name: 'Milestone 1 Visual Parity Harness', cmd: 'node', args: ['scripts/verify-m1-parity.mjs'] },
  { name: 'Milestone 2 Export API Tests', cmd: 'node', args: ['scripts/test-m2-export.mjs'] },
  { name: 'Milestone 3 In-App Preview Tests', cmd: 'node', args: ['scripts/test-m3-preview.mjs'] },
  { name: 'Milestone 4 Multi-Industry Skill & CV Quality Tests', cmd: 'node', args: ['scripts/test-skill-and-cv-quality.mjs'] },
];

console.log('================================================================');
console.log('   EXECUTIVE RESUME ENGINE: FULL VERIFICATION SUITE');
console.log('================================================================\n');

let totalPassed = 0;
let totalFailed = 0;

for (const suite of suites) {
  console.log(`[RUN] ${suite.name}`);
  const res = spawnSync(suite.cmd, suite.args, { stdio: 'inherit', shell: true });
  if (res.status === 0) {
    console.log(`[PASS] ${suite.name}\n`);
    totalPassed++;
  } else {
    console.error(`[FAIL] ${suite.name} with code ${res.status}\n`);
    totalFailed++;
  }
}

console.log('================================================================');
console.log(`SUMMARY: ${totalPassed} suites passed, ${totalFailed} suites failed.`);
console.log('================================================================');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('\nALL EXECUTIVE RESUME TEST SUITES PASSED!\n');
}
