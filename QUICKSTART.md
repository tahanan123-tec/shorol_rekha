# 🚀 Quick Start Guide

Get the IUT Cafeteria System up and running in 5 minutes!

## Prerequisites

- Docker Desktop installed and running
- Git installed
- 8GB RAM minimum
- 20GB free disk space

## Step 1: Clone the Repository

```bash
git clone https://github.com/tahanan123-tec/shorol_rekha.git
cd shorol_rekha
```

## Step 2: Start the System

```bash
# Start all services
docker-compose up -d

# Wait for services to be healthy (30-60 seconds)
docker-compose ps
```

## Step 3: Access the Applications

Open your browser and navigate to:

- **Student App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3100
- **Monitoring (Grafana)**: http://localhost:3200

## Step 4: Test the System

### Register a New User
1. Go to http://localhost:3000
2. Click "Register"
3. Fill in the form:
   - Student ID: `test123`
   - Email: `test@example.com`
   - Password: `Test@123`
   - Full Name: `Test User`
4. Click "Register"

### Place an Order
1. Login with your credentials
2. Browse the menu
3. Add items to cart
4. Click "Checkout"
5. Confirm your order

### View in Admin Dashboard
1. Go to http://localhost:3100
2. Login with admin credentials (if required)
3. View orders in real-time

## Step 5: Monitor the System

### Grafana Dashboards
1. Go to http://localhost:3200
2. Login: `admin` / `admin`
3. Navigate to Dashboards
4. View "System Overview" dashboard

### Prometheus Metrics
1. Go to http://localhost:9090
2. Explore metrics and queries

## Common Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f order-gateway

# Last 100 lines
docker-compose logs --tail=100 stock-service
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart order-gateway
```

### Stop the System
```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Check Service Health
```bash
# View running containers
docker-compose ps

# Check specific service health
docker exec shorol_rekha-order-gateway-1 curl http://localhost:3002/health
```

## Troubleshooting

### Services Not Starting
```bash
# Check Docker is running
docker ps

# Check logs for errors
docker-compose logs

# Restart Docker Desktop
# Then try: docker-compose up -d
```

### Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                 # Mac/Linux

# Kill the process or change port in docker-compose.yml
```

### Database Connection Issues
```bash
# Restart database
docker-compose restart postgres

# Check database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### 502 Bad Gateway
```bash
# Restart NGINX
docker-compose restart nginx

# Check upstream services
docker-compose ps

# Restart all services
docker-compose restart
```

## Next Steps

- 📖 Read the [Full Documentation](README.md)
- 🏗️ Explore the [Architecture](docs/architecture/ARCHITECTURE.md)
- 🔧 Check [Configuration Options](docs/deployment/QUICK_DEPLOY.md)
- 🐛 Report issues on [GitHub](https://github.com/tahanan123-tec/shorol_rekha/issues)

## Default Credentials

### Admin Dashboard
- Username: `admin`
- Password: `admin123` (change in production!)

### RabbitMQ Management
- URL: http://localhost:15672
- Username: `admin`
- Password: `admin`

### Grafana
- URL: http://localhost:3200
- Username: `admin`
- Password: `admin`

## System Requirements

### Minimum
- CPU: 2 cores
- RAM: 8GB
- Disk: 20GB
- OS: Windows 10+, macOS 10.15+, Linux

### Recommended
- CPU: 4+ cores
- RAM: 16GB
- Disk: 50GB SSD
- OS: Latest version

## Support

Need help? 

- 📖 Check the [Troubleshooting Guide](docs/troubleshooting/TROUBLESHOOTING.md)
- 💬 Open an [Issue](https://github.com/tahanan123-tec/shorol_rekha/issues)
- 📧 Email: support@example.com

---

**Happy Coding! 🎉**
