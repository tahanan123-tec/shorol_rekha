/**
 * Concurrency Load Test for Stock Service
 * 
 * This test simulates heavy concurrent load to verify:
 * 1. Optimistic locking prevents overselling
 * 2. System handles high concurrency gracefully
 * 3. No race conditions in stock reservation
 */

const axios = require('axios');

const BASE_URL = process.env.STOCK_SERVICE_URL || 'http://localhost:3003';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-key';

// Test configuration
const CONCURRENT_REQUESTS = 100;
const ITEM_ID = 'item-001';
const INITIAL_STOCK = 100;
const QUANTITY_PER_REQUEST = 1;

/**
 * Reserve stock for an order
 */
async function reserveStock(orderId, itemId, quantity) {
  try {
    const response = await axios.post(
      `${BASE_URL}/internal/stock/reserve`,
      {
        order_id: orderId,
        items: [{ id: itemId, quantity }],
      },
      {
        headers: {
          'X-Internal-API-Key': INTERNAL_API_KEY,
        },
        timeout: 10000,
      }
    );
    return { success: true, orderId, data: response.data };
  } catch (error) {
    return {
      success: false,
      orderId,
      error: error.response?.data?.error || error.message,
      status: error.response?.status,
    };
  }
}

/**
 * Get current stock level
 */
async function getStock(itemId) {
  try {
    const response = await axios.get(`${BASE_URL}/stock/${itemId}`);
    return response.data.data;
  } catch (error) {
    console.error('Failed to get stock:', error.message);
    return null;
  }
}

/**
 * Run concurrency test
 */
async function runConcurrencyTest() {
  console.log('\n=== Stock Service Concurrency Load Test ===\n');
  console.log(`Configuration:`);
  console.log(`- Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`- Item ID: ${ITEM_ID}`);
  console.log(`- Quantity per Request: ${QUANTITY_PER_REQUEST}`);
  console.log(`- Expected Total Reserved: ${CONCURRENT_REQUESTS * QUANTITY_PER_REQUEST}`);
  console.log('');

  // Get initial stock
  console.log('Fetching initial stock level...');
  const initialStock = await getStock(ITEM_ID);
  
  if (!initialStock) {
    console.error('Failed to fetch initial stock. Is the service running?');
    process.exit(1);
  }

  console.log(`Initial Stock: ${initialStock.quantity}`);
  console.log(`Initial Available: ${initialStock.available_quantity}`);
  console.log(`Initial Reserved: ${initialStock.reserved_quantity}`);
  console.log('');

  // Create concurrent reservation requests
  console.log(`Launching ${CONCURRENT_REQUESTS} concurrent reservation requests...`);
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    const orderId = `load-test-order-${Date.now()}-${i}`;
    promises.push(reserveStock(orderId, ITEM_ID, QUANTITY_PER_REQUEST));
  }

  // Wait for all requests to complete
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;

  // Analyze results
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const insufficientStock = failed.filter(r => r.error?.includes('Insufficient stock'));
  const concurrencyErrors = failed.filter(r => r.error?.includes('concurrency'));
  const otherErrors = failed.filter(r => 
    !r.error?.includes('Insufficient stock') && 
    !r.error?.includes('concurrency')
  );

  console.log('\n=== Test Results ===\n');
  console.log(`Duration: ${duration}ms`);
  console.log(`Requests per second: ${(CONCURRENT_REQUESTS / (duration / 1000)).toFixed(2)}`);
  console.log('');
  console.log(`Total Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`   - Insufficient Stock: ${insufficientStock.length}`);
  console.log(`   - Concurrency Errors: ${concurrencyErrors.length}`);
  console.log(`   - Other Errors: ${otherErrors.length}`);
  console.log('');

  // Get final stock
  console.log('Fetching final stock level...');
  const finalStock = await getStock(ITEM_ID);

  if (finalStock) {
    console.log(`Final Stock: ${finalStock.quantity}`);
    console.log(`Final Available: ${finalStock.available_quantity}`);
    console.log(`Final Reserved: ${finalStock.reserved_quantity}`);
    console.log('');

    // Calculate expected vs actual
    const expectedReserved = initialStock.reserved_quantity + (successful.length * QUANTITY_PER_REQUEST);
    const actualReserved = finalStock.reserved_quantity;
    const reservedDifference = actualReserved - initialStock.reserved_quantity;

    console.log('=== Verification ===\n');
    console.log(`Expected Reserved Increase: ${successful.length * QUANTITY_PER_REQUEST}`);
    console.log(`Actual Reserved Increase: ${reservedDifference}`);
    console.log(`Match: ${reservedDifference === successful.length * QUANTITY_PER_REQUEST ? '✅ YES' : '❌ NO'}`);
    console.log('');

    // Check for overselling
    const oversold = actualReserved > initialStock.quantity;
    console.log(`Overselling Check: ${oversold ? '❌ OVERSOLD!' : '✅ No overselling'}`);
    console.log('');

    // Performance metrics
    console.log('=== Performance Metrics ===\n');
    console.log(`Average Response Time: ${(duration / CONCURRENT_REQUESTS).toFixed(2)}ms`);
    console.log(`Success Rate: ${((successful.length / CONCURRENT_REQUESTS) * 100).toFixed(2)}%`);
    console.log('');

    // Test verdict
    const testPassed = 
      reservedDifference === successful.length * QUANTITY_PER_REQUEST &&
      !oversold &&
      concurrencyErrors.length === 0;

    console.log('=== Test Verdict ===\n');
    if (testPassed) {
      console.log('✅ TEST PASSED');
      console.log('- No overselling detected');
      console.log('- Stock reservations match successful requests');
      console.log('- Optimistic locking working correctly');
    } else {
      console.log('❌ TEST FAILED');
      if (oversold) console.log('- Overselling detected!');
      if (reservedDifference !== successful.length * QUANTITY_PER_REQUEST) {
        console.log('- Stock reservation mismatch!');
      }
      if (concurrencyErrors.length > 0) {
        console.log(`- ${concurrencyErrors.length} concurrency errors`);
      }
    }
    console.log('');

    // Show sample errors if any
    if (otherErrors.length > 0) {
      console.log('=== Sample Errors ===\n');
      otherErrors.slice(0, 5).forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.error} (Status: ${err.status})`);
      });
      console.log('');
    }

    process.exit(testPassed ? 0 : 1);
  } else {
    console.error('Failed to fetch final stock');
    process.exit(1);
  }
}

// Run the test
runConcurrencyTest().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
