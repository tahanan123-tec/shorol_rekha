# Quick Login Fix

## Run This Command

```powershell
./fix-and-test-login.ps1
```

This script will:
1. ✓ Fix client/.env.local with correct API URL
2. ✓ Clear Next.js cache
3. ✓ Restart identity-provider (creates test user)
4. ✓ Restart client (picks up new config)
5. ✓ Test login to verify it works

## Test Credentials

- **Student ID**: `test123`
- **Password**: `Test@1234`

## What Was Fixed

1. **Empty .env.local** - Client had no API URL
2. **No test user** - Database auto-creates test user now
3. **Stale cache** - Cleared Next.js build cache

## If Script Fails

### Services Not Running?
```powershell
docker-compose up -d
```

### Still Not Working?
```powershell
# Check what's running
docker-compose ps

# View logs
docker-compose logs identity-provider
docker-compose logs client

# Full restart
docker-compose down
docker-compose up -d
```

## Manual Test

```powershell
# Test login API directly
$body = @{student_id="test123"; password="Test@1234"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3001/auth/login" -Method Post -Body $body -ContentType "application/json"
```

## Architecture

```
Client (localhost:3000)
  ↓ calls http://localhost/auth/login
Nginx (localhost:80) OR Direct (localhost:3001)
  ↓
Identity Provider (port 3001)
  ↓
PostgreSQL (port 5432)
```

## Success Indicators

✓ Script shows "LOGIN IS WORKING!"
✓ Can access http://localhost:3000/login
✓ Can login with test123 / Test@1234
✓ Redirected to home page after login
