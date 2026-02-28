# ⚡ Run the System RIGHT NOW

## Step 1: Start Docker Desktop

1. Press `Windows Key` and search for "Docker Desktop"
2. Click to open Docker Desktop
3. Wait for it to say "Docker Desktop is running" (green icon in system tray)
4. This takes about 30-60 seconds

## Step 2: Run the Startup Script

Open PowerShell in this folder and run:

```powershell
.\start-all.ps1
```

**That's it!** The script will:
- Start all databases and infrastructure
- Start all 7 microservices (each in its own window)
- Start both frontend apps

## Step 3: Access the Application

Wait about 1 minute for everything to start, then open:

**http://localhost:3000** - Main application

## Quick Test

1. Go to http://localhost:3000
2. Click "Register" 
3. Fill in:
   - Student ID: `STU001`
   - Email: `test@university.edu`
   - Password: `Test123!@#`
   - Full Name: `Test Student`
4. Click Register
5. Login with those credentials
6. Place an order!

## All Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| **Client App** | http://localhost:3000 | Register first |
| **Admin Dashboard** | http://localhost:3100 | - |
| **Grafana** | http://localhost:3006 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Jaeger** | http://localhost:16686 | - |
| **RabbitMQ** | http://localhost:15672 | guest / guest |

## If Docker Desktop Won't Start

### Option 1: Restart Docker
1. Right-click Docker icon in system tray
2. Click "Restart"
3. Wait 1 minute

### Option 2: Restart Computer
Sometimes Windows needs a restart for Docker to work

### Option 3: Reinstall Docker Desktop
Download from: https://www.docker.com/products/docker-desktop

## Stop Everything

1. Close all PowerShell windows
2. Run: `docker-compose down`

## Troubleshooting

### "Port already in use"
Something else is using the port. Find and stop it:
```powershell
netstat -ano | findstr :3000
```

### "Cannot connect to database"
Wait 30 more seconds - databases take time to start

### Service shows errors
Check the PowerShell window for that service to see the error

## What You Should See

After running `.\start-all.ps1`:
- 1 PowerShell window stays open (the main script)
- 9 new PowerShell windows open (7 services + 2 frontends)
- Each window shows logs for that service
- After ~1 minute, all services should say "Server started" or similar

## Success Indicators

✅ Docker Desktop shows green icon  
✅ Multiple PowerShell windows are open  
✅ http://localhost:3000 loads  
✅ You can register and login  
✅ You can place an order  

## Need More Help?

Check `START_HERE.md` for detailed instructions
