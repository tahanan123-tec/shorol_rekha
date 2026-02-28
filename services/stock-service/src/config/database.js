const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 100, // Increased for high load (200+ req/s)
  min: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  // Enable statement timeout to prevent long-running queries
  statement_timeout: 10000, // 10 seconds
});

pool.on('error', (err) => {
  logger.error('Unexpected database error', { error: err.message });
});

pool.on('connect', () => {
  logger.info('Database connection established');
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful');
    return true;
  } catch (error) {
    logger.error('Database connection test failed', { error: error.message });
    return false;
  }
};

const initializeSchema = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Inventory table with version column for optimistic locking
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory (
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
      )
    `);

    // Stock transactions table for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(50) UNIQUE NOT NULL,
        item_id VARCHAR(50) NOT NULL,
        order_id VARCHAR(50),
        transaction_type VARCHAR(20) NOT NULL,
        quantity_change INTEGER NOT NULL,
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        version_before INTEGER NOT NULL,
        version_after INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inventory_item_id ON inventory(item_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);
      CREATE INDEX IF NOT EXISTS idx_stock_transactions_item_id ON stock_transactions(item_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transactions_order_id ON stock_transactions(order_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transactions_transaction_id ON stock_transactions(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_stock_transactions_created_at ON stock_transactions(created_at);
    `);

    // Insert sample data if table is empty
    const countResult = await client.query('SELECT COUNT(*) FROM inventory');
    if (parseInt(countResult.rows[0].count, 10) === 0) {
      logger.info('Seeding inventory with sample data...');
      
      await client.query(`
        INSERT INTO inventory (item_id, item_name, quantity, price, category, description, image) VALUES
        ('item-001', 'Chicken Biryani', 100, 12.99, 'Main Course', 'Aromatic basmati rice cooked with tender chicken and traditional spices', '🍛'),
        ('item-002', 'Beef Kebab', 80, 10.99, 'Main Course', 'Juicy grilled beef kebabs marinated in special spices', '🍢'),
        ('item-003', 'Vegetable Samosa', 150, 3.99, 'Snacks', 'Crispy pastry filled with spiced vegetables', '🥟'),
        ('item-004', 'Mango Lassi', 200, 4.99, 'Beverages', 'Refreshing yogurt drink blended with sweet mangoes', '🥭'),
        ('item-005', 'Naan Bread', 120, 2.99, 'Breads', 'Soft and fluffy traditional Indian bread', '🫓'),
        ('item-006', 'Butter Chicken', 90, 13.99, 'Main Course', 'Creamy tomato-based curry with tender chicken pieces', '🍛'),
        ('item-007', 'Dal Makhani', 100, 9.99, 'Main Course', 'Rich and creamy black lentils slow-cooked with butter', '🍲'),
        ('item-008', 'Gulab Jamun', 150, 5.99, 'Desserts', 'Sweet milk-solid dumplings soaked in rose-flavored syrup', '🍮'),
        ('item-009', 'Tandoori Chicken', 70, 14.99, 'Main Course', 'Chicken marinated in yogurt and spices, cooked in tandoor', '🍗'),
        ('item-010', 'Paneer Tikka', 85, 11.99, 'Main Course', 'Grilled cottage cheese cubes with aromatic spices', '🧀')
      `);
      
      logger.info('Sample data seeded successfully');
    }

    await client.query('COMMIT');
    logger.info('Database schema initialized successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to initialize database schema', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  testConnection,
  initializeSchema,
};
