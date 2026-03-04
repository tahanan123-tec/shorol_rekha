# Admin Inventory Overview Feature

## Overview
Added a real-time inventory management feature to the Admin Dashboard that displays current available stock for all food items.

## Implementation Details

### 1. Backend - Stock Service

#### New Endpoint
```
GET /admin/stock
```

**Authentication**: Requires `X-Internal-API-Key` header

**Response Format**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "name": "Chicken Biryani",
        "category": "Main Course",
        "available_quantity": 85,
        "reserved_quantity": 15,
        "total_quantity": 100,
        "price": 12.99,
        "image": "🍛",
        "updated_at": "2026-03-04T10:30:00Z",
        "low_stock": false
      }
    ],
    "summary": {
      "total_items": 10,
      "total_available": 850,
      "low_stock_count": 2
    }
  }
}
```

#### Service Method
**File**: `services/stock-service/src/services/stock.service.js`

```javascript
const getAdminInventory = async () => {
  // Fetches real-time inventory with:
  // - Available quantity (total - reserved)
  // - Low stock detection (≤10 items)
  // - Sorted by low stock first, then by available quantity
  // - Includes summary metrics
}
```

**SQL Query**:
```sql
SELECT 
  item_id as id,
  item_name as name,
  category,
  quantity,
  reserved_quantity,
  (quantity - reserved_quantity) as available_quantity,
  price,
  image,
  updated_at
FROM inventory
ORDER BY 
  CASE 
    WHEN (quantity - reserved_quantity) <= 10 THEN 0
    ELSE 1
  END,
  (quantity - reserved_quantity) ASC,
  item_name ASC
```

#### Controller Method
**File**: `services/stock-service/src/controllers/stock.controller.js`

```javascript
const getAdminInventory = async (req, res, next) => {
  // Handles GET /admin/stock
  // Logs admin access
  // Returns inventory data with summary
}
```

#### Route
**File**: `services/stock-service/src/routes/stock.routes.js`

```javascript
router.get('/admin/stock', validateInternalApiKey, stockController.getAdminInventory);
```

### 2. Frontend - Admin Dashboard

#### API Integration
**File**: `admin-dashboard/src/lib/api.ts`

```typescript
export interface InventoryItem {
  id: number;
  name: string;
  category: string;
  available_quantity: number;
  reserved_quantity: number;
  total_quantity: number;
  price: number;
  image: string;
  updated_at: string;
  low_stock: boolean;
}

export const getAdminInventory = async (): Promise<AdminInventoryResponse> => {
  // Fetches inventory from /admin/stock endpoint
  // Includes internal API key authentication
}
```

#### Inventory Component
**File**: `admin-dashboard/src/components/InventoryOverview.tsx`

**Features**:
- Real-time inventory display
- Auto-refresh every 30 seconds
- Summary cards showing:
  - Total items
  - Total available quantity
  - Low stock items count
- Sortable table by:
  - Available quantity (low to high)
  - Name (A-Z)
  - Category
- Visual indicators:
  - Low stock items highlighted in orange
  - Status badges (In Stock, Low Stock, Out of Stock)
- Manual refresh button

#### Inventory Page
**File**: `admin-dashboard/src/pages/inventory.tsx`

Simple page wrapper that includes Navigation and InventoryOverview components.

#### Navigation Update
**File**: `admin-dashboard/src/components/Navigation.tsx`

Added "Inventory" link with Package icon to the navigation menu.

### 3. Stock Deduction Flow

The system ensures stock is properly managed:

1. **Order Creation**:
   - Stock is RESERVED when order is created
   - `reserved_quantity` increases
   - `available_quantity` = `quantity` - `reserved_quantity`

2. **Order Completion**:
   - When order status becomes COMPLETED
   - Stock is decremented (moved from reserved to sold)
   - `quantity` decreases
   - `reserved_quantity` decreases
   - `available_quantity` remains accurate

3. **Order Failure**:
   - If order fails after reservation
   - Compensating transaction releases stock
   - `reserved_quantity` decreases
   - `available_quantity` increases

### 4. Security

- **Authentication**: Endpoint requires `X-Internal-API-Key` header
- **Authorization**: Currently uses API key (can be extended to check ADMIN role)
- **Logging**: All admin inventory access is logged with user information

### 5. Logging

**Stock Service Logs**:
```javascript
// When inventory is fetched
logger.info('Fetching admin inventory overview', { service: 'stock-service' });

// On success
logger.info('Admin inventory fetched successfully', {
  service: 'stock-service',
  itemCount: result.rows.length,
  durationMs: duration
});

// On error
logger.error('Failed to fetch admin inventory', { 
  service: 'stock-service',
  error: error.message,
  stack: error.stack
});
```

**Controller Logs**:
```javascript
logger.info('Admin inventory request received', {
  service: 'stock-service',
  user: req.user?.email || 'unknown'
});
```

## Usage

### Access the Inventory Page

1. Start the services:
```bash
docker-compose up -d
```

2. Navigate to Admin Dashboard:
```
http://localhost:3100/admin/inventory
```

3. View real-time inventory with:
   - Available quantities
   - Reserved quantities
   - Low stock warnings
   - Category grouping
   - Price information

### API Testing

```bash
# Test the endpoint directly
curl -H "X-Internal-API-Key: dev-secret-key-change-in-production" \
  http://localhost/admin/stock
```

## Features

### Summary Metrics
- **Total Items**: Count of all inventory items
- **Total Available**: Sum of all available quantities
- **Low Stock Count**: Number of items with ≤10 available

### Table Features
- **Sorting**: By available quantity, name, or category
- **Visual Indicators**: 
  - Orange background for low stock items
  - Color-coded status badges
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Manual Refresh**: Button to fetch latest data

### Low Stock Detection
Items with available_quantity ≤ 10 are:
- Marked with `low_stock: true`
- Sorted to top of list
- Highlighted with orange background
- Shown with "Low Stock" badge

## Database Schema

The inventory table structure:
```sql
CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  item_id VARCHAR(50) UNIQUE NOT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  category VARCHAR(100),
  description TEXT,
  image VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT reserved_non_negative CHECK (reserved_quantity >= 0)
);
```

**Key Fields**:
- `quantity`: Total stock quantity
- `reserved_quantity`: Stock reserved for pending orders
- `available_quantity`: Calculated as `quantity - reserved_quantity`

## Files Modified

### Backend
1. `services/stock-service/src/services/stock.service.js` - Added `getAdminInventory()`
2. `services/stock-service/src/controllers/stock.controller.js` - Added `getAdminInventory()` controller
3. `services/stock-service/src/routes/stock.routes.js` - Added `/admin/stock` route

### Frontend
1. `admin-dashboard/src/lib/api.ts` - Added `getAdminInventory()` API function
2. `admin-dashboard/src/components/InventoryOverview.tsx` - New component
3. `admin-dashboard/src/pages/inventory.tsx` - New page
4. `admin-dashboard/src/components/Navigation.tsx` - Added inventory link

## Testing

### Manual Testing
1. Place an order with multiple items
2. Check inventory page - should show reduced available quantity
3. Complete the order
4. Check inventory page - stock should be decremented
5. Cancel an order
6. Check inventory page - reserved stock should be released

### Expected Behavior
- Available quantity updates in real-time
- Low stock items appear at top with warning
- Summary metrics are accurate
- Auto-refresh works every 30 seconds
- Manual refresh button works
- Sorting functions correctly

## Future Enhancements

1. **Role-Based Access**: Add proper ADMIN role check instead of just API key
2. **Stock Alerts**: Email/notification when stock is low
3. **Stock History**: Track stock changes over time
4. **Reorder Suggestions**: Suggest when to reorder based on usage patterns
5. **Export**: Export inventory data to CSV/Excel
6. **Filters**: Filter by category, low stock, out of stock
7. **Search**: Search items by name
8. **Bulk Actions**: Update multiple items at once

## Notes

- Stock is reserved when order is created
- Stock is decremented when order is completed
- Compensating transactions handle failures
- Available quantity = Total - Reserved
- Low stock threshold is 10 items
- Auto-refresh interval is 30 seconds

---

**Author**: Musfikur Rahaman Tahanan  
**Date**: March 4, 2026  
**Version**: 1.0.0
