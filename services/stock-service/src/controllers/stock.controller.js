const stockService = require('../services/stock.service');
const logger = require('../utils/logger');

/**
 * GET /stock/:itemId
 * Get stock information for an item
 */
const getStock = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const stock = await stockService.getStock(itemId);

    res.status(200).json({
      success: true,
      data: stock,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * GET /stock
 * Get all stock items
 */
const getAllStock = async (req, res, next) => {
  try {
    const stock = await stockService.getAllStock();

    res.status(200).json({
      success: true,
      data: {
        items: stock,
        count: stock.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /internal/stock/check
 * Check stock availability (internal endpoint)
 */
const checkStock = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required',
      });
    }

    const result = await stockService.checkStock(items);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /internal/stock/reserve
 * Reserve stock for an order (internal endpoint)
 */
const reserveStock = async (req, res, next) => {
  try {
    const { order_id, items } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required',
      });
    }

    const result = await stockService.reserveStock(order_id, items);

    res.status(200).json({
      success: true,
      message: 'Stock reserved successfully',
      data: result,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: error.message,
        details: error.details,
      });
    }

    next(error);
  }
};

/**
 * POST /stock/decrement
 * Decrement stock (idempotent)
 */
const decrementStock = async (req, res, next) => {
  try {
    const { order_id, items, transaction_id } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required',
      });
    }

    const result = await stockService.decrementStock(order_id, items, transaction_id);

    res.status(200).json({
      success: true,
      message: 'Stock decremented successfully',
      data: result,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
};

/**
 * POST /internal/stock/release
 * Release reserved stock (compensating transaction)
 */
const releaseStock = async (req, res, next) => {
  try {
    const { order_id, items } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'order_id is required',
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required',
      });
    }

    const result = await stockService.releaseStock(order_id, items);

    res.status(200).json({
      success: true,
      message: 'Stock released successfully',
      data: result,
    });
  } catch (error) {
    // Don't fail hard on release errors - log and return success
    logger.error('Stock release endpoint error', { 
      orderId: req.body.order_id, 
      error: error.message 
    });
    
    res.status(200).json({
      success: false,
      message: 'Stock release failed but logged',
      error: error.message,
    });
  }
};

/**
 * GET /admin/stock
 * Get inventory overview for admin dashboard (ADMIN only)
 */
const getAdminInventory = async (req, res, next) => {
  try {
    logger.info('Admin inventory request received', {
      service: 'stock-service',
      user: req.user?.email || 'unknown'
    });

    const result = await stockService.getAdminInventory();

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Admin inventory endpoint error', { 
      error: error.message,
      stack: error.stack
    });
    next(error);
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
