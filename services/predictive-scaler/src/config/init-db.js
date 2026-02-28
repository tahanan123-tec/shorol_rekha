const { pool } = require('./database');
const logger = require('../utils/logger');

const createTables = async () => {
  try {
    // Create metrics_history table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrics_history (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        request_count INTEGER DEFAULT 0,
        cpu_usage DECIMAL(5,2) DEFAULT 0,
        memory_usage DECIMAL(5,2) DEFAULT 0,
        service_name VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_metrics_timestamp 
      ON metrics_history(timestamp DESC);
    `);

    logger.info('Database tables initialized successfully');
    return true;
  } catch (error) {
    logger.error('Error initializing database tables', { error: error.message });
    return false;
  }
};

module.exports = { createTables };
