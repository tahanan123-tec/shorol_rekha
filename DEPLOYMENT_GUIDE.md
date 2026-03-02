# Cafeteria Management System - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

1. **Docker Desktop** installed and running
   - Windows: https://docs.docker.com/desktop/install/windows-install/
   - Mac: https://docs.docker.com/desktop/install/mac-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/

2. **Git** installed
   - Download from: https://git-scm.com/downloads

3. **System Requirements**
   - 8GB RAM minimum (16GB recommended)
   - 20GB free disk space
   - Windows 10/11, macOS 10.15+, or Linux

**IMPORTANT NOTE**: This project includes `package-lock.json` files in the repository to ensure reproducible builds across all computers. These files lock exact dependency versions and should NOT be deleted.

---

## Step-by-Step Deployment

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd shorol_rekha
```

### 2. Verify Docker is Running

```bash
docker --version
docker-compose --version
```

Both commands should return version numbers. If not, start Docker Desktop.

### 3. Clean Any Existing Containers (Optional)

If you've run this before, clean up:

```bash
docker-compose -f docker-compose.local.yml down -v
docker system prune -a --volumes
```

⚠️ **Warning**: This removes ALL Docker data. Skip if you have other projects.

### 4. Build and Start Services

```bash
# Build all services
docker-compose -f docker-compose.local.yml build

# Start all services
docker-compose -f docker-compose.local.yml up -d
```

This will take 5-10 minutes on first run.

### 5. Wait for Services to be Healthy

```bash
# Check service status
docker-compose -f docker-compose.local.yml ps
```

Wait until all services show "healthy" status (may take 2-3 minutes).

### 6. Seed the Database

```bash
# Seed menu items
docker exec shorol_rekha-postgres-1 psql -U admin -d inventory_db -f /docker-entrypoint-initdb.d/seed-menu.sql
```

If the seed file doesn't exist, manually add items:

```bash
docker exec shorol_rekha-postgres-1 psql -U admin -d inventory_db -c "
INSERT INTO inventory (item_id, item_name, price, category, quantity, image, description) VALUES
('item-001', 'Chicken Biryani', 180.00, 'Main Course', 100, '🍛', 'Aromatic rice with chicken'),
('item-002', 'Beef Kebab', 150.00, 'Main Course', 80, '🍖', 'Grilled beef skewers'),
('item-003', 'Vegetable Samosa', 40.00, 'Snacks', 150, '🥟', 'Crispy pastry with vegetables'),
('item-004', 'Mango Lassi', 60.00, 'Beverages', 120, '🥭', 'Sweet mango yogurt drink'),
('item-005', 'Naan Bread', 30.00, 'Breads', 200, '🫓', 'Soft flatbread'),
('item-006', 'Butter Chicken', 200.00, 'Main Course', 70, '🍛', 'Creamy tomato chicken curry'),
('item-007', 'Dal Makhani', 120.00, 'Main Course', 90, '🥘', 'Creamy black lentils'),
('item-008', 'Gulab Jamun', 80.00, 'Desserts', 100, '🍮', 'Sweet milk dumplings'),
('item-009', 'Tandoori Chicken', 220.00, 'Main Course', 60, '🍗', 'Clay oven roasted chicken'),
('item-010', 'Paneer Tikka', 160.00, 'Main Course', 75, '🧀', 'Grilled cottage cheese')
ON CONFLICT (item_id) DO NOTHING;
"
```

### 7. Verify Deployment

Open your browser and test:

- **Client App**: http://localhost
- **Admin Dashboard**: http://localhost/admin
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3200

### 8. Create Test User

Register a new user at: http://localhost/register

Or use SQL:

```bash
docker exec shorol_rekha-postgres-1 psql -U admin -d identity_db -c "
INSERT INTO users (student_id, email, password_hash, full_name, created_at)
VALUES ('STU001', 'test@example.com', '\$2b\$10\$abcdefghijklmnopqrstuvwxyz123456', 'Test User', NOW())
ON CONFLICT (student_id) DO NOTHING;
"
```

### 9. Login Credentials

**Customer Login:**
- Student ID: STU001
- Password: password123 (or register new)

**Admin Login:**
- Username: admin
- Password: admin123

---

## Common Issues & Solutions

### Issue 1: Port Already in Use

**Error**: `Bind for 0.0.0.0:80 failed: port is already allocated`

**Solution**:
```bash
# Windows
netstat -ano | findstr :80
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:80 | xargs kill -9
```

### Issue 2: Docker Build Fails

**Error**: `failed to solve with frontend dockerfile.v0`

**Solution**:
```bash
# Clear Docker cache
docker builder prune -a

# Rebuild
docker-compose -f docker-compose.local.yml build --no-cache
```

### Issue 3: Services Not Healthy

**Error**: Services stuck in "starting" state

**Solution**:
```bash
# Check logs
docker-compose -f docker-compose.local.yml logs <service-name>

# Common fixes:
docker-compose -f docker-compose.local.yml restart
```

### Issue 4: Database Connection Failed

**Error**: `ECONNREFUSED` or `Connection refused`

**Solution**:
```bash
# Restart postgres
docker restart shorol_rekha-postgres-1

# Check if postgres is ready
docker exec shorol_rekha-postgres-1 pg_isready -U admin
```

### Issue 5: npm/Node Errors in Client

**Error**: `Module not found` or build errors

**Solution**:
```bash
# Rebuild client
docker-compose -f docker-compose.local.yml build client --no-cache
docker restart shorol_rekha-client-1
```

### Issue 6: Nginx 502 Bad Gateway

**Error**: 502 errors when accessing services

**Solution**:
```bash
# Check if backend services are running
docker-compose -f docker-compose.local.yml ps

# Restart nginx
docker restart shorol_rekha-nginx-1
```

---

## Troubleshooting Commands

### View Logs
```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Specific service
docker-compose -f docker-compose.local.yml logs -f <service-name>

# Last 100 lines
docker logs shorol_rekha-<service>-1 --tail 100
```

### Check Service Health
```bash
# List all containers
docker ps

# Check specific service
docker inspect shorol_rekha-<service>-1 | grep Health -A 10
```

### Restart Services
```bash
# Restart all
docker-compose -f docker-compose.local.yml restart

# Restart specific service
docker restart shorol_rekha-<service>-1
```

### Database Access
```bash
# Access PostgreSQL
docker exec -it shorol_rekha-postgres-1 psql -U admin -d <database_name>

# Databases: identity_db, orders_db, inventory_db
```

### Clean Restart
```bash
# Stop all
docker-compose -f docker-compose.local.yml down

# Remove volumes (⚠️ deletes data)
docker-compose -f docker-compose.local.yml down -v

# Start fresh
docker-compose -f docker-compose.local.yml up -d
```

---

## Performance Optimization

### For Low-End Systems

Edit `docker-compose.local.yml` and reduce replicas:

```yaml
deploy:
  replicas: 1  # Change from 3 to 1
```

### Allocate More Memory to Docker

Docker Desktop → Settings → Resources → Memory: 8GB+

---

## Stopping the System

```bash
# Stop all services (keeps data)
docker-compose -f docker-compose.local.yml stop

# Stop and remove containers (keeps data)
docker-compose -f docker-compose.local.yml down

# Stop and remove everything including data
docker-compose -f docker-compose.local.yml down -v
```

---

## Quick Start Script

Create a file `start.sh` (Linux/Mac) or `start.bat` (Windows):

**start.sh:**
```bash
#!/bin/bash
echo "Starting Cafeteria Management System..."
docker-compose -f docker-compose.local.yml up -d
echo "Waiting for services to be healthy..."
sleep 30
echo "System ready at http://localhost"
```

**start.bat:**
```batch
@echo off
echo Starting Cafeteria Management System...
docker-compose -f docker-compose.local.yml up -d
echo Waiting for services to be healthy...
timeout /t 30
echo System ready at http://localhost
```

Make executable and run:
```bash
chmod +x start.sh
./start.sh
```

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│           Nginx (Port 80)                   │
│         Reverse Proxy & Load Balancer       │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ┌───▼───┐   ┌───▼───┐   ┌──▼────┐
    │Client │   │ Admin │   │  API  │
    │  App  │   │  Dash │   │Gateway│
    └───────┘   └───────┘   └───┬───┘
                                 │
        ┌────────────────────────┼────────────┐
        │                        │            │
    ┌───▼────┐            ┌──────▼──┐   ┌────▼────┐
    │Identity│            │  Stock  │   │ Kitchen │
    │Provider│            │ Service │   │  Queue  │
    └────────┘            └─────────┘   └─────────┘
        │                      │              │
        └──────────┬───────────┴──────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼───┐  ┌───▼───┐  ┌──▼────┐
    │Postgres│ │ Redis │  │RabbitMQ│
    └────────┘ └───────┘  └────────┘
```

---

## Support

If you encounter issues not covered here:

1. Check logs: `docker-compose -f docker-compose.local.yml logs`
2. Verify Docker is running: `docker ps`
3. Check system resources: Docker Desktop → Resources
4. Try clean restart: `docker-compose -f docker-compose.local.yml down -v && docker-compose -f docker-compose.local.yml up -d`

---

## Success Checklist

✅ Docker Desktop installed and running
✅ Repository cloned
✅ Services built successfully
✅ All containers showing "healthy"
✅ Database seeded with menu items
✅ Can access http://localhost
✅ Can login to client app
✅ Can access admin dashboard at http://localhost/admin
✅ Can place orders
✅ Can manage inventory

**System is ready! 🎉**
