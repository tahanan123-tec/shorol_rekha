require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://inventory_user:inventory_pass@localhost:5432/inventory_db',
});

const menuItems = [
  // Main Dishes
  { name: 'Chicken Biryani', price: 180, category: 'Main Course', quantity: 50, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop' },
  { name: 'Beef Kacchi', price: 220, category: 'Main Course', quantity: 30, image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?w=400&h=300&fit=crop' },
  { name: 'Mutton Rezala', price: 250, category: 'Main Course', quantity: 25, image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&h=300&fit=crop' },
  { name: 'Fish Curry with Rice', price: 150, category: 'Main Course', quantity: 40, image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=400&h=300&fit=crop' },
  { name: 'Chicken Roast', price: 200, category: 'Main Course', quantity: 35, image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop' },
  { name: 'Vegetable Khichuri', price: 80, category: 'Main Course', quantity: 60, image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop' },
  
  // Fast Food
  { name: 'Chicken Burger', price: 120, category: 'Fast Food', quantity: 45, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop' },
  { name: 'Beef Burger', price: 140, category: 'Fast Food', quantity: 40, image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop' },
  { name: 'Chicken Pizza (Medium)', price: 350, category: 'Fast Food', quantity: 20, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop' },
  { name: 'French Fries', price: 60, category: 'Fast Food', quantity: 80, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop' },
  { name: 'Chicken Wings (6pcs)', price: 180, category: 'Fast Food', quantity: 35, image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=400&h=300&fit=crop' },
  { name: 'Hot Dog', price: 90, category: 'Fast Food', quantity: 50, image: 'https://images.unsplash.com/photo-1612392062798-2dbaa2c2c993?w=400&h=300&fit=crop' },
  
  // Snacks
  { name: 'Samosa (2pcs)', price: 30, category: 'Snacks', quantity: 100, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop' },
  { name: 'Spring Roll (2pcs)', price: 40, category: 'Snacks', quantity: 80, image: 'https://images.unsplash.com/photo-1541529086526-db283c563270?w=400&h=300&fit=crop' },
  { name: 'Singara (2pcs)', price: 25, category: 'Snacks', quantity: 100, image: 'https://images.unsplash.com/photo-1630409346730-1dbb6c8c0e1d?w=400&h=300&fit=crop' },
  { name: 'Chicken Patties', price: 35, category: 'Snacks', quantity: 70, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop' },
  { name: 'Vegetable Pakora', price: 50, category: 'Snacks', quantity: 60, image: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=400&h=300&fit=crop' },
  
  // Beverages
  { name: 'Coca Cola', price: 30, category: 'Beverages', quantity: 150, image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop' },
  { name: 'Pepsi', price: 30, category: 'Beverages', quantity: 150, image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop' },
  { name: 'Mango Juice', price: 50, category: 'Beverages', quantity: 80, image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400&h=300&fit=crop' },
  { name: 'Lemonade', price: 40, category: 'Beverages', quantity: 100, image: 'https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9d?w=400&h=300&fit=crop' },
  { name: 'Lassi', price: 60, category: 'Beverages', quantity: 70, image: 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=300&fit=crop' },
  { name: 'Tea', price: 15, category: 'Beverages', quantity: 200, image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=300&fit=crop' },
  { name: 'Coffee', price: 25, category: 'Beverages', quantity: 150, image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop' },
  
  // Desserts
  { name: 'Rasgulla (2pcs)', price: 40, category: 'Desserts', quantity: 60, image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400&h=300&fit=crop' },
  { name: 'Gulab Jamun (2pcs)', price: 45, category: 'Desserts', quantity: 60, image: 'https://images.unsplash.com/photo-1589119908995-c6c8f7d7e3b3?w=400&h=300&fit=crop' },
  { name: 'Chocolate Cake Slice', price: 80, category: 'Desserts', quantity: 30, image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=300&fit=crop' },
  { name: 'Ice Cream Cup', price: 60, category: 'Desserts', quantity: 50, image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400&h=300&fit=crop' },
  { name: 'Firni', price: 50, category: 'Desserts', quantity: 40, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop' },
];

const seedMenu = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create stock_items table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_items (
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
      )
    `);

    // Clear existing items
    await client.query('DELETE FROM stock_items');

    // Insert menu items
    for (const item of menuItems) {
      await client.query(
        `INSERT INTO stock_items (name, price, category, quantity, image, is_available)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [item.name, item.price, item.category, item.quantity, item.image, true]
      );
    }

    await client.query('COMMIT');
    console.log(`✓ Successfully seeded ${menuItems.length} menu items`);
    console.log('\nMenu Categories:');
    console.log('- Main Course (6 items)');
    console.log('- Fast Food (6 items)');
    console.log('- Snacks (5 items)');
    console.log('- Beverages (7 items)');
    console.log('- Desserts (5 items)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed menu:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedMenu()
  .then(() => {
    console.log('\n✓ Menu seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Menu seeding failed:', error);
    process.exit(1);
  });
