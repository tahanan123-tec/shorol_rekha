module.exports = {
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672',
  exchanges: {
    orders: 'orders',
    stock: 'stock',
  },
  queues: {
    orderProcessing: 'notification.order.processing',
    orderCompleted: 'notification.order.completed',
    orderFailed: 'notification.order.failed',
    stockUpdated: 'notification.stock.updated',
  },
  routingKeys: {
    orderProcessing: 'order.processing',
    orderCompleted: 'order.completed',
    orderFailed: 'order.failed',
    stockUpdated: 'stock.updated',
  },
};
