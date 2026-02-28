# Quick Start - Docker Deployment

## ✅ Current Status: ALL SYSTEMS OPERATIONAL

All services are running in Docker with nginx routing.

## Quick Commands

### Start Everything
```powershell
.\deploy-local.ps1
```

### Restart Everything
```powershell
.\restart-everything.ps1
```

### Stop Everything
```powershell
docker-compose -f docker-compose.local.yml down
```

### Check Status
```powershell
docker-compose -f docker-compose.local.yml ps
```

### View Logs
```powershell
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker logs shorol_rekha-stock-service-1 -f
docker logs shorol_rekha-nginx-1 -f
docker logs shorol_rekha-client-1 -f
```

## Access URLs

### Main Application
- **Client**: http://localhost
- **Menu**: http://localhost/menu
- **Orders**: http://localhost/orders
- **Admin Dashboard**: http://localhost/admin

### API Endpoints
- **Stock Service**: http://localhost/stock
- **Auth Service**: http://localhost/auth
- **Order API**: http://localhost/api

### Monitoring & Management
- **Grafana**: http://localhost:3200 (admin/admin)
- **Prometheus**: http://localhost:9090
- **RabbitMQ**: http://localhost:15672 (admin/admin)

## Verified Working ✅

- ✅ Client Home: http://localhost/ (200 OK)
- ✅ Menu Page: http://localhost/menu (200 OK)
- ✅ Stock Service: http://localhost/stock (200 OK, 10 items)
- ✅ Admin Dashboard: http://localhost/admin (200 OK)

## Architecture

```
Browser → NGINX (port 80) → Services
                ├── / → Client (Next.js)
                ├── /admin → Admin Dashboard
                ├── /stock → Stock Service
                ├── /auth → Identity Provider
                ├── /api → Order Gateway
                └── /socket.io → Notification Hub
```

## Service Health

All services are healthy:
- ✅ nginx (Up)
- ✅ client (Up)
- ✅ admin-dashboard (Up)
- ✅ identity-provider (Healthy)
- ✅ order-gateway (Healthy)
- ✅ stock-service (Healthy)
- ✅ kitchen-queue (Healthy)
- ✅ notification-hub (Healthy)
- ✅ postgres (Healthy)
- ✅ redis (Healthy)
- ✅ rabbitmq (Healthy)
- ✅ prometheus (Up)
- ✅ grafana (Up)

## Troubleshooting

### Service won't start
```powershell
# Check logs
docker logs shorol_rekha-[service-name]-1

# Restart specific service
docker-compose -f docker-compose.local.yml restart [service-name]
```

### Port already in use
```powershell
# Stop all containers
docker-compose -f docker-compose.local.yml down

# Check what's using port 80
netstat -ano | findstr :80

# Start again
.\deploy-local.ps1
```

### Need to rebuild
```powershell
# Rebuild and restart
docker-compose -f docker-compose.local.yml up -d --build
```

### Clear everything and start fresh
```powershell
# Stop and remove everything including volumes
docker-compose -f docker-compose.local.yml down -v

# Start fresh
.\deploy-local.ps1
```

## Development Workflow

1. **Make code changes** in your editor
2. **Hot reload** works for client and admin-dashboard (volumes mounted)
3. **Backend changes** require rebuild:
   ```powershell
   docker-compose -f docker-compose.local.yml up -d --build [service-name]
   ```

## What's Different from Before

### Before (Mixed Deployment)
- Infrastructure in Docker
- Services running with npm locally
- Client calling services directly by port
- Complex port management

### Now (Full Docker)
- Everything in Docker
- All traffic through nginx on port 80
- Clean URL routing
- Simplified management

## Next Steps

1. Open http://localhost in your browser
2. Browse the menu
3. Test ordering flow
4. Check admin dashboard at http://localhost/admin
5. Monitor with Grafana at http://localhost:3200

## Success! 🎉

Your cafeteria system is now fully deployed in Docker with proper routing through nginx.
