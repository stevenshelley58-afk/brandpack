/**
 * Test /api/review route
 * Uses Noop adapter (no API keys needed)
 */

const BASE_URL = 'http://localhost:3000';

console.log('🧪 Testing /api/review route...\n');

// Step 1: Get a kernel by scraping
console.log('Step 1: Scraping to get kernel...');
const scrapeRes = await fetch(`${BASE_URL}/api/scrape`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ domain: 'stripe.com' }),
});

const scrapeData = await scrapeRes.json();
if (!scrapeRes.ok) {
  console.error('❌ Scrape failed:', scrapeData);
  process.exit(1);
}

console.log('✅ Kernel ready');
console.log('   - Size:', JSON.stringify(scrapeData.kernel).length, 'bytes\n');

// Step 2: Generate review
console.log('Step 2: Generating review from kernel...');
const reviewRes = await fetch(`${BASE_URL}/api/review`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ kernel: scrapeData.kernel }),
});

const reviewData = await reviewRes.json();

if (!reviewRes.ok || !reviewData.success) {
  console.error('❌ Review failed!');
  console.error('Status:', reviewRes.status);
  console.error('Response:', JSON.stringify(reviewData, null, 2));
  process.exit(1);
}

console.log('✅ Review generated!');
console.log('\nReview summary:');
console.log('   - Tone:', reviewData.review?.tone);
console.log('   - Voice:', reviewData.review?.voice);
console.log('   - Proof points:', reviewData.review?.proof_points);
console.log('   - Target audience:', reviewData.review?.target_audience);
console.log('\nValidation:', reviewData.validation?.passed ? '✅ Passed' : '❌ Failed');
console.log('Provider:', reviewData.audit?.provider);
console.log('Model:', reviewData.audit?.model);
console.log('Duration:', reviewData.audit?.duration_ms, 'ms');
console.log('Cost: $' + (reviewData.audit?.cost_usd || 0).toFixed(4));

console.log('\n🎉 /api/review route working!\n');

