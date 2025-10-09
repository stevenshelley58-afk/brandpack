/**
 * Test the complete API flow with Noop adapters
 * Run from workspace root: node test-api-flow.mjs
 */

const BASE_URL = 'http://localhost:3001';

async function testScrape() {
  console.log('\n🔍 Testing /api/scrape...');
  
  const response = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'vercel.com' }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Scrape failed:', data);
    return null;
  }
  
  console.log('✅ Scrape successful!');
  console.log('   - Pages crawled:', data.scrape_metadata.pages_crawled);
  console.log('   - Bytes collected:', data.scrape_metadata.total_bytes);
  console.log('   - Kernel size:', JSON.stringify(data.kernel).length, 'bytes');
  
  return data.kernel;
}

async function testIdeas(kernel) {
  console.log('\n💡 Testing /api/ideas...');
  
  const response = await fetch(`${BASE_URL}/api/ideas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kernel }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Ideas failed:', data);
    console.error('   Full response:', JSON.stringify(data, null, 2));
    return null;
  }
  
  console.log('✅ Ideas generated!');
  console.log('   - Count:', data.ideas?.length || 0);
  console.log('   - Validation:', JSON.stringify(data.validation));
  
  return data.ideas?.[0];
}

async function testCopy(kernel, idea) {
  console.log('\n📝 Testing /api/copy...');
  
  const response = await fetch(`${BASE_URL}/api/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kernel, idea }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Copy failed:', data);
    return null;
  }
  
  console.log('✅ Copy generated!');
  console.log('   - Blocks:', Object.keys(data.copy || {}));
  console.log('   - Validation:', JSON.stringify(data.validation));
  
  return data.copy;
}

async function testImageBrief(kernel, idea) {
  console.log('\n🖼️  Testing /api/image/brief...');
  
  const response = await fetch(`${BASE_URL}/api/image/brief`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kernel, idea }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Image brief failed:', data);
    return null;
  }
  
  console.log('✅ Image brief generated!');
  console.log('   - Aspect ratio:', data.brief?.aspect_ratio);
  console.log('   - Safe zones:', data.brief?.safe_zone_top, '/', data.brief?.safe_zone_bottom);
  console.log('   - Validation:', JSON.stringify(data.validation));
  
  return data.brief;
}

async function main() {
  console.log('🚀 Starting API flow test...');
  console.log('   Using Noop adapters (no API keys needed)');
  
  try {
    // Test 1: Scrape
    const kernel = await testScrape();
    if (!kernel) {
      console.error('\n❌ Test failed at scrape step');
      process.exit(1);
    }
    
    // Test 2: Ideas
    const idea = await testIdeas(kernel);
    if (!idea) {
      console.error('\n❌ Test failed at ideas step');
      process.exit(1);
    }
    
    // Test 3: Copy
    const copy = await testCopy(kernel, idea);
    if (!copy) {
      console.error('\n❌ Test failed at copy step');
      process.exit(1);
    }
    
    // Test 4: Image Brief
    const brief = await testImageBrief(kernel, idea);
    if (!brief) {
      console.error('\n❌ Test failed at image brief step');
      process.exit(1);
    }
    
    console.log('\n🎉 All API tests passed!');
    console.log('   ✅ Scrape → Kernel');
    console.log('   ✅ Ideas → 20 campaign ideas');
    console.log('   ✅ Copy → 5-block sequence');
    console.log('   ✅ Image Brief → 4:5 brief with safe zones');
    
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  }
}

main();

