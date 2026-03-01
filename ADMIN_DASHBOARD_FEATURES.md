# Admin Dashboard - Professional Kitchen Service Features 🍽️

## Overview

The admin dashboard has been enhanced with comprehensive menu and order management capabilities, making it a full-fledged professional kitchen service management system.

## New Features Added

### 1. Menu Management Page (`/menu`)

Complete CRUD operations for menu items:

- **View All Menu Items**: Display all food items with filtering and search
- **Add New Items**: Create new menu items with:
  - Name, price, category
  - Stock quantity
  - Emoji/icon representation
  - Description
  - Availability status
- **Edit Items**: Update existing menu items
- **Delete Items**: Remove items from the menu
- **Toggle Availability**: Quickly enable/disable items for ordering
- **Category Filtering**: Filter by Main Course, Fast Food, Snacks, Beverages, Desserts
- **Search Functionality**: Search items by name
- **Stock Alerts**: Visual indicators for low stock items

#### Statistics Dashboard:
- Total items count
- Available items count
- Low stock warnings
- Total inventory value

### 2. Orders Management Page (`/orders`)

Real-time order monitoring and management:

- **View All Orders**: Complete order history with details
- **Order Status Management**: Update order status through workflow:
  - Pending → Confirmed → Preparing → Ready → Completed
  - Cancel orders when needed
- **Order Details**: View complete order information:
  - Order ID and User ID
  - Items ordered with quantities
  - Total amount
  - Timestamps
- **Status Filtering**: Filter orders by status
- **Search Orders**: Search by order ID or user ID
- **Real-time Updates**: Auto-refresh every 30 seconds

#### Statistics Dashboard:
- Total orders count
- Pending orders
- Orders being prepared
- Completed orders
- Total revenue

### 3. Navigation System

Easy navigation between dashboard sections:
- Dashboard (System Health Monitoring)
- Menu Management
- Orders Management

### 4. Backend API Endpoints

New REST API endpoints in Stock Service:

```
GET    /api/menu              - Get all menu items
GET    /api/menu/:id          - Get single menu item
POST   /api/menu              - Create new menu item
PUT    /api/menu/:id          - Update menu item
DELETE /api/menu/:id          - Delete menu item
PATCH  /api/menu/:id/availability - Toggle availability
```

## Access Information

- **Admin Dashboard**: http://localhost:3100
- **Menu Management**: http://localhost:3100/menu
- **Orders Management**: http://localhost:3100/orders

## Features for Professional Kitchen Service

### Menu Management
✅ Add/Edit/Delete food items
✅ Set prices and manage stock
✅ Categorize items (Main Course, Fast Food, Snacks, Beverages, Desserts)
✅ Toggle item availability
✅ Low stock alerts
✅ Search and filter capabilities
✅ Visual emoji/icon representation

### Order Management
✅ Real-time order monitoring
✅ Order status workflow management
✅ Order details view
✅ Revenue tracking
✅ Status-based filtering
✅ Auto-refresh for live updates

### Inventory Control
✅ Stock quantity tracking
✅ Low stock warnings (< 20 units)
✅ Critical stock alerts (< 10 units)
✅ Total inventory value calculation

### User Experience
✅ Professional, modern UI
✅ Responsive design
✅ Toast notifications for actions
✅ Modal dialogs for forms
✅ Color-coded status indicators
✅ Icon-based navigation

## Technical Implementation

### Frontend (Admin Dashboard)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **State Management**: React Hooks

### Backend (Stock Service)
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Authentication**: API Key validation
- **Logging**: Winston logger
- **Error Handling**: Centralized error middleware

## Database Schema

```sql
CREATE TABLE stock_items (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 0,
  image VARCHAR(255),
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Usage Guide

### Adding a New Menu Item

1. Navigate to Menu Management page
2. Click "Add New Item" button
3. Fill in the form:
   - Item name (required)
   - Category (required)
   - Price in ৳ (required)
   - Quantity (required)
   - Emoji/Icon (optional)
   - Description (optional)
   - Availability checkbox
4. Click "Add Item"

### Managing Orders

1. Navigate to Orders Management page
2. View all orders with their current status
3. Click on an order to view details
4. Use the status dropdown to update order status
5. Filter by status or search by ID

### Stock Management

1. Go to Menu Management
2. Monitor stock levels (color-coded):
   - Green: > 20 units (healthy)
   - Yellow: 10-20 units (low stock)
   - Red: < 10 units (critical)
3. Edit items to update quantities
4. Toggle availability for out-of-stock items

## Security Features

- API key authentication for write operations
- Input validation on all endpoints
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting (inherited from services)

## Future Enhancements

Potential additions for even more functionality:

- [ ] Bulk import/export of menu items
- [ ] Image upload for menu items
- [ ] Sales analytics and reports
- [ ] Customer feedback integration
- [ ] Ingredient management
- [ ] Recipe management
- [ ] Staff management
- [ ] Table management
- [ ] Reservation system
- [ ] Loyalty program integration

## Troubleshooting

### Menu items not loading
```bash
# Check stock service logs
docker logs shorol_rekha-stock-service-1

# Restart stock service
docker-compose restart stock-service
```

### Orders not updating
```bash
# Check order gateway logs
docker logs shorol_rekha-order-gateway-1

# Restart order gateway
docker-compose restart order-gateway
```

### Admin dashboard not accessible
```bash
# Check admin dashboard logs
docker logs shorol_rekha-admin-dashboard-1

# Restart admin dashboard
docker-compose restart admin-dashboard
```

## API Testing

Test the menu API endpoints:

```bash
# Get all menu items
curl http://localhost:3003/api/menu

# Get specific item
curl http://localhost:3003/api/menu/1

# Create new item (requires API key)
curl -X POST http://localhost:3003/api/menu \
  -H "Content-Type: application/json" \
  -H "X-Internal-API-Key: your-api-key" \
  -d '{
    "name": "Test Item",
    "price": 100,
    "category": "Snacks",
    "quantity": 50,
    "image": "🍕"
  }'
```

---

**Developed by**: Musfikur Rahaman Tahanan  
**Institution**: Islamic University of Technology (IUT), CSE First Year  
**Date**: March 1, 2026  
**Commit**: 8c3148c - Add professional menu and order management to admin dashboard
