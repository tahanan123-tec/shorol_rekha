module.exports = {
  url: process.env.RABBITMQ_URL || 'amqp://admin:admin@rabbitmq:5672',
  exchanges: {
    stock: 'stock',
  },
  routingKeys: {
    stockUpdated: 'stock.updated',
    stockReserved: 'stock.reserved',
    stockReleased: 'stock.released',
    stockDepleted: 'stock.depleted',
  },
};
