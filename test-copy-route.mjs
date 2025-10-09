/**
 * Test /api/copy route
 * Uses Noop adapter (no API keys needed)
 */

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Testing /api/copy route...\n');

// Step 1: Get kernel
console.log('Step 1: Getting kernel...');
const scrapeRes = await fetch(`${BASE_URL}/api/scrape`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ domain: 'stripe.com' }),
});

const scrapeData = await scrapeRes.json();
if (!scrapeRes.ok) {
  console.error('❌ Scrape failed');
  process.exit(1);
}
console.log('✅ Kernel ready\n');

// Step 2: Get ideas
console.log('Step 2: Getting ideas...');
const ideasRes = await fetch(`${BASE_URL}/api/ideas`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kernel: scrapeData.kernel }),
});

const ideasData = await ideasRes.json();
if (!ideasRes.ok || !ideasData.success) {
  console.error('❌ Ideas failed');
  console.error(ideasData);
  process.exit(1);
}
console.log('✅ Ideas generated\n');

// Step 3: Generate copy for first idea
console.log('Step 3: Generating copy for first idea...');
const idea = ideasData.ideas?.[0] || ideasData.outputs?.[0];
if (!idea) {
  console.error('❌ No ideas returned');
  process.exit(1);
}

const copyRes = await fetch(`${BASE_URL}/api/copy`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    kernel: scrapeData.kernel,
    idea: idea
  }),
});

const copyData = await copyRes.json();

if (!copyRes.ok || !copyData.success) {
  console.error('❌ Copy failed!');
  console.error('Status:', copyRes.status);
  console.error('Response:', JSON.stringify(copyData, null, 2));
  process.exit(1);
}

console.log('✅ Copy generated!');
console.log('\nCopy blocks:');
console.log('   - hook:', copyData.copy?.hook?.content || 'N/A');
console.log('   - context:', copyData.copy?.context?.content || 'N/A');
console.log('   - proof:', copyData.copy?.proof?.content || 'N/A');
console.log('   - objection:', copyData.copy?.objection?.content || 'N/A');
console.log('   - cta:', copyData.copy?.cta?.content || 'N/A');
console.log('\nValidation:', copyData.validation?.passed ? '✅ Passed' : '❌ Failed');
if (!copyData.validation?.passed) {
  console.log('Errors:', copyData.validation?.errors);
}
console.log('Provider:', copyData.audit?.provider);
console.log('Duration:', copyData.audit?.duration_ms, 'ms');

console.log('\n🎉 /api/copy route working!\n');

