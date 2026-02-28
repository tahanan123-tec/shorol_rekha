import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3005';

let socket: Socket | null = null;

export const connectWebSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(WS_URL, {
    path: '/notifications',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
  });

  return socket;
};

export const disconnectWebSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeToOrder = (orderId: string) => {
  if (socket?.connected) {
    socket.emit('subscribe:order', orderId);
  }
};

export const unsubscribeFromOrder = (orderId: string) => {
  if (socket?.connected) {
    socket.emit('unsubscribe:order', orderId);
  }
};

export const onOrderStatus = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('order:status', callback);
  }
};

export const offOrderStatus = () => {
  if (socket) {
    socket.off('order:status');
  }
};

export const onStockUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('stock:updated', callback);
  }
};

export const offStockUpdated = () => {
  if (socket) {
    socket.off('stock:updated');
  }
};

export const getSocket = () => socket;
