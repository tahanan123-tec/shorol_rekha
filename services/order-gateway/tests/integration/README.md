# Order Gateway Integration Tests

Integration tests for the Order Gateway service, focusing on end-to-end API functionality.

## Test Files

### multi-item-order.test.js

Tests the multi-item order functionality that was fixed to resolve 503 Service Unavailable errors.

**Test Coverage:**
- Single item orders
- Multi-item orders (3, 5, 10 items)
- Insufficient stock handling
- Performance benchmarks
- Order status retrieval

**Requirements:**
- Services must be running (`docker-compose.local.yml`)
- Test user must exist in database
- API must be accessible at `http://localhost`

## Running Tests

### Run All Integration Tests

```bash
cd services/order-gateway
npm test -- tests/integration/
```

### Run Specific Test File

```bash
npm test -- tests/integration/multi-item-order.test.js
```

### Run with Custom API URL

```bash
API_URL=http://localhost:8080 npm test -- tests/integration/multi-item-order.test.js
```

## Test User Setup

The tests use a default test user:
- Email: `test@iut-dhaka.edu`
- Password: `Test123!@#`

If this user doesn't exist, create it via the registration endpoint or update the credentials in the test file.

## Expected Results

All tests should pass with:
- ✓ Single item order: < 1 second
- ✓ 3-item order: < 1 second
- ✓ 5-item order: < 1 second
- ✓ 10-item order: < 2 seconds
- ✓ Insufficient stock: Returns 409 error
- ✓ Order status: Returns order details

## Troubleshooting

### Services Not Running

```bash
# Start services
.\scripts\deployment\deploy-local.ps1

# Check service health
docker-compose -f docker-compose.local.yml ps
```

### Authentication Fails

- Verify test user exists
- Check identity-provider service is healthy
- Update test credentials if needed

### Tests Timeout

- Increase timeout in test file: `this.timeout(20000)`
- Check service logs: `docker-compose -f docker-compose.local.yml logs order-gateway stock-service`
- Verify database connectivity

## Performance Benchmarks

The tests measure response times to ensure the batch query optimization is working:

| Items | Before Fix | After Fix | Target |
|-------|-----------|-----------|--------|
| 1     | ~100ms    | ~100ms    | < 1s   |
| 3     | 3-5s (timeout) | ~300ms | < 1s   |
| 5     | Timeout   | ~500ms    | < 1s   |
| 10    | Timeout   | ~1s       | < 2s   |

If tests exceed these targets, investigate:
- Database query performance
- Network latency
- Service resource constraints
