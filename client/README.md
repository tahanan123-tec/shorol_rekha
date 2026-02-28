# Cafeteria Client Application

Modern, mobile-first single-page application for university cafeteria ordering system with real-time order tracking.

## Features

- **JWT Authentication**: Secure student login with token-based auth
- **Real-time Updates**: WebSocket integration for instant order status notifications
- **Order Tracking**: Live timeline showing order progress (Pending → Stock Verified → Processing → Ready)
- **Mobile-First Design**: Responsive UI optimized for mobile devices
- **Fast Loading**: Optimized with loading skeletons and efficient state management
- **Error Handling**: Comprehensive error handling with toast notifications
- **Token Persistence**: Automatic token storage and refresh

## Tech Stack

- **Framework**: Next.js 14 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand with persistence
- **HTTP Client**: Axios
- **WebSocket**: Socket.IO Client
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 20+
- npm or yarn
- Running backend services (Identity Provider, Order Gateway, Notification Hub)

## Environment Variables

Create a `.env.local` file in the client directory:

```env
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=http://localhost:3005
```

For production, set these in your deployment environment or docker-compose.

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The application will be available at `http://localhost:3000`

## Docker Deployment

### Build Image

```bash
docker build -t cafeteria-client \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost \
  --build-arg NEXT_PUBLIC_WS_URL=http://localhost:3005 \
  .
```

### Run Container

```bash
docker run -p 3000:3000 cafeteria-client
```

### Using Docker Compose

The client is included in the main `docker-compose.yml` at the project root:

```bash
# From project root
docker-compose up client
```

## Project Structure

```
client/
├── public/              # Static assets
├── src/
│   ├── components/      # Reusable React components
│   │   ├── LoadingSkeleton.tsx
│   │   └── OrderStatusTimeline.tsx
│   ├── lib/            # Utilities and services
│   │   ├── api.ts      # API client with interceptors
│   │   ├── store.ts    # Zustand state management
│   │   ├── utils.ts    # Helper functions
│   │   └── websocket.ts # WebSocket client
│   ├── pages/          # Next.js pages
│   │   ├── _app.tsx    # App wrapper
│   │   ├── index.tsx   # Main dashboard
│   │   ├── login.tsx   # Login page
│   │   └── 404.tsx     # Not found page
│   └── styles/
│       └── globals.css # Global styles
├── Dockerfile
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## Pages

### Login (`/login`)
- Student ID and password authentication
- Form validation
- Error handling for invalid credentials
- Rate limiting feedback
- Auto-redirect to dashboard on success

### Dashboard (`/`)
- Protected route (requires authentication)
- Order placement with sample menu
- Real-time order status tracking
- Order timeline visualization
- ETA display
- Logout functionality

### 404 (`/404`)
- Custom not found page
- Navigation options to go back or home

## API Integration

### Authentication
```typescript
import { authAPI } from '@/lib/api';

// Login
const response = await authAPI.login(student_id, password);
// Returns: { success, data: { user, access_token, refresh_token } }

// Validate token
await authAPI.validateToken();
```

### Orders
```typescript
import { orderAPI } from '@/lib/api';

// Create order
const response = await orderAPI.createOrder([
  { id: 'item-001', quantity: 1 }
]);
// Returns: { success, data: { order_id, status, items, total_amount, eta } }

// Get order status
const status = await orderAPI.getOrderStatus(orderId);
```

## WebSocket Events

### Connection
```typescript
import { connectWebSocket } from '@/lib/websocket';

const socket = connectWebSocket(accessToken);
```

### Subscribe to Order Updates
```typescript
import { subscribeToOrder, onOrderStatus } from '@/lib/websocket';

// Subscribe to specific order
subscribeToOrder(orderId);

// Listen for status updates
onOrderStatus((data) => {
  console.log('Order status:', data.status);
  // data: { order_id, status, timestamp }
});
```

### Events Received
- `connected`: WebSocket connection established
- `order:status`: Order status changed
- `stock:updated`: Stock levels changed

## State Management

### Auth Store
```typescript
import { useAuthStore } from '@/lib/store';

const { user, accessToken, setAuth, clearAuth, isAuthenticated } = useAuthStore();
```

### Order Store
```typescript
import { useOrderStore } from '@/lib/store';

const { currentOrder, setCurrentOrder, updateOrderStatus } = useOrderStore();
```

## Order Status Flow

1. **PENDING**: Order submitted, awaiting stock verification
2. **STOCK_VERIFIED**: Stock confirmed, sent to kitchen
3. **PROCESSING**: Kitchen preparing the order
4. **READY**: Order ready for pickup
5. **FAILED**: Order failed (stock depleted, kitchen error)

## Performance

- **Initial Load**: < 2s on 3G
- **Order Placement**: < 2s acknowledgment
- **WebSocket Latency**: < 100ms notification delivery
- **Bundle Size**: Optimized with Next.js automatic code splitting

## Development

### Run Development Server
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
```

### Build
```bash
npm run build
```

## Testing

### Demo Credentials

For testing, use these sample credentials (ensure users exist in database):

```
Student ID: STU001
Password: password123

Student ID: STU002
Password: password123
```

### Test Scenarios

1. **Login Flow**
   - Valid credentials → Dashboard
   - Invalid credentials → Error message
   - Rate limiting → Too many attempts message

2. **Order Flow**
   - Place order → Immediate acknowledgment
   - Watch status change → Real-time updates
   - Order ready → Notification

3. **Error Handling**
   - Network failure → Error toast
   - Stock depleted → Rejection message
   - Token expired → Auto-redirect to login

## Troubleshooting

### WebSocket Not Connecting
- Check `NEXT_PUBLIC_WS_URL` environment variable
- Ensure Notification Hub service is running
- Verify JWT token is valid
- Check browser console for connection errors

### API Requests Failing
- Verify `NEXT_PUBLIC_API_URL` is correct
- Ensure Order Gateway service is running
- Check network tab for request details
- Verify JWT token in Authorization header

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run type-check`

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android

## Security

- JWT tokens stored in localStorage with Zustand persistence
- Automatic token refresh on API calls
- Auto-logout on token expiration
- HTTPS recommended for production
- CORS configured on backend services

## Production Deployment

### Environment Variables
```env
NEXT_PUBLIC_API_URL=https://api.cafeteria.example.com
NEXT_PUBLIC_WS_URL=https://ws.cafeteria.example.com
NODE_ENV=production
```

### Build Optimization
- Standalone output enabled for Docker
- Automatic code splitting
- Image optimization
- CSS minification
- Tree shaking

### Monitoring
- Check `/health` endpoint on backend services
- Monitor WebSocket connection status
- Track order placement success rate
- Monitor API response times

## License

MIT
