const config = require('../config/rabbitmq');
const queueService = require('../services/queue.service');
const websocketService = require('../services/websocket.service');
const logger = require('../utils/logger');
const { messageProcessedTotal } = require('../utils/metrics');

/**
 * Handle stock.updated event
 */
const handleStockUpdated = async (message) => {
  try {
    const data = JSON.parse(message.content.toString());

    logger.info('Processing stock.updated event', {
      itemId: data.item_id,
      quantity: data.quantity,
    });

    // Broadcast stock update to all connected clients
    websocketService.broadcast('stock:updated', {
      item_id: data.item_id,
      quantity: data.quantity,
      reserved_quantity: data.reserved_quantity,
      version: data.version,
    });

    messageProcessedTotal.inc({ queue: 'stock.updated', status: 'success' });
  } catch (error) {
    messageProcessedTotal.inc({ queue: 'stock.updated', status: 'error' });
    logger.error('Failed to handle stock.updated', {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Start consuming stock events
 */
const startConsuming = async () => {
  try {
    const channel = queueService.getChannel();

    logger.info('Starting stock event consumer');

    // Consume stock.updated
    await channel.consume(
      config.queues.stockUpdated,
      async (message) => {
        if (message === null) return;

        try {
          await handleStockUpdated(message);
          channel.ack(message);
        } catch (error) {
          logger.error('Error processing stock.updated message', {
            error: error.message,
          });
          channel.nack(message, false, true); // Requeue
        }
      },
      { noAck: false }
    );

    logger.info('Stock event consumer started successfully');
  } catch (error) {
    logger.error('Failed to start stock consumer', { error: error.message });
    throw error;
  }
};

module.exports = {
  startConsuming,
  handleStockUpdated,
};
