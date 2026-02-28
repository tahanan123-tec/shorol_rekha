# Login Issue - Complete Fix Guide

## Issues Identified

1. **Empty .env.local file** - Client had no API URL configured
2. **No test user in database** - Demo credentials don't exist
3. **Client cache** - Next.js cache may have old environment values

## Fixes Applied

### 1. Client Environment Configuration
Created `client/.env.local` with correct values:
```env
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
```

### 2. Test User Auto-Creation
Updated `services/identity-provider/src/config/database.js` to automatically create test user on startup:
- Student ID: `test123`
- Password: `Test@1234`
- Email: `test@example.com`

### 3. Nginx Routing
Fixed nginx configuration to route `/auth/*` correctly (already done in previous fix).

## How to Apply Fixes

### Option 1: Quick Fix (Recommended)
```powershell
# Run the fix script
./fix-login-now.ps1

# Restart services
docker-compose restart identity-provider client

# Or if running locally:
cd client
npm run dev
```

### Option 2: Manual Fix
```powershell
# 1. Ensure .env.local exists
echo "NEXT_PUBLIC_API_URL=http://localhost" > client/.env.local
echo "NEXT_PUBLIC_WS_URL=http://localhost:3005" >> client/.env.local

# 2. Clear Next.js cache
Remove-Item -Recurse -Force client/.next

# 3. Restart identity provider (creates test user)
docker-compose restart identity-provider

# 4. Restart client
docker-compose restart client
```

### Option 3: Test Login
```powershell
# Run the test script to verify
./test-login.ps1
```

## Testing the Fix

1. Open browser to http://localhost:3000/login
2. Enter credentials:
   - Student ID: `test123`
   - Password: `Test@1234`
3. Click "Sign In"

## If Still Failing

### Check Browser Console
Open DevTools (F12) and look for:
- Network errors (CORS, 404, 500)
- Console errors (API URL issues)

### Check Service Logs
```powershell
# Identity provider logs
docker logs cafeteria-system-identity-provider-1 --tail 50

# Client logs
docker logs cafeteria-system-client-1 --tail 50

# Nginx logs (if using)
docker logs cafeteria-system-nginx-1 --tail 50
```

### Common Issues

**Issue**: "Network Error" or "Failed to fetch"
**Solution**: Check if identity-provider is running on port 3001
```powershell
docker ps | Select-String identity
```

**Issue**: "Invalid credentials"
**Solution**: Test user may not exist. Restart identity-provider:
```powershell
docker-compose restart identity-provider
```

**Issue**: "CORS error"
**Solution**: Check client is accessing through correct URL (localhost, not 127.0.0.1)

**Issue**: "429 Too Many Requests"
**Solution**: Wait 1 minute or restart Redis:
```powershell
docker-compose restart redis identity-provider
```

## Architecture

```
Browser → http://localhost:3000 (Client)
           ↓
Client calls → http://localhost/auth/login
           ↓
Nginx (port 80) → routes to identity-provider:3001
           ↓
Identity Provider → validates credentials → returns JWT
```

## Direct Access (Without Nginx)

If nginx is not running, client can access identity-provider directly:

1. Update `client/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. Restart client:
```powershell
docker-compose restart client
```

This bypasses nginx but loses rate limiting and security features.
