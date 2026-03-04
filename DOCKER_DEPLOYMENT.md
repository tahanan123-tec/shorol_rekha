# Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- At least 8GB RAM allocated to Docker
- Ports 80, 3006, 9090, 15672, 16686 available

### Deployment Steps

#### Option 1: Automated Deployment (Recommended)
```powershell
# Run the deployment script
.\scripts\deployment\deploy-docker.ps1
```

#### Option 2: Manual Deployment
```powershell
# 1. Ensure Docker is running
docker --version

# 2. Create environment file (if not exists)
Copy-Item .env.example .env

# 3. Build and start all services
docker-compose up -d --build

# 4. Check status
docker-compose ps

# 5. View logs
docker-compose logs -f
```

### Access Points

Once deployed, access the system at:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Client App** | http://localhost | - |
| **Admin Dashboard** | http://localhost/admin | admin@iut.edu / Admin@123 |
| **Grafana** | http://localhost:3006 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Jaeger** | http://localhost:16686 | - |
| **RabbitMQ** | http://localhost:15672 | admin / admin |

### Service Architecture

The deployment includes:

**Infrastructure:**
- PostgreSQL (3 databases: identity, orders, inventory)
- Redis (caching & sessions)
- RabbitMQ (message queue)
- Nginx (reverse proxy & load balancer)

**Microservices:**
- Identity Provider (port 3001)
- Order Gateway (port 3002)
- Stock Service (port 3003)
- Kitchen Queue (port 3004)
- Notification Hub (port 3005)
- Chaos Monkey (port 3007)
- Predictive Scaler (port 3008)

**Frontend:**
- Client App (Next.js)
- Admin Dashboard (Next.js)

**Monitoring:**
- Prometheus (metrics)
- Grafana (dashboards)
- Jaeger (tracing)

### Troubleshooting

#### Docker not starting
```powershell
# Check if Docker Desktop is running
Get-Process "Docker Desktop"

# If not, start Docker Desktop from Start Menu
```

#### Port conflicts
```powershell
# Check what's using port 80
netstat -ano | findstr :80

# Stop conflicting services or change ports in docker-compose.yml
```

#### Services not healthy
```powershell
# Check logs for specific service
docker-compose logs <service-name>

# Restart a service
docker-compose restart <service-name>

# Rebuild and restart
docker-compose up -d --build <service-name>
```

#### Database connection issues
```powershell
# Check if PostgreSQL is running
docker-compose ps postgres

# View PostgreSQL logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Useful Commands

```powershell
# View all running containers
docker-compose ps

# View logs (all services)
docker-compose logs -f

# View logs (specific service)
docker-compose logs -f identity-provider

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart specific service
docker-compose restart stock-service

# Scale a service
docker-compose up -d --scale order-gateway=3

# Execute command in container
docker-compose exec identity-provider sh

# View resource usage
docker stats
```

### Performance Tuning

For production deployment:

1. **Update .env file** with secure passwords
2. **Increase Docker resources** (Settings > Resources)
   - CPU: 4+ cores
   - Memory: 8+ GB
   - Swap: 2+ GB
3. **Enable production mode** in docker-compose.yml
4. **Configure SSL/TLS** in Nginx
5. **Set up external databases** for better performance

### Stopping the System

```powershell
# Stop all services (preserves data)
docker-compose down

# Stop and remove all data
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all
```

### Next Steps

After deployment:
1. Access http://localhost to view the client app
2. Register a new user account
3. Browse the menu and place test orders
4. Access admin dashboard at http://localhost/admin
5. Monitor system health in Grafana at http://localhost:3006

### Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- View troubleshooting guide: `docs/troubleshooting/TROUBLESHOOTING.md`
- Check service health: `docker-compose ps`
