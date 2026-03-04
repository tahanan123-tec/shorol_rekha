const { v4: uuidv4 } = require('uuid');
const { pool } = require('../config/database');
const queueService = require('./queue.service');
const logger = require('../utils/logger');
const {
  stockReservationTotal,
  stockReservationDuration,
  stockLevelGauge,
  optimisticLockRetryTotal,
  optimisticLockFailureTotal,
  stockTransactionTotal,
} = require('../utils/metrics');

const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 50;

/**
 * Get stock information for an item
 */
const getStock = async (itemId) => {
  try {
    const result = await pool.query(
      `SELECT item_id, item_name, quantity, reserved_quantity, version, price, updated_at
       FROM inventory
       WHERE item_id = $1`,
      [itemId]
    );

    if (result.rows.length === 0) {
      throw {
        statusCode: 404,
        message: 'Item not found',
      };
    }

    const stock = result.rows[0];

    // Update gauge metric
    stockLevelGauge.set(
      { item_id: stock.item_id, item_name: stock.item_name },
      stock.quantity
    );

    return {
      item_id: stock.item_id,
      item_name: stock.item_name,
      quantity: stock.quantity,
      available_quantity: stock.quantity - stock.reserved_quantity,
      reserved_quantity: stock.reserved_quantity,
      price: parseFloat(stock.price),
      version: stock.version,
      updated_at: stock.updated_at,
    };
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    logger.error('Failed to get stock', { itemId, error: error.message });
    throw error;
  }
};

/**
 * Get all stock items
 */
const getAllStock = async () => {
  try {
    const result = await pool.query(
      `SELECT item_id, item_name, quantity, reserved_quantity, version, price, category, description, image, updated_at
       FROM inventory
       ORDER BY item_name`
    );

    return result.rows.map(stock => ({
      item_id: stock.item_id,
      item_name: stock.item_name,
      quantity: stock.quantity,
      available_quantity: stock.quantity - stock.reserved_quantity,
      reserved_quantity: stock.reserved_quantity,
      price: parseFloat(stock.price),
      category: stock.category,
      description: stock.description,
      image: stock.image,
      version: stock.version,
      updated_at: stock.updated_at,
    }));
  } catch (error) {
    logger.error('Failed to get all stock', { error: error.message });
    throw error;
  }
};
/**
 * Get admin inventory overview with available stock
 * Returns real-time available quantities for admin dashboard
 */
const getAdminInventory = async () => {
  const startTime = Date.now();

  try {
    logger.info('Fetching admin inventory overview', { service: 'stock-service' });

    const result = await pool.query(
      `SELECT
        item_id as id,
        item_name as name,
        category,
        quantity,
        reserved_quantity,
        (quantity - reserved_quantity) as available_quantity,
        price,
        image,
        updated_at
       FROM inventory
       ORDER BY
         CASE
           WHEN (quantity - reserved_quantity) <= 10 THEN 0
           ELSE 1
         END,
         (quantity - reserved_quantity) ASC,
         item_name ASC`
    );

    const duration = Date.now() - startTime;

    logger.info('Admin inventory fetched successfully', {
      service: 'stock-service',
      itemCount: result.rows.length,
      durationMs: duration
    });

    // Calculate total metrics
    const totalItems = result.rows.length;
    const totalAvailable = result.rows.reduce((sum, item) => sum + parseInt(item.available_quantity), 0);
    const lowStockItems = result.rows.filter(item => parseInt(item.available_quantity) <= 10).length;

    return {
      items: result.rows.map(item => ({
        id: parseInt(item.id.replace('item-', '')),
        name: item.name,
        category: item.category,
        available_quantity: parseInt(item.available_quantity),
        reserved_quantity: parseInt(item.reserved_quantity),
        total_quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
        image: item.image,
        updated_at: item.updated_at,
        low_stock: parseInt(item.available_quantity) <= 10
      })),
      summary: {
        total_items: totalItems,
        total_available: totalAvailable,
        low_stock_count: lowStockItems
      }
    };
  } catch (error) {
    logger.error('Failed to fetch admin inventory', {
      service: 'stock-service',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Check stock availability for multiple items
 */
const checkStock = async (items) => {
  try {
    const itemIds = items.map(item => item.id);
    
    const result = await pool.query(
      `SELECT item_id, item_name, quantity, reserved_quantity
       FROM inventory
       WHERE item_id = ANY($1)`,
      [itemIds]
    );

    const stockMap = new Map(
      result.rows.map(row => [
        row.item_id,
        {
          available: row.quantity - row.reserved_quantity,
          name: row.item_name,
        },
      ])
    );

    const unavailable = [];
    let allAvailable = true;

    for (const item of items) {
      const stock = stockMap.get(item.id);
      
      if (!stock) {
        unavailable.push({
          id: item.id,
          available: 0,
          requested: item.quantity,
          reason: 'Item not found',
        });
        allAvailable = false;
      } else if (stock.available < item.quantity) {
        unavailable.push({
          id: item.id,
          available: stock.available,
          requested: item.quantity,
          reason: 'Insufficient stock',
        });
        allAvailable = false;
      }
    }

    return {
      available: allAvailable,
      items: result.rows.map(row => ({
        id: row.item_id,
        name: row.item_name,
        available_quantity: row.quantity - row.reserved_quantity,
      })),
      unavailable: unavailable.length > 0 ? unavailable : undefined,
    };
  } catch (error) {
    logger.error('Failed to check stock', { error: error.message });
    throw error;
  }
};

/**
 * Reserve stock with optimistic locking
 * Prevents overselling under high concurrency
 */
const reserveStock = async (orderId, items, attempt = 1) => {
  const end = stockReservationDuration.startTimer();
  const client = await pool.connect();
  // Generate a unique transaction ID for each attempt - UUID is already unique
  const transactionId = uuidv4();

  try {
    await client.query('BEGIN');

    logger.info('Attempting stock reservation', {
      orderId,
      attempt,
      items: items.length,
      transactionId,
    });

    // Fetch all items in a single query for better performance
    const itemIds = items.map(item => item.id);
    const selectResult = await client.query(
      `SELECT id, item_id, item_name, quantity, reserved_quantity, version, price
       FROM inventory
       WHERE item_id = ANY($1)
       FOR UPDATE`,
      [itemIds]
    );

    // Create a map for quick lookup
    const stockMap = new Map(
      selectResult.rows.map(row => [row.item_id, row])
    );

    // Validate all items exist and have sufficient stock
    const unavailableItems = [];
    for (const item of items) {
      const currentStock = stockMap.get(item.id);
      
      if (!currentStock) {
        throw {
          statusCode: 404,
          message: `Item ${item.id} not found`,
        };
      }

      const availableQuantity = currentStock.quantity - currentStock.reserved_quantity;
      if (availableQuantity < item.quantity) {
        unavailableItems.push({
          item_id: item.id,
          available: availableQuantity,
          requested: item.quantity,
        });
      }
    }

    // If any item is unavailable, fail the entire order
    if (unavailableItems.length > 0) {
      throw {
        statusCode: 409,
        message: 'Insufficient stock for one or more items',
        details: unavailableItems,
      };
    }

    // Process all updates and inserts
    const reservations = [];
    
    for (const item of items) {
      const currentStock = stockMap.get(item.id);

      // Update with optimistic locking (version check)
      const updateResult = await client.query(
        `UPDATE inventory
         SET reserved_quantity = reserved_quantity + $1,
             version = version + 1,
             updated_at = NOW()
         WHERE item_id = $2 AND version = $3
         RETURNING id, item_id, item_name, quantity, reserved_quantity, version`,
        [item.quantity, item.id, currentStock.version]
      );

      // Check if update succeeded (optimistic lock check)
      if (updateResult.rows.length === 0) {
        // Version mismatch - concurrent modification detected
        logger.warn('Optimistic lock conflict detected', {
          itemId: item.id,
          expectedVersion: currentStock.version,
          attempt,
        });

        optimisticLockRetryTotal.inc({ operation: 'reserve' });

        // Retry with exponential backoff
        if (attempt < MAX_RETRY_ATTEMPTS) {
          await client.query('ROLLBACK');
          client.release();
          
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          return reserveStock(orderId, items, attempt + 1);
        } else {
          optimisticLockFailureTotal.inc({ operation: 'reserve' });
          throw {
            statusCode: 409,
            message: 'Failed to reserve stock due to high concurrency. Please retry.',
          };
        }
      }

      const updatedStock = updateResult.rows[0];

      // Record transaction in audit trail
      await client.query(
        `INSERT INTO stock_transactions (
          transaction_id, item_id, order_id, transaction_type,
          quantity_change, quantity_before, quantity_after,
          version_before, version_after, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          transactionId,
          item.id,
          orderId,
          'RESERVE',
          item.quantity,
          currentStock.reserved_quantity,
          updatedStock.reserved_quantity,
          currentStock.version,
          updatedStock.version,
          JSON.stringify({ attempt }),
        ]
      );

      reservations.push({
        item_id: updatedStock.item_id,
        item_name: updatedStock.item_name,
        quantity_reserved: item.quantity,
        available_after: updatedStock.quantity - updatedStock.reserved_quantity,
        version: updatedStock.version,
      });

      // Update gauge metric
      stockLevelGauge.set(
        { item_id: updatedStock.item_id, item_name: updatedStock.item_name },
        updatedStock.quantity - updatedStock.reserved_quantity
      );
    }

    await client.query('COMMIT');

    end({ status: 'success' });
    stockReservationTotal.inc({ status: 'success', item_id: 'all' });
    stockTransactionTotal.inc({ type: 'reserve', status: 'success' });

    logger.info('Stock reserved successfully', {
      orderId,
      attempt,
      transactionId,
      reservations: reservations.length,
    });

    // Publish events asynchronously (don't block response)
    setImmediate(async () => {
      try {
        for (const reservation of reservations) {
          await queueService.publishStockReserved({
            order_id: orderId,
            item_id: reservation.item_id,
            quantity: reservation.quantity_reserved,
          });

          // Check if stock is depleted
          if (reservation.available_after === 0) {
            await queueService.publishStockDepleted({
              item_id: reservation.item_id,
              item_name: reservation.item_name,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to publish stock events', { error: error.message });
      }
    });

    return {
      success: true,
      transaction_id: transactionId,
      reservations,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    end({ status: 'error' });
    stockReservationTotal.inc({ status: 'error', item_id: 'all' });
    stockTransactionTotal.inc({ type: 'reserve', status: 'error' });

    if (error.statusCode) {
      throw error;
    }

    logger.error('Stock reservation failed', {
      orderId,
      attempt,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Decrement stock (idempotent)
 * Used for actual stock deduction after order completion
 */
const decrementStock = async (orderId, items, transactionIdempotencyKey) => {
  const client = await pool.connect();
  const transactionId = transactionIdempotencyKey || uuidv4();

  try {
    await client.query('BEGIN');

    // Check if transaction already processed (idempotency)
    const existingTransaction = await client.query(
      'SELECT id FROM stock_transactions WHERE transaction_id = $1',
      [transactionId]
    );

    if (existingTransaction.rows.length > 0) {
      logger.info('Transaction already processed (idempotent)', { transactionId, orderId });
      await client.query('ROLLBACK');
      return {
        success: true,
        message: 'Transaction already processed',
        transaction_id: transactionId,
      };
    }

    logger.info('Decrementing stock', { orderId, transactionId, items: items.length });

    const decrements = [];

    for (const item of items) {
      const selectResult = await client.query(
        `SELECT id, item_id, item_name, quantity, reserved_quantity, version
         FROM inventory
         WHERE item_id = $1
         FOR UPDATE`,
        [item.id]
      );

      if (selectResult.rows.length === 0) {
        throw {
          statusCode: 404,
          message: `Item ${item.id} not found`,
        };
      }

      const currentStock = selectResult.rows[0];

      // Decrement both quantity and reserved_quantity
      const updateResult = await client.query(
        `UPDATE inventory
         SET quantity = quantity - $1,
             reserved_quantity = GREATEST(reserved_quantity - $1, 0),
             version = version + 1,
             updated_at = NOW()
         WHERE item_id = $2 AND version = $3
         RETURNING id, item_id, item_name, quantity, reserved_quantity, version`,
        [item.quantity, item.id, currentStock.version]
      );

      if (updateResult.rows.length === 0) {
        throw {
          statusCode: 409,
          message: 'Concurrent modification detected. Please retry.',
        };
      }

      const updatedStock = updateResult.rows[0];

      // Record transaction
      await client.query(
        `INSERT INTO stock_transactions (
          transaction_id, item_id, order_id, transaction_type,
          quantity_change, quantity_before, quantity_after,
          version_before, version_after
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          transactionId,
          item.id,
          orderId,
          'DECREMENT',
          -item.quantity,
          currentStock.quantity,
          updatedStock.quantity,
          currentStock.version,
          updatedStock.version,
        ]
      );

      decrements.push({
        item_id: updatedStock.item_id,
        item_name: updatedStock.item_name,
        quantity_decremented: item.quantity,
        quantity_after: updatedStock.quantity,
        version: updatedStock.version,
      });

      // Update gauge metric
      stockLevelGauge.set(
        { item_id: updatedStock.item_id, item_name: updatedStock.item_name },
        updatedStock.quantity
      );
    }

    await client.query('COMMIT');

    stockTransactionTotal.inc({ type: 'decrement', status: 'success' });

    logger.info('Stock decremented successfully', {
      orderId,
      transactionId,
      decrements: decrements.length,
    });

    // Publish events
    setImmediate(async () => {
      try {
        for (const decrement of decrements) {
          await queueService.publishStockUpdated({
            item_id: decrement.item_id,
            quantity: decrement.quantity_after,
            reserved_quantity: 0,
            version: decrement.version,
          });
        }
      } catch (error) {
        logger.error('Failed to publish stock update events', { error: error.message });
      }
    });

    return {
      success: true,
      transaction_id: transactionId,
      decrements,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    stockTransactionTotal.inc({ type: 'decrement', status: 'error' });

    if (error.statusCode) {
      throw error;
    }

    logger.error('Stock decrement failed', {
      orderId,
      transactionId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Release reserved stock (compensating transaction)
 * Used when order creation fails after stock reservation
 */
const releaseStock = async (orderId, items) => {
  const client = await pool.connect();
  const transactionId = uuidv4();

  try {
    await client.query('BEGIN');

    logger.info('Releasing reserved stock', {
      orderId,
      items: items.length,
      transactionId,
    });

    const releases = [];

    for (const item of items) {
      const selectResult = await client.query(
        `SELECT id, item_id, item_name, quantity, reserved_quantity, version
         FROM inventory
         WHERE item_id = $1
         FOR UPDATE`,
        [item.id]
      );

      if (selectResult.rows.length === 0) {
        logger.warn('Item not found during stock release', { itemId: item.id, orderId });
        continue; // Skip missing items
      }

      const currentStock = selectResult.rows[0];

      // Release reserved quantity (decrease reserved_quantity)
      const updateResult = await client.query(
        `UPDATE inventory
         SET reserved_quantity = GREATEST(reserved_quantity - $1, 0),
             version = version + 1,
             updated_at = NOW()
         WHERE item_id = $2
         RETURNING id, item_id, item_name, quantity, reserved_quantity, version`,
        [item.quantity, item.id]
      );

      if (updateResult.rows.length === 0) {
        logger.warn('Failed to release stock for item', { itemId: item.id, orderId });
        continue;
      }

      const updatedStock = updateResult.rows[0];

      // Record transaction
      await client.query(
        `INSERT INTO stock_transactions (
          transaction_id, item_id, order_id, transaction_type,
          quantity_change, quantity_before, quantity_after,
          version_before, version_after, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          transactionId,
          item.id,
          orderId,
          'RELEASE',
          -item.quantity,
          currentStock.reserved_quantity,
          updatedStock.reserved_quantity,
          currentStock.version,
          updatedStock.version,
          JSON.stringify({ reason: 'order_creation_failed' }),
        ]
      );

      releases.push({
        item_id: updatedStock.item_id,
        item_name: updatedStock.item_name,
        quantity_released: item.quantity,
        reserved_after: updatedStock.reserved_quantity,
        version: updatedStock.version,
      });

      // Update gauge metric
      stockLevelGauge.set(
        { item_id: updatedStock.item_id, item_name: updatedStock.item_name },
        updatedStock.quantity - updatedStock.reserved_quantity
      );
    }

    await client.query('COMMIT');

    stockTransactionTotal.inc({ type: 'release', status: 'success' });

    logger.info('Stock released successfully', {
      orderId,
      transactionId,
      releases: releases.length,
    });

    // Publish events
    setImmediate(async () => {
      try {
        for (const release of releases) {
          await queueService.publishStockReleased({
            order_id: orderId,
            item_id: release.item_id,
            quantity: release.quantity_released,
          });
        }
      } catch (error) {
        logger.error('Failed to publish stock release events', { error: error.message });
      }
    });

    return {
      success: true,
      transaction_id: transactionId,
      releases,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    
    stockTransactionTotal.inc({ type: 'release', status: 'error' });

    logger.error('Stock release failed', {
      orderId,
      transactionId,
      error: error.message,
    });
    
    // Don't throw - this is a compensating transaction, log and continue
    return {
      success: false,
      error: error.message,
    };
  } finally {
    client.release();
  }
};

/**
 * Get admin inventory overview with available stock
 * Returns real-time available quantities for admin dashboard
 */
const getAdminInventory = async () => {
  const startTime = Date.now();
  
  try {
    logger.info('Fetching admin inventory overview', { service: 'stock-service' });
    
    const result = await pool.query(
      `SELECT 
        item_id as id,
        item_name as name,
        category,
        quantity,
        reserved_quantity,
        (quantity - reserved_quantity) as available_quantity,
        price,
        image,
        updated_at
       FROM inventory
       ORDER BY 
         CASE 
           WHEN (quantity - reserved_quantity) <= 10 THEN 0
           ELSE 1
         END,
         (quantity - reserved_quantity) ASC,
         item_name ASC`
    );

    const duration = Date.now() - startTime;
    
    logger.info('Admin inventory fetched successfully', {
      service: 'stock-service',
      itemCount: result.rows.length,
      durationMs: duration
    });

    // Calculate total metrics
    const totalItems = result.rows.length;
    const totalAvailable = result.rows.reduce((sum, item) => sum + parseInt(item.available_quantity), 0);
    const lowStockItems = result.rows.filter(item => parseInt(item.available_quantity) <= 10).length;

    return {
      items: result.rows.map(item => ({
        id: parseInt(item.id.replace('item-', '')),
        name: item.name,
        category: item.category,
        available_quantity: parseInt(item.available_quantity),
        reserved_quantity: parseInt(item.reserved_quantity),
        total_quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
        image: item.image,
        updated_at: item.updated_at,
        low_stock: parseInt(item.available_quantity) <= 10
      })),
      summary: {
        total_items: totalItems,
        total_available: totalAvailable,
        low_stock_count: lowStockItems
      }
    };
  } catch (error) {
    logger.error('Failed to fetch admin inventory', { 
      service: 'stock-service',
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

module.exports = {
  getStock,
  getAllStock,
  checkStock,
  reserveStock,
  releaseStock,
  decrementStock,
  getAdminInventory,
};
