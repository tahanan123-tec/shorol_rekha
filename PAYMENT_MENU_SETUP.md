# Payment Methods & Menu Setup

## What's New

### 1. Payment Methods Added
The checkout page now supports three payment methods:

#### bKash Payment
- Mobile wallet payment
- Requires bKash number (01XXXXXXXXX format)
- Requires transaction ID after payment
- Merchant number: 01712345678

#### Bank Transfer
- Direct bank account transfer
- Requires your bank account number
- Requires transaction ID
- Bank details:
  - Bank: Dutch Bangla Bank
  - Account: 1234567890
  - Branch: Dhaka Main

#### Cash on Pickup
- Pay when you collect your order
- No advance payment required

### 2. Menu Items Database

Created a seed script with 29 menu items across 5 categories:

- **Main Course** (6 items): Biryani, Kacchi, Rezala, Fish Curry, etc.
- **Fast Food** (6 items): Burgers, Pizza, Fries, Wings, etc.
- **Snacks** (5 items): Samosa, Spring Roll, Singara, Patties, etc.
- **Beverages** (7 items): Soft drinks, Juices, Tea, Coffee, etc.
- **Desserts** (5 items): Rasgulla, Gulab Jamun, Cake, Ice Cream, etc.

## Setup Instructions

### Step 1: Seed Menu Items

```powershell
# Run the seed script
./seed-menu.ps1
```

Or manually:
```powershell
cd services/stock-service
node src/scripts/seed-menu.js
```

### Step 2: Restart Client

```powershell
# If using Docker
docker-compose restart client

# If running locally
cd client
npm run dev
```

### Step 3: Test the Flow

1. Go to http://localhost:3000/menu
2. Browse the menu items (should see 29 items)
3. Add items to cart
4. Go to checkout
5. Select payment method:
   - For bKash: Enter number and transaction ID
   - For Bank: Enter account and transaction ID
   - For Cash: Just place order
6. Place order

## API Changes

### Updated Order API

```typescript
orderAPI.createOrder(
  items: { id: string; quantity: number }[],
  delivery_time?: string,
  payment_method?: 'bkash' | 'bank' | 'cash',
  transaction_id?: string
)
```

### Order Type Updated

```typescript
interface Order {
  // ... existing fields
  payment_method?: 'bkash' | 'bank' | 'cash';
  payment_status?: 'pending' | 'completed' | 'failed';
  transaction_id?: string;
}
```

## Testing Payment Methods

### Test bKash Payment
1. Select bKash
2. Enter: 01712345678
3. Enter any transaction ID: TXN123456
4. Place order

### Test Bank Transfer
1. Select Bank Transfer
2. Enter any account: 9876543210
3. Enter transaction ID: BANK123456
4. Place order

### Test Cash
1. Select Cash on Pickup
2. Place order directly

## Menu Categories

### Main Course (৳80-250)
- Chicken Biryani - ৳180
- Beef Kacchi - ৳220
- Mutton Rezala - ৳250
- Fish Curry with Rice - ৳150
- Chicken Roast - ৳200
- Vegetable Khichuri - ৳80

### Fast Food (৳60-350)
- Chicken Burger - ৳120
- Beef Burger - ৳140
- Chicken Pizza (Medium) - ৳350
- French Fries - ৳60
- Chicken Wings (6pcs) - ৳180
- Hot Dog - ৳90

### Snacks (৳25-50)
- Samosa (2pcs) - ৳30
- Spring Roll (2pcs) - ৳40
- Singara (2pcs) - ৳25
- Chicken Patties - ৳35
- Vegetable Pakora - ৳50

### Beverages (৳15-60)
- Coca Cola / Pepsi - ৳30
- Mango Juice - ৳50
- Lemonade - ৳40
- Lassi - ৳60
- Tea - ৳15
- Coffee - ৳25

### Desserts (৳40-80)
- Rasgulla (2pcs) - ৳40
- Gulab Jamun (2pcs) - ৳45
- Chocolate Cake Slice - ৳80
- Ice Cream Cup - ৳60
- Firni - ৳50

## Troubleshooting

### Menu not showing?
```powershell
# Check stock service
docker logs cafeteria-system-stock-service-1

# Re-seed menu
./seed-menu.ps1
```

### Payment validation failing?
- bKash number must be 11 digits starting with 01
- Transaction ID is required for bKash and Bank
- Cash payment requires no additional fields

### Order not creating?
- Check order-gateway logs
- Verify stock service is running
- Ensure items have sufficient quantity
