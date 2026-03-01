const { pool } = require('../config/database');
const logger = require('../utils/logger');

/**
 * GET /menu
 * Get all menu items
 */
const getAllMenuItems = async (req, res, next) => {
  try {
    const { category, available } = req.query;
    
    let query = `SELECT 
      item_id as id,
      item_name as name,
      price,
      category,
      description,
      image,
      quantity,
      CASE WHEN quantity > 0 THEN true ELSE false END as is_available
    FROM inventory WHERE 1=1`;
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    
    if (available !== undefined) {
      const isAvailable = available === 'true';
      query += ` AND quantity ${isAvailable ? '>' : '<='} 0`;
    }
    
    query += ' ORDER BY category, item_name';
    
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
      `SELECT 
        item_id as id,
        item_name as name,
        price,
        category,
        description,
        image,
        quantity,
        CASE WHEN quantity > 0 THEN true ELSE false END as is_available
      FROM inventory WHERE item_id = $1`,
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

    // Generate item_id
    const itemIdResult = await pool.query(
      'SELECT COALESCE(MAX(CAST(SUBSTRING(item_id FROM 6) AS INTEGER)), 0) + 1 as next_id FROM inventory'
    );
    const nextId = itemIdResult.rows[0].next_id;
    const itemId = `item-${String(nextId).padStart(3, '0')}`;

    const result = await pool.query(
      `INSERT INTO inventory (item_id, item_name, price, category, quantity, image, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING item_id as id, item_name as name, price, category, quantity, image, description`,
      [
        itemId,
        name,
        price,
        category,
        quantity,
        image || '🍽️',
        description || null,
      ]
    );

    logger.info(`Menu item created: ${name} (ID: ${itemId})`);

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
      'SELECT * FROM inventory WHERE item_id = $1',
      [id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found',
      });
    }

    const result = await pool.query(
      `UPDATE inventory
       SET item_name = COALESCE($1, item_name),
           price = COALESCE($2, price),
           category = COALESCE($3, category),
           quantity = COALESCE($4, quantity),
           image = COALESCE($5, image),
           description = COALESCE($6, description),
           updated_at = NOW()
       WHERE item_id = $7
       RETURNING item_id as id, item_name as name, price, category, quantity, image, description`,
      [name, price, category, quantity, image, description, id]
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
      'DELETE FROM inventory WHERE item_id = $1 RETURNING item_id as id, item_name as name',
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
      `UPDATE inventory
       SET quantity = CASE WHEN quantity > 0 THEN 0 ELSE 100 END,
           updated_at = NOW()
       WHERE item_id = $1
       RETURNING item_id as id, item_name as name, quantity`,
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
        result.rows[0].quantity > 0 ? 'Available' : 'Unavailable'
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
