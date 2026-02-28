const orderService = require('../services/order.service');
const logger = require('../utils/logger');

/**
 * POST /order
 * Create a new order
 */
const createOrder = async (req, res, next) => {
  try {
    const user = req.user;
    const orderData = req.validatedBody;
    const idempotencyKey = req.idempotencyKey;

    logger.info('Order request received', { 
      userId: user.user_id, 
      studentId: user.student_id,
      itemCount: orderData.items.length 
    });

    const order = await orderService.createOrder(user, orderData, idempotencyKey);

    res.status(202).json({
      success: true,
      message: 'Order accepted',
      data: order,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: error.message,
        details: error.details,
      });
    }

    if (error.statusCode === 503) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
};

/**
 * GET /order/status/:id
 * Get order status
 */
const getOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const order = await orderService.getOrderStatus(id, user.user_id);

    res.status(200).json({
      success: true,
      data: order,
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
 * GET /orders
 * Get user orders
 */
const getUserOrders = async (req, res, next) => {
  try {
    const user = req.user;
    const limit = parseInt(req.query.limit || '20', 10);
    const offset = parseInt(req.query.offset || '0', 10);

    const orders = await orderService.getUserOrders(user.user_id, limit, offset);

    res.status(200).json({
      success: true,
      data: {
        orders,
        limit,
        offset,
        count: orders.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getOrderStatus,
  getUserOrders,
};
