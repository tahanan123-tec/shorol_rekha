module.exports = {
  identityProvider: {
    url: process.env.IDENTITY_SERVICE_URL || 'http://identity-provider:3001',
    timeout: parseInt(process.env.IDENTITY_SERVICE_TIMEOUT || '5000', 10),
  },
  stockService: {
    url: process.env.STOCK_SERVICE_URL || 'http://stock-service:3003',
    timeout: parseInt(process.env.STOCK_SERVICE_TIMEOUT || '10000', 10), // 10 seconds for multi-item orders
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672',
    exchanges: {
      orders: 'orders',
    },
    queues: {
      orderCreated: 'order.created',
      orderProcessing: 'order.processing',
      orderCompleted: 'order.completed',
    },
  },
  cache: {
    ttl: {
      stock: parseInt(process.env.CACHE_TTL_STOCK || '30', 10), // 30 seconds
      menu: parseInt(process.env.CACHE_TTL_MENU || '300', 10), // 5 minutes
      order: parseInt(process.env.CACHE_TTL_ORDER || '60', 10), // 1 minute
    },
  },
  circuitBreaker: {
    timeout: 10000, // 10 seconds - increased for multi-item orders
    errorThresholdPercentage: 50,
    resetTimeout: 30000, // 30 seconds
  },
  retry: {
    maxRetries: 3,
    retryDelay: 1000, // 1 second
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  },
};
