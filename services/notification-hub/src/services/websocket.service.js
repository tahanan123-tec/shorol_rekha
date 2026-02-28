const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const {
  websocketConnectionsGauge,
  websocketConnectionTotal,
  notificationSentTotal,
  notificationLatency,
  activeRoomsGauge,
  broadcastTotal,
} = require('../utils/metrics');

let io = null;

/**
 * Initialize Socket.IO server with Redis adapter for horizontal scaling
 */
const initializeWebSocket = (httpServer, pubClient, subClient) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/notifications',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Use Redis adapter for horizontal scaling
  io.adapter(createAdapter(pubClient, subClient));

  logger.info('Socket.IO server initialized with Redis adapter');

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY || 'dev-secret-key');

      // Attach user info to socket
      socket.userId = decoded.user_id;
      socket.studentId = decoded.student_id;

      logger.debug('WebSocket authenticated', {
        socketId: socket.id,
        userId: socket.userId,
      });

      next();
    } catch (error) {
      logger.warn('WebSocket authentication failed', {
        error: error.message,
        socketId: socket.id,
      });
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    websocketConnectionsGauge.inc();
    websocketConnectionTotal.inc({ status: 'connected' });

    logger.info('Client connected', {
      socketId: socket.id,
      userId: socket.userId,
      transport: socket.conn.transport.name,
    });

    // Join user-specific room
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);

    logger.debug('Client joined room', {
      socketId: socket.id,
      room: userRoom,
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to notification hub',
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    // Handle order subscription
    socket.on('subscribe:order', (orderId) => {
      const orderRoom = `order:${orderId}`;
      socket.join(orderRoom);

      logger.debug('Client subscribed to order', {
        socketId: socket.id,
        orderId,
        room: orderRoom,
      });

      socket.emit('subscribed', {
        type: 'order',
        id: orderId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle order unsubscription
    socket.on('unsubscribe:order', (orderId) => {
      const orderRoom = `order:${orderId}`;
      socket.leave(orderRoom);

      logger.debug('Client unsubscribed from order', {
        socketId: socket.id,
        orderId,
      });

      socket.emit('unsubscribed', {
        type: 'order',
        id: orderId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle ping for connection keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      websocketConnectionsGauge.dec();
      websocketConnectionTotal.inc({ status: 'disconnected' });

      logger.info('Client disconnected', {
        socketId: socket.id,
        userId: socket.userId,
        reason,
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message,
      });
    });
  });

  // Update active rooms metric periodically
  setInterval(() => {
    if (io) {
      const rooms = io.sockets.adapter.rooms;
      activeRoomsGauge.set(rooms.size);
    }
  }, 30000); // Every 30 seconds

  return io;
};

/**
 * Send notification to specific user
 */
const sendToUser = (userId, event, data) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }

  const end = notificationLatency.startTimer({ event_type: event });
  const room = `user:${userId}`;

  try {
    io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    end();
    notificationSentTotal.inc({ event_type: event, status: 'success' });

    logger.debug('Notification sent to user', {
      userId,
      event,
      room,
    });

    return true;
  } catch (error) {
    notificationSentTotal.inc({ event_type: event, status: 'error' });
    logger.error('Failed to send notification to user', {
      userId,
      event,
      error: error.message,
    });
    return false;
  }
};

/**
 * Send notification to specific order room
 */
const sendToOrder = (orderId, event, data) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }

  const end = notificationLatency.startTimer({ event_type: event });
  const room = `order:${orderId}`;

  try {
    io.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    end();
    notificationSentTotal.inc({ event_type: event, status: 'success' });
    broadcastTotal.inc({ room: 'order' });

    logger.debug('Notification sent to order room', {
      orderId,
      event,
      room,
    });

    return true;
  } catch (error) {
    notificationSentTotal.inc({ event_type: event, status: 'error' });
    logger.error('Failed to send notification to order', {
      orderId,
      event,
      error: error.message,
    });
    return false;
  }
};

/**
 * Broadcast to all connected clients
 */
const broadcast = (event, data) => {
  if (!io) {
    logger.error('Socket.IO not initialized');
    return false;
  }

  try {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });

    notificationSentTotal.inc({ event_type: event, status: 'success' });
    broadcastTotal.inc({ room: 'all' });

    logger.debug('Broadcast sent', { event });

    return true;
  } catch (error) {
    notificationSentTotal.inc({ event_type: event, status: 'error' });
    logger.error('Failed to broadcast', {
      event,
      error: error.message,
    });
    return false;
  }
};

/**
 * Get connection statistics
 */
const getStats = () => {
  if (!io) {
    return {
      connections: 0,
      rooms: 0,
    };
  }

  return {
    connections: io.sockets.sockets.size,
    rooms: io.sockets.adapter.rooms.size,
  };
};

/**
 * Close Socket.IO server
 */
const close = async () => {
  if (io) {
    await new Promise((resolve) => {
      io.close(() => {
        logger.info('Socket.IO server closed');
        resolve();
      });
    });
  }
};

module.exports = {
  initializeWebSocket,
  sendToUser,
  sendToOrder,
  broadcast,
  getStats,
  close,
};
