require('dotenv').config();
const { pool } = require('../config/database');
const passwordService = require('../services/password.service');
const logger = require('../utils/logger');

const seedTestUser = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Check if test user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE student_id = $1',
      ['test123']
    );

    if (existingUser.rows.length > 0) {
      console.log('Test user already exists');
      await client.query('ROLLBACK');
      return;
    }

    // Create test user: test123 / Test@1234
    const password_hash = await passwordService.hashPassword('Test@1234');

    await client.query(
      `INSERT INTO users (student_id, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, $5)`,
      ['test123', 'test@example.com', password_hash, 'Test User', true]
    );

    await client.query('COMMIT');
    console.log('Test user created successfully');
    console.log('Student ID: test123');
    console.log('Password: Test@1234');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed test user:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

seedTestUser()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });
