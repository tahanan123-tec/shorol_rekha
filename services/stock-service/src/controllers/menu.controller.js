const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /menu
 * Get all menu items
 */
const getAllMenuItems = async (req, res, next) => {
  try {
    const { category, available } = req.query;
    
    let query = 'SELECT * FROM stock_items WHERE 1=1';
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    if (available !== undefined) {
      params.push(available === 'true');
      query += ` AND is_available = $${params.length}`;
    }
    
    query += ' ORDER BY category, name';
    
    const result = await pool.query(query, params);

    res.status(200).json({
      success: true,
      data: {
        items: result.rows,
        count: result.rows.length,
      },
    });
  } catch (error) {
    logger.error('Error fetching menu items:', error);
    next(error);
  }
};

/**
 * GET /menu/:id
 * Get a single menu item
 */
const getMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM stock_items WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error fetching menu item:', error);
    next(error);
  }
};

/**
 * POST /menu
 * Create a new menu item
 */
const createMenuItem = async (req, res, next) => {
  try {
    const {
      name,
      price,
      category,
      quantity,
      image,
      description,
      is_available,
    } = req.body;

    // Validation
    if (!name || !price || !category || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Name, price, category, and quantity are required',
      });
    }

    const result = await pool.query(
      `INSERT INTO stock_items (name, price, category, quantity, image, description, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        name,
        price,
        category,
        quantity,
        image || '🍽️',
        description || null,
        is_available !== undefined ? is_available : true,
      ]
    );

    logger.info(`Menu item created: ${name} (ID: ${result.rows[0].id})`);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error creating menu item:', error);
    next(error);
  }
};

/**
 * PUT /menu/:id
 * Update a menu item
 */
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      category,
      quantity,
      image,
      description,
      is_available,
    } = req.body;

    // Check if item exists
    const checkResult = await pool.query(
      'SELECT * FROM stock_items WHERE id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    const result = await pool.query(
      `UPDATE stock_items
       SET name = COALESCE($1, name),
           price = COALESCE($2, price),
           category = COALESCE($3, category),
           quantity = COALESCE($4, quantity),
           image = COALESCE($5, image),
           description = COALESCE($6, description),
           is_available = COALESCE($7, is_available),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [name, price, category, quantity, image, description, is_available, id]
    );

    logger.info(`Menu item updated: ${result.rows[0].name} (ID: ${id})`);

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error updating menu item:', error);
    next(error);
  }
};

/**
 * DELETE /menu/:id
 * Delete a menu item
 */
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM stock_items WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    logger.info(`Menu item deleted: ${result.rows[0].name} (ID: ${id})`);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error deleting menu item:', error);
    next(error);
  }
};

/**
 * PATCH /menu/:id/availability
 * Toggle menu item availability
 */
const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE stock_items
       SET is_available = NOT is_available,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    logger.info(
      `Menu item availability toggled: ${result.rows[0].name} (ID: ${id}) - ${
        result.rows[0].is_available ? 'Available' : 'Unavailable'
      }`
    );

    res.status(200).json({
      success: true,
      message: 'Menu item availability updated',
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Error toggling menu item availability:', error);
    next(error);
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
};
