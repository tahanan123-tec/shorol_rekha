# Quick Start Guide

Get the entire cafeteria ordering system running in 5 minutes.

## Prerequisites

- Docker & Docker Compose installed
- Ports 3000-3005, 5432, 6379, 5672, 15672 available

## Step 1: Clone & Setup

```bash
# Clone repository
git clone <repository-url>
cd cafeteria-ordering-system

# Copy environment file
cp .env.example .env
```

## Step 2: Generate JWT Keys

```bash
# On Linux/Mac
bash scripts/generate-jwt-keys.sh

# On Windows (Git Bash)
bash scripts/generate-jwt-keys.sh

# Or manually create keys directory
mkdir -p services/identity-provider/keys
```

## Step 3: Start All Services

```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- RabbitMQ message broker
- Identity Provider (auth)
- Order Gateway (API)
- Stock Service (inventory)
- Kitchen Queue (processing)
- Notification Hub (WebSocket)
- Client Application (web UI)

## Step 4: Wait for Services

```bash
# Check all services are healthy (wait ~30 seconds)
docker-compose ps

# Or watch logs
docker-compose logs -f
```

## Step 5: Access the Application

Open your browser: **http://localhost:3000**

### Demo Login

```
Student ID: STU001
Password: password123
```

## Step 6: Place an Order

1. Click "Place Order Now"
2. Watch real-time status updates:
   - PENDING → Order submitted
   - STOCK_VERIFIED → Stock confirmed
   - PROCESSING → Kitchen preparing (3-7 seconds)
   - READY → Order ready!

## Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Client | http://localhost:3000 | Web UI |
| Identity Provider | http://localhost:3001 | Authentication |
| Order Gateway | http://localhost:3002 | API Gateway |
| Stock Service | http://localhost:3003 | Inventory |
| Kitchen Queue | http://localhost:3004 | Processing |
| Notification Hub | http://localhost:3005 | WebSocket |
| RabbitMQ UI | http://localhost:15672 | Queue Management |

## Health Checks

```bash
# Check all services
curl http://localhost:3001/health  # Identity Provider
curl http://localhost:3002/health  # Order Gateway
curl http://localhost:3003/health  # Stock Service
curl http://localhost:3004/health  # Kitchen Queue
curl http://localhost:3005/health  # Notification Hub
```

## Common Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f order-gateway

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart a service
docker-compose restart order-gateway

# Scale a service
docker-compose up -d --scale kitchen-queue=3
```

## Testing the API

### 1. Login

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "STU001",
    "password": "password123"
  }'
```

Save the `access_token` from response.

### 2. Place Order

```bash
curl -X POST http://localhost:3002/api/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "items": [
      {"id": "item-001", "quantity": 1}
    ]
  }'
```

### 3. Check Order Status

```bash
curl http://localhost:3002/api/order/status/YOUR_ORDER_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 4. Check Stock

```bash
curl http://localhost:3003/stock/item-001
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache

# Remove everything and start fresh
docker-compose down -v
docker-compose up -d
```

### Port Conflicts

Edit `docker-compose.yml` to change ports:

```yaml
services:
  client:
    ports:
      - "3001:3000"  # Change 3001 to any available port
```

### Database Issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait 10 seconds
docker-compose up -d
```

### RabbitMQ Issues

```bash
# Check RabbitMQ management UI
open http://localhost:15672
# Login: cafeteria / your_password_from_.env

# View queues
docker-compose exec rabbitmq rabbitmqctl list_queues
```

### Client Can't Connect

1. Check backend services are running:
   ```bash
   docker-compose ps
   ```

2. Verify environment variables in `docker-compose.yml`:
   ```yaml
   NEXT_PUBLIC_API_URL: http://localhost
   NEXT_PUBLIC_WS_URL: http://localhost:3005
   ```

3. Clear browser cache and reload

## Performance Testing

### Load Test Stock Service

```bash
cd services/stock-service
npm install
node tests/concurrency/load-test.js
```

Expected: 100 concurrent requests, 0 overselling, ~39 req/s

### Monitor Metrics

```bash
# View Prometheus metrics
curl http://localhost:3001/metrics
curl http://localhost:3002/metrics
curl http://localhost:3003/metrics
```

## Next Steps

1. **Customize**: Edit menu items, add features
2. **Scale**: Add more service instances
3. **Monitor**: Set up Prometheus + Grafana
4. **Deploy**: Move to production environment

## Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [README](./README.md) - Full documentation
- [Client Setup](./client/README.md) - Frontend details
- Service READMEs in `services/*/README.md`

## Support

Having issues? Check:
1. Docker logs: `docker-compose logs`
2. Service health: `curl http://localhost:300X/health`
3. Environment variables in `.env`
4. Port availability: `netstat -an | grep LISTEN`

## Clean Up

```bash
# Stop all services
docker-compose down

# Remove volumes (database data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Success Indicators

✅ All services show "healthy" in `docker-compose ps`
✅ Client loads at http://localhost:3000
✅ Can login with demo credentials
✅ Can place order successfully
✅ Order status updates in real-time
✅ Order completes in 3-7 seconds

Enjoy your cafeteria ordering system! 🍽️
