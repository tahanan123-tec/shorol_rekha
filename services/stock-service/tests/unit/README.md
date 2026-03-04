# Stock Service Unit Tests

Unit tests for the Stock Service, focusing on stock reservation logic and database operations.

## Test Files

### stock.service.test.js

Original unit tests for stock service functionality.

### multi-item-reservation.test.js

Tests the batch query optimization that fixes the 503 error for multi-item orders.

**Test Coverage:**
- Batch query using PostgreSQL `ANY($1)` operator
- Single query for multiple items (vs N sequential queries)
- Atomic transaction handling
- Insufficient stock validation
- Item not found error handling
- Performance characteristics

## Running Tests

### Run All Unit Tests

```bash
cd services/stock-service
npm test
```

### Run Specific Test File

```bash
npm test -- tests/unit/multi-item-reservation.test.js
```

### Run with Coverage

```bash
npm run test:coverage
```

## Test Structure

The tests use Sinon for mocking database operations:

```javascript
// Mock database client
const clientStub = {
  query: sinon.stub(),
  release: sinon.stub(),
};

// Mock pool.connect()
sinon.stub(pool, 'connect').resolves(clientStub);
```

This allows testing the logic without requiring a real database connection.

## Key Test Cases

### 1. Batch Query Optimization

Verifies that `reserveStock()` uses a single batch query:

```sql
SELECT ... FROM inventory WHERE item_id = ANY($1) FOR UPDATE
```

Instead of N sequential queries:

```sql
SELECT ... FROM inventory WHERE item_id = $1 FOR UPDATE  -- Query 1
SELECT ... FROM inventory WHERE item_id = $1 FOR UPDATE  -- Query 2
SELECT ... FROM inventory WHERE item_id = $1 FOR UPDATE  -- Query 3
```

### 2. Atomic Transaction

Ensures all items are reserved or none:
- If ANY item has insufficient stock → ROLLBACK entire transaction
- If ALL items available → COMMIT all reservations

### 3. Error Handling

Tests proper error responses:
- 404: Item not found
- 409: Insufficient stock (with details)
- 409: Concurrent modification (optimistic locking)

### 4. Performance

Verifies 10-item reservation completes quickly:
- Before fix: 3-5 seconds (timeout)
- After fix: < 100ms (in unit tests)

## Mock Data Structure

Tests use realistic mock data:

```javascript
{
  id: 1,
  item_id: '1',
  item_name: 'Item 1',
  quantity: 10,
  reserved_quantity: 0,
  version: 1,
  price: 10.00
}
```

## Troubleshooting

### Tests Fail with "Cannot find module"

```bash
npm install
```

### Sinon Stubs Not Restoring

Ensure `afterEach` hook calls `sinon.restore()`:

```javascript
afterEach(() => {
  sinon.restore();
});
```

### Unexpected Query Calls

Check query call order with:

```javascript
console.log(queryStub.getCalls().map(c => c.args[0]));
```

## Best Practices

1. **Always restore stubs** - Use `sinon.restore()` in `afterEach`
2. **Mock all database calls** - Don't let tests hit real database
3. **Test error paths** - Verify rollback and error handling
4. **Verify query structure** - Check SQL uses batch operations
5. **Test edge cases** - Empty arrays, missing items, etc.

## Related Documentation

- [MULTI_ITEM_ORDER_FIX.md](../../../../MULTI_ITEM_ORDER_FIX.md) - Complete fix documentation
- [Stock Service README](../../README.md) - Service overview
- [Stock Service Implementation](../../IMPLEMENTATION.md) - Technical details
