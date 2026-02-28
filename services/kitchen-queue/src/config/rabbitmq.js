module.exports = {
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672',
  exchanges: {
    orders: 'orders',
  },
  queues: {
    orderCreated: 'order.created',
    orderProcessing: 'order.processing',
    orderCompleted: 'order.completed',
    orderFailed: 'order.failed',
    deadLetter: 'order.dead_letter',
  },
  routingKeys: {
    orderCreated: 'order.created',
    orderProcessing: 'order.processing',
    orderCompleted: 'order.completed',
    orderFailed: 'order.failed',
  },
  prefetchCount: parseInt(process.env.WORKER_PREFETCH || '10', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '5000', 10), // 5 seconds
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
};
