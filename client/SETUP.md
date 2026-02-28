# Client Setup Guide

Quick setup guide for the cafeteria client application.

## Prerequisites

- Node.js 20 or higher
- npm or yarn
- Backend services running (see root README.md)

## Installation

### 1. Install Dependencies

```bash
cd client
npm install
```

### 2. Configure Environment

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
```

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Docker Setup

### Build and Run

```bash
# Build image
docker build -t cafeteria-client \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost \
  --build-arg NEXT_PUBLIC_WS_URL=http://localhost:3005 \
  .

# Run container
docker run -p 3000:3000 cafeteria-client
```

### Using Docker Compose

From project root:

```bash
docker-compose up client
```

## Testing the Application

### 1. Start Backend Services

From project root:

```bash
docker-compose up -d identity-provider order-gateway stock-service kitchen-queue notification-hub
```

### 2. Login

Use demo credentials:
- Student ID: `STU001`
- Password: `password123`

### 3. Place Order

Click "Place Order Now" button to order the sample menu items.

### 4. Watch Real-time Updates

Order status will update automatically:
1. PENDING → Order submitted
2. STOCK_VERIFIED → Stock confirmed
3. PROCESSING → Kitchen preparing
4. READY → Order ready for pickup

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
PORT=3001 npm run dev
```

### Dependencies Installation Failed

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### WebSocket Connection Failed

1. Check Notification Hub is running:
   ```bash
   docker-compose ps notification-hub
   ```

2. Verify `NEXT_PUBLIC_WS_URL` in `.env.local`

3. Check browser console for errors

### API Requests Failing

1. Verify backend services are running:
   ```bash
   docker-compose ps
   ```

2. Check `NEXT_PUBLIC_API_URL` in `.env.local`

3. Ensure you're logged in (check localStorage for token)

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Development Tips

### Hot Reload

Changes to files in `src/` will automatically reload the page.

### TypeScript Errors

Check for type errors:

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Production Build

### Build

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### Test Production Build Locally

```bash
npm run build && npm start
```

## Environment Variables

### Development

`.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
```

### Production

Set in deployment environment:
```env
NEXT_PUBLIC_API_URL=https://api.cafeteria.example.com
NEXT_PUBLIC_WS_URL=https://ws.cafeteria.example.com
NODE_ENV=production
```

## Common Issues

### Issue: "Cannot find module 'react'"

**Solution**: Install dependencies
```bash
npm install
```

### Issue: "WebSocket connection failed"

**Solution**: Check Notification Hub service
```bash
docker-compose logs notification-hub
```

### Issue: "401 Unauthorized"

**Solution**: Token expired, logout and login again

### Issue: "Network Error"

**Solution**: Check backend services are running
```bash
docker-compose ps
curl http://localhost:3002/health
```

## Next Steps

- Customize menu items in `src/pages/index.tsx`
- Add more pages (order history, profile, etc.)
- Implement additional features
- Deploy to production

## Support

- Check [Client README](./README.md) for detailed documentation
- Review [Architecture](../ARCHITECTURE.md) for system design
- Check backend service logs: `docker-compose logs`
