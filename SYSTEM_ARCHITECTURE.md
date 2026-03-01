# System Architecture Overview

## Data Flow & Connectivity

### Menu Management System

Both the **Client Application** and **Admin Dashboard** are connected to the **same backend database** through the Stock Service.

```
┌─────────────────────┐         ┌──────────────────────┐
│  Client App         │         │  Admin Dashboard     │
│  (Customer View)    │         │  (Management View)   │
│  localhost/menu     │         │  localhost/admin/menu│
└──────────┬──────────┘         └──────────┬───────────┘
           │                               │
           │  GET /stock                   │  GET/POST/PUT/DELETE /stock
           │                               │  (with x-internal-api-key)
           └───────────────┬───────────────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx    │
                    │   Proxy     │
                    └──────┬──────┘
                           │
                    Rewrites /stock → /api/menu
                           │
                    ┌──────▼──────────┐
                    │  Stock Service  │
                    │   (Port 3003)   │
                    └──────┬──────────┘
                           │
                    ┌──────▼──────────┐
                    │   PostgreSQL    │
                    │  inventory_db   │
                    │  stock_items    │
                    └─────────────────┘
```

### Key Points

1. **Same Database**: Both applications read from and write to the `stock_items` table in PostgreSQL
2. **Same API**: Both use the Stock Service `/api/menu` endpoints (proxied through nginx as `/stock`)
3. **Different Permissions**:
   - **Client**: Read-only access (GET requests)
   - **Admin**: Full CRUD access (GET, POST, PUT, DELETE) with API key authentication

## API Endpoints

### Stock Service (via Nginx Proxy)

All requests go through nginx at `http://localhost/stock` which rewrites to `http://stock-service:3003/api/menu`

#### Public Endpoints (No Auth Required)
- `GET /stock` - Get all menu items
- `GET /stock/:id` - Get single menu item

#### Admin Endpoints (Require x-internal-api-key Header)
- `POST /stock` - Create new menu item
- `PUT /stock/:id` - Update menu item
- `DELETE /stock/:id` - Delete menu item
- `PATCH /stock/:id/availability` - Toggle availability

### Authentication

Admin operations require the `x-internal-api-key` header:

```javascript
headers: {
  'Content-Type': 'application/json',
  'x-internal-api-key': 'internal-secret-key'
}
```

This is configured in:
- `docker-compose.local.yml` - Stock service environment: `INTERNAL_API_KEY=internal-secret-key`
- `docker-compose.local.yml` - Admin dashboard environment: `NEXT_PUBLIC_INTERNAL_API_KEY=internal-secret-key`
- `infrastructure/nginx/nginx.conf` - Passes header: `proxy_set_header x-internal-api-key $http_x_internal_api_key;`

## Database Schema

### stock_items Table

```sql
CREATE TABLE stock_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  image VARCHAR(255),
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Application Features

### Client Application (localhost/menu)
- **Purpose**: Customer-facing menu for ordering
- **Features**:
  - Browse menu items
  - Search and filter by category
  - View item details
  - Add items to cart
  - Place orders
- **Access**: Read-only menu data

### Admin Dashboard (localhost/admin/menu)
- **Purpose**: Restaurant management interface
- **Features**:
  - View all menu items with statistics
  - Create new menu items
  - Edit existing items (name, price, category, quantity, image, description)
  - Delete menu items
  - Toggle item availability
  - Stock management
  - Search and filter
  - Real-time inventory tracking
- **Access**: Full CRUD operations with API key

### Admin Dashboard - Other Pages

#### Dashboard (localhost/admin)
- System monitoring
- Service health checks
- Prometheus metrics integration
- Chaos engineering controls

#### Orders Management (localhost/admin/orders)
- View all orders
- Filter by status
- Real-time order updates
- Order details

## Routing Configuration

### Nginx Routes

```nginx
# Stock service - rewrites /stock to /api/menu
location ~ ^/stock(/.*)?$ {
    rewrite ^/stock(/.*)?$ /api/menu$stock_path break;
    proxy_pass http://stock_service;
    proxy_set_header x-internal-api-key $http_x_internal_api_key;
}

# Admin dashboard - strips /admin prefix
location ^~ /admin {
    rewrite ^/admin(/.*)$ $1 break;
    proxy_pass http://admin_dashboard;
}

# Client application - default route
location / {
    proxy_pass http://client_app;
}
```

## Environment Variables

### Stock Service
```env
INTERNAL_API_KEY=internal-secret-key
DATABASE_URL=postgresql://admin:admin@postgres:5432/inventory_db
```

### Admin Dashboard
```env
NEXT_PUBLIC_SERVICES_BASE_URL=http://localhost
NEXT_PUBLIC_PROMETHEUS_URL=http://localhost/prometheus
NEXT_PUBLIC_INTERNAL_API_KEY=internal-secret-key
```

### Client Application
```env
NEXT_PUBLIC_API_URL=http://localhost
NEXT_PUBLIC_WS_URL=ws://localhost/socket.io
```

## Data Synchronization

Since both applications use the same database:

1. **Admin creates/updates item** → Immediately available in client menu
2. **Admin toggles availability** → Instantly reflected in client view
3. **Admin updates stock** → Real-time inventory updates
4. **No caching issues** → Direct database queries ensure consistency

## Security

### API Key Protection
- Admin write operations protected by `x-internal-api-key`
- Key stored in environment variables
- Nginx passes header to backend services
- Stock service validates key before processing

### Rate Limiting
- Global: 500 req/s per IP
- API endpoints: 300 req/s per IP
- Burst handling: 200 requests

### Headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy configured

## Testing the Connection

### Test Client Menu
```bash
curl http://localhost/stock
```

### Test Admin Create (requires API key)
```bash
curl -X POST http://localhost/stock \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: internal-secret-key" \
  -d '{
    "name": "Test Item",
    "price": 10.99,
    "category": "Snacks",
    "quantity": 50,
    "image": "🍕",
    "description": "Test description"
  }'
```

### Test Admin Update
```bash
curl -X PUT http://localhost/stock/1 \
  -H "Content-Type: application/json" \
  -H "x-internal-api-key: internal-secret-key" \
  -d '{
    "name": "Updated Item",
    "price": 12.99
  }'
```

### Test Admin Delete
```bash
curl -X DELETE http://localhost/stock/1 \
  -H "x-internal-api-key: internal-secret-key"
```

## Troubleshooting

### Admin operations return 401/403
- Check `x-internal-api-key` header is being sent
- Verify key matches in docker-compose.local.yml
- Check nginx is passing the header

### Menu items not showing
- Check stock service is running: `docker-compose -f docker-compose.local.yml ps stock-service`
- Check database connection: `docker-compose -f docker-compose.local.yml logs stock-service`
- Verify nginx routing: `docker-compose -f docker-compose.local.yml logs nginx`

### Changes not reflecting
- Both apps use same database - changes should be instant
- Check browser cache (hard refresh: Ctrl+Shift+R)
- Verify API response: Check browser DevTools Network tab

## Summary

✅ **Client and Admin ARE connected to the same backend**
✅ **Both use Stock Service → PostgreSQL stock_items table**
✅ **Admin has full CRUD with API key authentication**
✅ **Client has read-only access**
✅ **All routing through nginx proxy**
✅ **Real-time data synchronization**
