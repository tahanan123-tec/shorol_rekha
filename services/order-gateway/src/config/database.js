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
    
    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        student_id VARCHAR(50) NOT NULL,
        items JSONB NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'PENDING',
        delivery_time VARCHAR(10),
        idempotency_key VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key ON orders(idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `);

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
