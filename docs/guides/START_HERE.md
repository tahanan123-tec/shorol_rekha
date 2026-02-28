# 🚀 Quick Start Guide - Run the Complete System

## Prerequisites Check

✅ Node.js installed  
✅ npm working  
✅ Docker installed  
✅ All dependencies installed  
✅ Environment files created  

## Start Everything (One Command)

Open PowerShell in the project root and run:

```powershell
.\start-all.ps1
```

This will:
1. Start all infrastructure (PostgreSQL, Redis, RabbitMQ, etc.)
2. Start all 7 microservices
3. Start both frontend applications

## What You'll See

Multiple PowerShell windows will open, one for each service. This is normal!

## Access the Applications

### Main Applications
- **Client App** (Student Portal): http://localhost:3000
- **Admin Dashboard**: http://localhost:3100

### Microservices
- Identity Provider: http://localhost:3001
- Order Gateway: http://localhost:3002
- Kitchen Queue: http://localhost:3003
- Stock Service: http://localhost:3004
- Notification Hub: http://localhost:3005
- Chaos Monkey: http://localhost:3007
- Predictive Scaler: http://localhost:3008

### Monitoring Tools
- **Grafana**: http://localhost:3006 (username: `admin`, password: `admin`)
- **Prometheus**: http://localhost:9090
- **Jaeger** (Tracing): http://localhost:16686
- **RabbitMQ**: http://localhost:15672 (username: `guest`, password: `guest`)

## First Time Setup

### 1. Create a Test User

Open http://localhost:3000 and click "Register" or use the API:

```powershell
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d '{
  "student_id": "STU001",
  "email": "test@university.edu",
  "password": "Test123!@#",
  "full_name": "Test Student"
}'
```

### 2. Login

Use the credentials you just created to login at http://localhost:3000

### 3. Place an Order

Once logged in, you can place orders and see real-time updates!

## Stopping Everything

### Stop Services
Close all the PowerShell windows that opened

### Stop Infrastructure
```powershell
docker-compose down
```

## Troubleshooting

### Port Already in Use
If you get port errors, check what's using the port:
```powershell
netstat -ano | findstr :3000
```

### Docker Not Running
Start Docker Desktop from the Start menu

### Service Won't Start
Check the service's PowerShell window for error messages

### Database Connection Errors
Wait 30 seconds after starting docker-compose for databases to initialize

## Manual Start (If Needed)

### 1. Start Infrastructure
```powershell
docker-compose up -d
```

### 2. Start Services (in separate terminals)
```powershell
# Terminal 1
cd services/identity-provider
npm run dev

# Terminal 2
cd services/order-gateway
npm run dev

# Terminal 3
cd services/kitchen-queue
npm run dev

# Terminal 4
cd services/stock-service
npm run dev

# Terminal 5
cd services/notification-hub
npm run dev

# Terminal 6
cd client
npm run dev

# Terminal 7
cd admin-dashboard
npm run dev
```

## Testing the System

### 1. Register & Login
Go to http://localhost:3000 and create an account

### 2. Place an Order
Click "Place Order" and watch real-time updates

### 3. Check Admin Dashboard
Go to http://localhost:3100 to see system metrics

### 4. View Monitoring
- Grafana: http://localhost:3006 - See system dashboards
- Jaeger: http://localhost:16686 - See request traces
- RabbitMQ: http://localhost:15672 - See message queues

## System Architecture

```
┌─────────────────┐     ┌──────────────────┐
│  Client App     │────▶│  Order Gateway   │
│  (Port 3000)    │     │  (Port 3002)     │
└─────────────────┘     └──────────────────┘
                               │
                               ▼
┌─────────────────┐     ┌──────────────────┐
│ Admin Dashboard │     │ Identity Provider│
│  (Port 3100)    │────▶│  (Port 3001)     │
└─────────────────┘     └──────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│Kitchen Queue │      │Stock Service │      │Notification  │
│ (Port 3003)  │      │ (Port 3004)  │      │Hub (Port 3005)│
└──────────────┘      └──────────────┘      └──────────────┘
        │                      │                      │
        └──────────────────────┼──────────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   Infrastructure    │
                    │ PostgreSQL, Redis,  │
                    │ RabbitMQ, Prometheus│
                    └─────────────────────┘
```

## Next Steps

1. ✅ Start the system with `.\start-all.ps1`
2. ✅ Open http://localhost:3000
3. ✅ Register a new account
4. ✅ Place your first order
5. ✅ Check the admin dashboard
6. ✅ Explore monitoring tools

## Need Help?

- Check `TROUBLESHOOTING.md` for common issues
- Check service logs in their PowerShell windows
- Check Docker logs: `docker-compose logs`
