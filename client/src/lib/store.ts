import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Order, CartItem, MenuItem, Notification } from '@/types';

// Auth Store
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken }),
      clearAuth: () => set({ user: null, accessToken: null, refreshToken: null }),
      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as any),
    }
  )
);

// Cart Store
interface CartState {
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        })),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.id !== itemId)
              : state.items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        })),
      clearCart: () => set({ items: [] }),
      getTotalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      getTotalPrice: () =>
        get().items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as any),
    }
  )
);

// Order Store
interface OrderState {
  currentOrder: Order | null;
  orderHistory: Order[];
  setCurrentOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: string) => void;
  addToHistory: (order: Order) => void;
  clearCurrentOrder: () => void;
  getOrderById: (orderId: string) => Order | undefined;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      currentOrder: null,
      orderHistory: [],
      setCurrentOrder: (order) => set({ currentOrder: order }),
      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          currentOrder:
            state.currentOrder?.order_id === orderId
              ? { ...state.currentOrder, status: status as any }
              : state.currentOrder,
          orderHistory: state.orderHistory.map((order) =>
            order.order_id === orderId ? { ...order, status: status as any } : order
          ),
        })),
      addToHistory: (order) =>
        set((state) => ({
          orderHistory: [order, ...state.orderHistory].slice(0, 50), // Keep last 50 orders
        })),
      clearCurrentOrder: () => set({ currentOrder: null }),
      getOrderById: (orderId) => {
        const found = get().orderHistory.find((order) => order.order_id === orderId);
        if (found) return found;
        const current = get().currentOrder;
        return current?.order_id === orderId ? current : undefined;
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as any),
    }
  )
);

// Menu Store
interface MenuState {
  items: MenuItem[];
  categories: string[];
  favorites: string[];
  setItems: (items: MenuItem[]) => void;
  updateStock: (itemId: string, stock: number, available: boolean) => void;
  toggleFavorite: (itemId: string) => void;
  isFavorite: (itemId: string) => boolean;
  getItemById: (itemId: string) => MenuItem | undefined;
  getItemsByCategory: (category: string) => MenuItem[];
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set, get) => ({
      items: [],
      categories: [],
      favorites: [],
      setItems: (items) => {
        const categories = Array.from(new Set(items.map((item) => item.category)));
        set({ items, categories });
      },
      updateStock: (itemId, stock, available) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId ? { ...item, stock, available } : item
          ),
        })),
      toggleFavorite: (itemId) =>
        set((state) => ({
          favorites: state.favorites.includes(itemId)
            ? state.favorites.filter((id) => id !== itemId)
            : [...state.favorites, itemId],
        })),
      isFavorite: (itemId) => get().favorites.includes(itemId),
      getItemById: (itemId) => get().items.find((item) => item.id === itemId),
      getItemsByCategory: (category) =>
        get().items.filter((item) => item.category === category),
    }),
    {
      name: 'menu-storage',
      partialize: (state) => ({ favorites: state.favorites }), // Only persist favorites
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as any),
    }
  )
);

// Notification Store
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: `notif-${Date.now()}-${Math.random()}`,
          created_at: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 100),
          unreadCount: state.unreadCount + 1,
        }));
      },
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      removeNotification: (id) =>
        set((state) => {
          const notification = state.notifications.find((n) => n.id === id);
          return {
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount: notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          };
        }),
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    {
      name: 'notification-storage',
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as any),
    }
  )
);

// UI Store
interface UIState {
  sidebarOpen: boolean;
  cartOpen: boolean;
  notificationsOpen: boolean;
  theme: 'light' | 'dark';
  toggleSidebar: () => void;
  toggleCart: () => void;
  toggleNotifications: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  closeAll: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      cartOpen: false,
      notificationsOpen: false,
      theme: 'light',
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleCart: () => set((state) => ({ cartOpen: !state.cartOpen })),
      toggleNotifications: () =>
        set((state) => ({ notificationsOpen: !state.notificationsOpen })),
      setTheme: (theme) => set({ theme }),
      closeAll: () =>
        set({ sidebarOpen: false, cartOpen: false, notificationsOpen: false }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme }),
      storage: createJSONStorage(() => typeof window !== 'undefined' ? localStorage : {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      } as any),
    }
  )
);
