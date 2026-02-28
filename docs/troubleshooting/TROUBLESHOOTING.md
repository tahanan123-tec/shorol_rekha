# Troubleshooting Guide

## Issue: "localhost can't be reached"

### Possible Causes:

1. **Docker not installed or not running**
2. **Services not started**
3. **Port conflicts**
4. **Firewall blocking connections**

---

## Solution 1: Install and Start Docker

### Windows

1. **Install Docker Desktop:**
   - Download from: https://www.docker.com/products/docker-desktop
   - Run installer
   - Restart computer

2. **Verify Installation:**
   ```powershell
   docker --version
   docker-compose --version
   ```

3. **Start Docker Desktop:**
   - Open Docker Desktop application
   - Wait for "Docker Desktop is running" message

4. **Start Services:**
   ```powershell
   docker-compose up -d
   ```

5. **Check Services:**
   ```powershell
   docker-compose ps
   ```

### Linux

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start services
docker-compose up -d
```

### macOS

```bash
# Install Docker Desktop
brew install --cask docker

# Start Docker Desktop from Applications
# Then start services
docker-compose up -d
```

---

## Solution 2: Run Admin Dashboard Locally (Without Docker)

If you want to run just the admin dashboard without Docker:

### Prerequisites

- Node.js 20+ installed
- Services running (or mock data)

### Steps

1. **Navigate to admin dashboard:**
   ```powershell
   cd admin-dashboard
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Create environment file:**
   ```powershell
   copy .env.example .env.local
   ```

4. **Edit `.env.local`:**
   ```env
   NEXT_PUBLIC_PROMETHEUS_URL=http://localhost:9090
   NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost
   ```

5. **Start development server:**
   ```powershell
   npm run dev
   ```

6. **Access dashboard:**
   ```
   http://localhost:3100
   ```

**Note:** Without backend services running, the dashboard will show all services as "unhealthy" but you can still see the UI.

---

## Solution 3: Run Individual Services Locally

### 1. Start PostgreSQL

**Using Docker (recommended):**
```powershell
docker run -d --name postgres -p 5432:5432 -e POSTGRES_PASSWORD=admin postgres:15-alpine
```

**Or install PostgreSQL locally:**
- Download from: https://www.postgresql.org/download/

### 2. Start Redis

**Using Docker:**
```powershell
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Or install Redis locally:**
- Windows: https://github.com/microsoftarchive/redis/releases
- Linux: `sudo apt-get install redis-server`
- macOS: `brew install redis`

### 3. Start RabbitMQ

**Using Docker:**
```powershell
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
```

### 4. Start Prometheus

**Using Docker:**
```powershell
docker run -d --name prometheus -p 9090:9090 -v ${PWD}/infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
```

### 5. Start Each Service

For each service (identity-provider, order-gateway, etc.):

```powershell
cd services/identity-provider
npm install
copy .env.example .env
# Edit .env with your database URLs
npm run dev
```

Repeat for all services on their respective ports.

---

## Solution 4: Check Port Availability

### Check if ports are in use:

**Windows:**
```powershell
netstat -ano | findstr :3100
netstat -ano | findstr :3000
netstat -ano | findstr :9090
```

**Linux/macOS:**
```bash
lsof -i :3100
lsof -i :3000
lsof -i :9090
```

### Kill process using a port:

**Windows:**
```powershell
# Find PID from netstat output, then:
taskkill /PID <PID> /F
```

**Linux/macOS:**
```bash
kill -9 <PID>
```

---

## Solution 5: Check Firewall

### Windows Firewall

1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Add Node.js and Docker Desktop
4. Allow both Private and Public networks

### Disable temporarily to test:

**Windows:**
```powershell
# Run as Administrator
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

**Re-enable after testing:**
```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

---

## Verification Steps

### 1. Check Docker is Running

```powershell
docker info
```

Should show Docker information without errors.

### 2. Check Services are Running

```powershell
docker-compose ps
```

All services should show "Up" status.

### 3. Check Logs

```powershell
# All services
docker-compose logs

# Specific service
docker-compose logs admin-dashboard
docker-compose logs prometheus
```

### 4. Test Individual Endpoints

```powershell
# Test Prometheus
curl http://localhost:9090/-/healthy

# Test services
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health

# Test admin dashboard
curl http://localhost:3100
```

### 5. Check Network Connectivity

```powershell
# Ping localhost
ping localhost

# Check DNS resolution
nslookup localhost
```

---

## Common Error Messages

### "Cannot connect to Docker daemon"

**Solution:**
- Start Docker Desktop
- Wait for it to fully start
- Check Docker Desktop settings

### "Port already in use"

**Solution:**
- Find and kill process using the port
- Or change port in docker-compose.yml

### "Network timeout"

**Solution:**
- Check firewall settings
- Check antivirus software
- Try disabling VPN

### "Connection refused"

**Solution:**
- Service not started
- Wrong port number
- Service crashed (check logs)

---

## Quick Diagnostic Script

Save as `diagnose.ps1` and run:

```powershell
# Check Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
docker --version
docker-compose --version

# Check running containers
Write-Host "`nChecking containers..." -ForegroundColor Yellow
docker ps

# Check ports
Write-Host "`nChecking ports..." -ForegroundColor Yellow
$ports = @(3000, 3100, 3001, 3002, 3003, 3004, 3005, 9090, 5432, 6379, 5672, 15672)
foreach ($port in $ports) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue
    if ($connection.TcpTestSucceeded) {
        Write-Host "Port $port : OPEN" -ForegroundColor Green
    } else {
        Write-Host "Port $port : CLOSED" -ForegroundColor Red
    }
}

# Test endpoints
Write-Host "`nTesting endpoints..." -ForegroundColor Yellow
$endpoints = @(
    "http://localhost:3100",
    "http://localhost:9090/-/healthy",
    "http://localhost:3001/health",
    "http://localhost:3002/health"
)

foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint -TimeoutSec 5 -UseBasicParsing
        Write-Host "$endpoint : OK ($($response.StatusCode))" -ForegroundColor Green
    } catch {
        Write-Host "$endpoint : FAILED" -ForegroundColor Red
    }
}
```

Run with:
```powershell
powershell -ExecutionPolicy Bypass -File diagnose.ps1
```

---

## Still Having Issues?

### 1. Check System Requirements

- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 10GB free
- **CPU**: 4+ cores recommended
- **OS**: Windows 10/11, macOS 10.15+, or Linux

### 2. Review Logs

```powershell
# Docker logs
docker-compose logs --tail=100

# Service-specific logs
docker-compose logs --tail=50 admin-dashboard
```

### 3. Restart Everything

```powershell
# Stop all services
docker-compose down

# Remove volumes (clean slate)
docker-compose down -v

# Rebuild and start
docker-compose up -d --build
```

### 4. Check Docker Desktop Settings

- **Resources**: Allocate at least 4GB RAM, 2 CPUs
- **Network**: Ensure Docker network is enabled
- **File Sharing**: Add project directory to shared paths

---

## Alternative: Use Pre-built Images

If building locally fails, you can use pre-built images (if available):

```yaml
# In docker-compose.yml, replace build: with image:
admin-dashboard:
  image: cafeteria/admin-dashboard:latest
  # ... rest of config
```

---

## Contact Support

If none of these solutions work:

1. Collect diagnostic information:
   ```powershell
   docker info > docker-info.txt
   docker-compose logs > docker-logs.txt
   ipconfig /all > network-info.txt
   ```

2. Check:
   - Operating system version
   - Docker version
   - Error messages
   - Steps already tried

3. Review documentation:
   - [Docker Documentation](https://docs.docker.com/)
   - [Docker Compose Documentation](https://docs.docker.com/compose/)
   - Project README.md files
