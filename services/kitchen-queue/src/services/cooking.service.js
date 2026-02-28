const logger = require('../utils/logger');
const { cookingSimulationDuration } = require('../utils/metrics');

/**
 * Simulate cooking process with random delay between 3-7 seconds
 */
const simulateCooking = async (orderId, items) => {
  const minTime = parseInt(process.env.COOKING_MIN_TIME || '3000', 10);
  const maxTime = parseInt(process.env.COOKING_MAX_TIME || '7000', 10);
  
  // Random cooking time between min and max
  const cookingTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  
  logger.info('Starting cooking simulation', {
    orderId,
    items: items.length,
    cookingTime: `${cookingTime}ms`,
  });

  const end = cookingSimulationDuration.startTimer();

  // Simulate cooking with a promise
  await new Promise(resolve => setTimeout(resolve, cookingTime));

  end();

  logger.info('Cooking simulation completed', {
    orderId,
    cookingTime: `${cookingTime}ms`,
  });

  return {
    cooking_duration: cookingTime / 1000, // Convert to seconds
    completed_at: new Date().toISOString(),
  };
};

/**
 * Validate order data
 */
const validateOrder = (orderData) => {
  if (!orderData.order_id) {
    throw new Error('Missing order_id');
  }

  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    throw new Error('Missing or invalid items');
  }

  return true;
};

/**
 * Process order through kitchen
 */
const processOrder = async (orderData) => {
  try {
    // Validate order
    validateOrder(orderData);

    logger.info('Processing order in kitchen', {
      orderId: orderData.order_id,
      items: orderData.items.length,
    });

    // Simulate cooking
    const cookingResult = await simulateCooking(orderData.order_id, orderData.items);

    return {
      success: true,
      order_id: orderData.order_id,
      ...cookingResult,
    };
  } catch (error) {
    logger.error('Order processing failed', {
      orderId: orderData.order_id,
      error: error.message,
    });
    throw error;
  }
};

module.exports = {
  simulateCooking,
  validateOrder,
  processOrder,
};
