# Getting Started - Admin Dashboard

Quick guide to get the admin dashboard running on your machine.

## Current Issue: "localhost can't be reached"

This means the services aren't running yet. Here's how to fix it:

---

## Option 1: Using Docker (Recommended) ⭐

### Step 1: Install Docker

**Windows:**
1. Download Docker Desktop: https://www.docker.com/products/docker-desktop
2. Run the installer
3. Restart your computer
4. Open Docker Desktop from Start menu
5. Wait for "Docker Desktop is running" message

**Verify installation:**
```powershell
docker --version
```

### Step 2: Start Services

```powershell
# Navigate to project directory
cd C:\shorol_rekha\shorol_rekha

# Start all services
docker-compose up -d

# Wait 30 seconds for services to start
# Then check status
docker-compose ps
```

### Step 3: Access Dashboard

Open browser: **http://localhost:3100**

### Troubleshooting Docker

If services don't start:
```powershell
# Check Docker is running
docker info

# View logs
docker-compose logs

# Restart services
docker-compose restart

# Clean start
docker-compose down
docker-compose up -d
```

---

## Option 2: Run Locally Without Docker

If you can't install Docker, you can run just the dashboard locally.

### Step 1: Install Node.js

Download and install Node.js 20+ from: https://nodejs.org/

**Verify installation:**
```powershell
node --version
npm --version
```

### Step 2: Quick Start Script

Run the automated startup script:

```powershell
powershell -ExecutionPolicy Bypass -File start-dashboard.ps1
```

This script will:
- Check if Docker is installed
- If not, offer to run locally
- Install dependencies
- Start the dashboard

### Step 3: Manual Setup (Alternative)

If the script doesn't work:

```powershell
# Navigate to dashboard
cd admin-dashboard

# Install dependencies
npm install

# Create environment file
copy .env.example .env.local

# Start development server
npm run dev
```

### Step 4: Access Dashboard

Open browser: **http://localhost:3100**

**Note:** Without backend services, you'll see:
- Dashboard UI ✓
- All services showing as "unhealthy" (expected)
- Charts will be empty (expected)

This is normal - you're just viewing the UI without data.

---

## What You'll See

### With Docker (Full System):
```
✓ All services green (healthy)
✓ Real-time metrics updating
✓ Charts showing data
✓ Order throughput counter
✓ Latency displays
```

### Without Docker (UI Only):
```
✗ All services red (unhealthy) - expected
✗ No metrics data - expected
✓ Dashboard UI visible
✓ Can see layout and design
```

---

## Quick Commands

### Docker Commands

```powershell
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart a service
docker-compose restart admin-dashboard

# Check status
docker-compose ps
```

### Local Development Commands

```powershell
# Start dashboard
cd admin-dashboard
npm run dev

# Install dependencies
npm install

# Build for production
npm run build

# Run production build
npm start
```

---

## Ports Used

- **3100** - Admin Dashboard
- **3000** - Client Application
- **3001** - Identity Provider
- **3002** - Order Gateway
- **3003** - Stock Service
- **3004** - Kitchen Queue
- **3005** - Notification Hub
- **9090** - Prometheus
- **5432** - PostgreSQL
- **6379** - Redis
- **5672** - RabbitMQ
- **15672** - RabbitMQ Management UI

---

## System Requirements

### Minimum:
- **RAM**: 8GB
- **Disk**: 10GB free space
- **CPU**: 4 cores
- **OS**: Windows 10/11, macOS 10.15+, or Linux

### Recommended:
- **RAM**: 16GB
- **Disk**: 20GB free space
- **CPU**: 8 cores
- **Internet**: For downloading Docker images

---

## Common Issues

### "Docker is not recognized"

**Solution:** Docker is not installed or not in PATH
- Install Docker Desktop
- Restart terminal after installation

### "Cannot connect to Docker daemon"

**Solution:** Docker Desktop is not running
- Open Docker Desktop application
- Wait for it to start completely

### "Port already in use"

**Solution:** Another application is using the port
```powershell
# Find what's using port 3100
netstat -ano | findstr :3100

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### "npm is not recognized"

**Solution:** Node.js is not installed
- Install Node.js from https://nodejs.org/
- Restart terminal

---

## Next Steps

### 1. Explore the Dashboard

Once running, explore these features:
- Service health grid (top section)
- Metric cards (system health, latency, throughput)
- Real-time charts (bottom section)
- Auto-refresh toggle
- Chaos mode toggle

### 2. Start Backend Services

To see real data, start the backend services:

```powershell
# Start all services
docker-compose up -d

# Or start specific services
docker-compose up -d identity-provider order-gateway stock-service
```

### 3. Test the System

1. Open client app: http://localhost:3000
2. Login with demo credentials
3. Place an order
4. Watch metrics update in admin dashboard

### 4. Customize

- Add new services in `admin-dashboard/src/lib/api.ts`
- Modify refresh interval in `admin-dashboard/src/lib/store.ts`
- Customize charts in `admin-dashboard/src/pages/index.tsx`

---

## Documentation

- **TROUBLESHOOTING.md** - Detailed troubleshooting guide
- **admin-dashboard/README.md** - Dashboard features and API
- **admin-dashboard/SETUP.md** - Detailed setup instructions
- **admin-dashboard/IMPLEMENTATION.md** - Technical details
- **QUICK_START.md** - Quick start for entire system

---

## Getting Help

### Check Logs

```powershell
# Docker logs
docker-compose logs admin-dashboard

# Local development
# Check terminal output where npm run dev is running
```

### Verify Installation

```powershell
# Check Docker
docker --version
docker info

# Check Node.js
node --version
npm --version

# Check ports
netstat -ano | findstr :3100
```

### Test Connectivity

```powershell
# Test if dashboard is responding
curl http://localhost:3100

# Test Prometheus
curl http://localhost:9090/-/healthy
```

---

## Success Indicators

✅ Dashboard loads in browser
✅ No error messages in console
✅ Service cards are visible
✅ Charts are rendered (may be empty without data)

---

## Quick Start Summary

**Fastest way to get started:**

1. Install Docker Desktop
2. Run: `docker-compose up -d`
3. Wait 30 seconds
4. Open: http://localhost:3100

**Without Docker:**

1. Install Node.js
2. Run: `powershell -ExecutionPolicy Bypass -File start-dashboard.ps1`
3. Open: http://localhost:3100

That's it! 🎉
