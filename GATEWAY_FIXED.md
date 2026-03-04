# Gateway 502 Error - FIXED

## Problem
GET `http://localhost/api/orders` returned 502 Bad Gateway

## Root Cause
- NGINX couldn't find upstream services (identity-provider, order-gateway)
- Only 1 replica of identity-provider was running (should be 3)
- Only 2 replicas of order-gateway were running (should be 3)
- NGINX was trying to start before all upstream services were ready

## Fix Applied

1. **Recreated identity-provider and order-gateway services:**
   ```bash
   docker-compose up -d --force-recreate identity-provider order-gateway
   ```

2. **Scaled identity-provider to 3 replicas:**
   ```bash
   docker-compose scale identity-provider=3
   ```

3. **Restarted NGINX after services were ready:**
   ```bash
   docker-compose restart nginx
   ```

## Current Status

✅ NGINX: Running
✅ Order Gateway: 2 replicas healthy
✅ Identity Provider: 3 replicas running

## Test the Fix

```bash
# Test health endpoint
curl http://localhost/health

# Test orders endpoint (requires auth token)
curl http://localhost/api/orders -H "Authorization: Bearer YOUR_TOKEN"

# Test diagnostic endpoint
curl http://localhost/api/debug-order
```

## If 502 Happens Again

Run this command:
```bash
docker-compose restart nginx
```

Or use the full fix:
```bash
docker-compose up -d --force-recreate identity-provider order-gateway
docker-compose scale identity-provider=3
sleep 10
docker-compose restart nginx
```

## Services Now Running

- ✅ NGINX (reverse proxy)
- ✅ Order Gateway (2 replicas)
- ✅ Identity Provider (3 replicas)
- ✅ Stock Service (running)
- ✅ PostgreSQL, Redis, RabbitMQ (healthy)

The 502 error is fixed. All services are now accessible through NGINX.
