const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const stockService = require('./stock.service');
const queueService = require('./queue.service');
const cacheService = require('./cache.service');
const logger = require('../utils/logger');
const { orderCreatedTotal, orderProcessingDuration } = require('../utils/metrics');

/**
 * Create a new order
 */
const createOrder = async (user, orderData, idempotencyKey) => {
  const end = orderProcessingDuration.startTimer();
  const client = await pool.connect();
  let stockReserved = false;
  let dbTransactionStarted = false;
  const orderId = `ORD-${Date.now()}-${uuidv4().substring(0, 8)}`;
  
  try {
    // Validation: Ensure items array is non-empty
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      throw {
        statusCode: 400,
        message: 'Order must contain at least one item',
      };
    }

    logger.info('Creating order', { orderId, userId: user.user_id, items: orderData.items.length });

    // Step 1: Check stock availability (with cache)
    const stockCheck = await stockService.checkStock(orderData.items);
    
    if (!stockCheck.available) {
      orderCreatedTotal.inc({ status: 'stock_unavailable' });
      
      logger.warn('Order rejected - insufficient stock', { 
        orderId, 
        unavailable: stockCheck.unavailable 
      });
      
      throw {
        statusCode: 409,
        message: 'Insufficient stock',
        details: stockCheck.unavailable,
      };
    }

    // Step 2: Reserve stock
    try {
      await stockService.reserveStock(orderId, orderData.items);
      stockReserved = true;
      logger.info('Stock reserved successfully', { orderId, items: orderData.items.length });
    } catch (error) {
      orderCreatedTotal.inc({ status: 'reservation_failed' });
      
      logger.error('Stock reservation failed', { orderId, error: error.message });
      
      throw {
        statusCode: 503,
        message: 'Failed to reserve stock. Please try again.',
      };
    }

    // Step 3: Fetch full item details and calculate total amount
    let totalAmount = 0;
    let enrichedItems = [];
    try {
      // Fetch full menu to get item details (name, price, etc.)
      const menuResponse = await stockService.getMenuItems();
      
      // Create a map of menu items by ID for quick lookup
      const menuMap = {};
      if (menuResponse && menuResponse.length > 0) {
        menuResponse.forEach(menuItem => {
          menuMap[String(menuItem.id)] = menuItem;
        });
      }
      
      // Enrich order items with full details
      enrichedItems = orderData.items.map(item => {
        const menuItem = menuMap[String(item.id)];
        if (!menuItem) {
          logger.warn('Menu item not found', { itemId: item.id });
          return {
            id: item.id,
            name: `Item ${item.id}`,
            quantity: item.quantity,
            price: 0,
          };
        }
        
        return {
          id: menuItem.id,
          name: menuItem.name,
          quantity: item.quantity,
          price: parseFloat(menuItem.price),
          category: menuItem.category,
          image_url: menuItem.image_url,
        };
      });
      
      // Calculate total
      totalAmount = enrichedItems.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0);
      
      logger.info('Order total calculated', { orderId, totalAmount, items: enrichedItems.length });
    } catch (error) {
      logger.error('Failed to fetch menu items, using minimal data', { orderId, error: error.message });
      // Fallback: use minimal item data
      enrichedItems = orderData.items.map(item => ({
        id: item.id,
        name: `Item ${item.id}`,
        quantity: item.quantity,
        price: 10.00,
      }));
      totalAmount = enrichedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // Step 4: Save order to database
    try {
      await client.query('BEGIN');
      dbTransactionStarted = true;

      const insertResult = await client.query(
        `INSERT INTO orders (
          order_id, user_id, student_id, items, total_amount, 
          status, delivery_time, idempotency_key, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *`,
        [
          orderId,
          user.user_id,
          user.student_id,
          JSON.stringify(enrichedItems),
          totalAmount,
          'PENDING',
          orderData.delivery_time || null,
          idempotencyKey,
        ]
      );

      await client.query('COMMIT');
      dbTransactionStarted = false;

      const order = insertResult.rows[0];

      // Step 5: Publish to Kitchen Queue
      try {
        await queueService.publishOrderCreated({
          order_id: order.order_id,
          user_id: order.user_id,
          student_id: order.student_id,
          items: order.items,
          total_amount: parseFloat(order.total_amount),
          delivery_time: order.delivery_time,
          created_at: order.created_at,
        });
      } catch (error) {
        logger.error('Failed to publish order to queue', { orderId, error: error.message });
        // Order is saved, but queue publish failed - will be retried by background job
      }

      // Step 6: Cache the order
      await cacheService.setOrder(orderId, {
        order_id: order.order_id,
        status: order.status,
        items: order.items,
        total_amount: parseFloat(order.total_amount),
        created_at: order.created_at,
      });

      orderCreatedTotal.inc({ status: 'success' });
      
      logger.info('Order created successfully', { 
        orderId, 
        userId: user.user_id,
        totalAmount 
      });

      // Calculate ETA (mock - 5 minutes from now)
      const eta = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      return {
        order_id: order.order_id,
        status: order.status,
        items: order.items,
        total_amount: parseFloat(order.total_amount),
        delivery_time: order.delivery_time,
        eta,
        created_at: order.created_at,
      };
    } catch (dbError) {
      // Database transaction failed - rollback if started
      if (dbTransactionStarted) {
        try {
          await client.query('ROLLBACK');
          logger.info('Database transaction rolled back', { orderId });
        } catch (rollbackError) {
          logger.error('Failed to rollback database transaction', { 
            orderId, 
            error: rollbackError.message 
          });
        }
      }
      
      throw dbError;
    }
  } catch (error) {
    // Compensating transaction: Release reserved stock if reservation succeeded
    if (stockReserved) {
      logger.warn('Order creation failed after stock reservation, releasing stock', { 
        orderId, 
        error: error.message 
      });
      
      try {
        const releaseResult = await stockService.releaseStock(orderId, orderData.items);
        if (releaseResult.success) {
          logger.info('Stock released successfully (compensating transaction)', { orderId });
        } else {
          logger.error('Failed to release stock (compensating transaction)', { 
            orderId, 
            error: releaseResult.error 
          });
        }
      } catch (releaseError) {
        logger.error('Exception during stock release (compensating transaction)', { 
          orderId, 
          error: releaseError.message 
        });
      }
    }
    
    // Rollback database transaction if it was started
    if (dbTransactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Failed to rollback transaction', { 
          orderId, 
          error: rollbackError.message 
        });
      }
    }
    
    if (error.statusCode) {
      throw error;
    }

    orderCreatedTotal.inc({ status: 'error' });
    logger.error('Order creation failed', { error: error.message, userId: user.user_id, orderId });
    throw error;
  } finally {
    client.release();
    end();
  }
};

/**
 * Get order status
 */
const getOrderStatus = async (orderId, userId) => {
  try {
    // Check cache first
    const cached = await cacheService.getOrder(orderId);
    
    if (cached) {
      logger.debug('Order status from cache', { orderId });
      return cached;
    }

    // Query database
    const result = await pool.query(
      'SELECT order_id, status, items, total_amount, delivery_time, created_at, updated_at FROM orders WHERE order_id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      throw {
        statusCode: 404,
        message: 'Order not found',
      };
    }

    const order = result.rows[0];

    // Parse items if it's a JSON string
    const parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;

    // Cache the result
    const orderData = {
      order_id: order.order_id,
      status: order.status,
      items: parsedItems,
      total_amount: parseFloat(order.total_amount),
      delivery_time: order.delivery_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };

    await cacheService.setOrder(orderId, orderData);

    return orderData;
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    
    logger.error('Failed to get order status', { orderId, error: error.message });
    throw error;
  }
};

/**
 * Get user orders
 */
const getUserOrders = async (userId, limit = 20, offset = 0) => {
  try {
    const result = await pool.query(
      `SELECT order_id, status, items, total_amount, delivery_time, created_at 
       FROM orders 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(order => ({
      order_id: order.order_id,
      status: order.status,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      total_amount: parseFloat(order.total_amount),
      delivery_time: order.delivery_time,
      created_at: order.created_at,
    }));
  } catch (error) {
    logger.error('Failed to get user orders', { userId, error: error.message });
    throw error;
  }
};

/**
 * Get all orders (Admin)
 */
const getAllOrders = async (limit = 100, offset = 0, status = null) => {
  try {
    let query = `SELECT o.id, o.order_id, o.user_id, o.status, o.items, o.total_amount, o.delivery_time, o.created_at, o.updated_at
       FROM orders o
       WHERE 1=1`;
    
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }
    
    params.push(limit, offset);
    query += ` ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    
    const result = await pool.query(query, params);

    return result.rows.map(order => ({
      id: order.id,
      order_id: order.order_id,
      user_id: order.user_id,
      status: order.status,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      total_amount: parseFloat(order.total_amount),
      delivery_time: order.delivery_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
    }));
  } catch (error) {
    logger.error('Failed to get all orders', { error: error.message });
    throw error;
  }
};

/**
 * Update order status (Admin)
 */
const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const result = await pool.query(
      `UPDATE orders 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING id, order_id, user_id, status, items, total_amount, delivery_time, created_at, updated_at`,
      [newStatus, orderId]
    );

    if (result.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = result.rows[0];
    logger.info('Order status updated', { orderId, newStatus });

    return {
      id: order.id,
      order_id: order.order_id,
      user_id: order.user_id,
      status: order.status,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      total_amount: parseFloat(order.total_amount),
      delivery_time: order.delivery_time,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };
  } catch (error) {
    logger.error('Failed to update order status', { orderId, error: error.message });
    throw error;
  }
};

module.exports = {
  createOrder,
  getOrderStatus,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
};
