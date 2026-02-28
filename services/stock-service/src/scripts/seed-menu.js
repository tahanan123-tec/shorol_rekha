require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://inventory_user:inventory_pass@localhost:5432/inventory_db',
});

const menuItems = [
  // Main Dishes
  { name: 'Chicken Biryani', price: 180, category: 'Main Course', quantity: 50, image: '🍛' },
  { name: 'Beef Kacchi', price: 220, category: 'Main Course', quantity: 30, image: '🍲' },
  { name: 'Mutton Rezala', price: 250, category: 'Main Course', quantity: 25, image: '🍖' },
  { name: 'Fish Curry with Rice', price: 150, category: 'Main Course', quantity: 40, image: '🐟' },
  { name: 'Chicken Roast', price: 200, category: 'Main Course', quantity: 35, image: '🍗' },
  { name: 'Vegetable Khichuri', price: 80, category: 'Main Course', quantity: 60, image: '🥘' },
  
  // Fast Food
  { name: 'Chicken Burger', price: 120, category: 'Fast Food', quantity: 45, image: '🍔' },
  { name: 'Beef Burger', price: 140, category: 'Fast Food', quantity: 40, image: '🍔' },
  { name: 'Chicken Pizza (Medium)', price: 350, category: 'Fast Food', quantity: 20, image: '🍕' },
  { name: 'French Fries', price: 60, category: 'Fast Food', quantity: 80, image: '🍟' },
  { name: 'Chicken Wings (6pcs)', price: 180, category: 'Fast Food', quantity: 35, image: '🍗' },
  { name: 'Hot Dog', price: 90, category: 'Fast Food', quantity: 50, image: '🌭' },
  
  // Snacks
  { name: 'Samosa (2pcs)', price: 30, category: 'Snacks', quantity: 100, image: '🥟' },
  { name: 'Spring Roll (2pcs)', price: 40, category: 'Snacks', quantity: 80, image: '🥢' },
  { name: 'Singara (2pcs)', price: 25, category: 'Snacks', quantity: 100, image: '🥟' },
  { name: 'Chicken Patties', price: 35, category: 'Snacks', quantity: 70, image: '🥐' },
  { name: 'Vegetable Pakora', price: 50, category: 'Snacks', quantity: 60, image: '🥘' },
  
  // Beverages
  { name: 'Coca Cola', price: 30, category: 'Beverages', quantity: 150, image: '🥤' },
  { name: 'Pepsi', price: 30, category: 'Beverages', quantity: 150, image: '🥤' },
  { name: 'Mango Juice', price: 50, category: 'Beverages', quantity: 80, image: '🥭' },
  { name: 'Lemonade', price: 40, category: 'Beverages', quantity: 100, image: '🍋' },
  { name: 'Lassi', price: 60, category: 'Beverages', quantity: 70, image: '🥛' },
  { name: 'Tea', price: 15, category: 'Beverages', quantity: 200, image: '☕' },
  { name: 'Coffee', price: 25, category: 'Beverages', quantity: 150, image: '☕' },
  
  // Desserts
  { name: 'Rasgulla (2pcs)', price: 40, category: 'Desserts', quantity: 60, image: '🍮' },
  { name: 'Gulab Jamun (2pcs)', price: 45, category: 'Desserts', quantity: 60, image: '🍮' },
  { name: 'Chocolate Cake Slice', price: 80, category: 'Desserts', quantity: 30, image: '🍰' },
  { name: 'Ice Cream Cup', price: 60, category: 'Desserts', quantity: 50, image: '🍨' },
  { name: 'Firni', price: 50, category: 'Desserts', quantity: 40, image: '🍮' },
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
