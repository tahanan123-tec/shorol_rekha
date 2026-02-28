# FINAL LOGIN FIX - NO DOCKER

## The Problem
- Identity provider needs PostgreSQL and Redis
- These aren't running
- Docker isn't available

## Quick Fix (Without Docker)

### Option 1: Install PostgreSQL & Redis Locally

1. **Install PostgreSQL**:
   - Download from: https://www.postgresql.org/download/windows/
   - Or use: `winget install PostgreSQL.PostgreSQL`
   - Create database:
   ```sql
   CREATE USER identity_user WITH PASSWORD 'identity_pass';
   CREATE DATABASE identity_db OWNER identity_user;
   ```

2. **Install Redis**:
   - Download from: https://github.com/microsoftarchive/redis/releases
   - Or use: `winget install Redis.Redis`
   - Start Redis: `redis-server`

3. **Start Services**:
   ```powershell
   # Terminal 1 - Identity Provider
   cd services/identity-provider
   npm start

   # Terminal 2 - Client
   cd client
   npm run dev
   ```

4. **Login**:
   - Go to: http://localhost:3000/login
   - User: test123
   - Pass: Test@1234

### Option 2: Use Docker Desktop

1. **Install Docker Desktop**:
   - Download: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop

2. **Start Everything**:
   ```powershell
   docker-compose up -d
   ```

3. **Login**:
   - Go to: http://localhost:3000/login
   - User: test123
   - Pass: Test@1234

### Option 3: Bypass Login (Development Only)

Update `client/src/lib/store.ts` to skip auth:

```typescript
// Add this to useAuthStore
const mockLogin = () => {
  set({
    user: {
      user_id: 1,
      student_id: 'test123',
      email: 'test@example.com',
      full_name: 'Test User'
    },
    accessToken: 'mock-token',
    refreshToken: 'mock-refresh',
    isAuthenticated: true
  });
};
```

Then in login page, call `mockLogin()` instead of API.

## Current Status

✗ Docker not running
✗ PostgreSQL not running  
✗ Redis not running
✓ Client .env.local fixed
✓ Test user will be created on first start

## What You Need

Pick ONE option above and follow the steps. The easiest is Option 2 (Docker Desktop) if you can install it.

## Files Fixed

- `client/.env.local` - API URL set to http://localhost:3001
- `services/identity-provider/src/config/database.js` - Auto-creates test user
- All routing configured correctly

## Test Credentials

- Student ID: `test123`
- Password: `Test@1234`
- Email: `test@example.com`
