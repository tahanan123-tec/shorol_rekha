import axios from 'axios';
import { useAuthStore } from './store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (student_id: string, password: string) => {
    const response = await api.post('/auth/login', { student_id, password });
    return response.data;
  },

  register: async (
    student_id: string,
    email: string,
    password: string,
    full_name: string
  ) => {
    const response = await api.post('/auth/register', {
      student_id,
      email,
      password,
      full_name,
    });
    return response.data;
  },

  validateToken: async () => {
    const response = await api.get('/auth/validate');
    return response.data;
  },
};

export const orderAPI = {
  createOrder: async (
    items: { id: string; quantity: number }[],
    delivery_time?: string,
    payment_method?: 'bkash' | 'bank' | 'cash',
    transaction_id?: string
  ) => {
    const response = await api.post(
      '/api/order',
      { items, delivery_time, payment_method, transaction_id },
      {
        headers: {
          'Idempotency-Key': `${Date.now()}-${Math.random()}`,
        },
      }
    );
    return response.data;
  },

  getOrderStatus: async (orderId: string) => {
    const response = await api.get(`/api/order/status/${orderId}`);
    return response.data;
  },

  getOrders: async () => {
    const response = await api.get('/api/orders');
    return response.data;
  },
};

export const stockAPI = {
  getStock: async () => {
    const response = await axios.get(`${API_URL}/stock`);
    
    // Transform stock service response to match MenuItem interface
    if (response.data.success && response.data.data?.items) {
      const transformedItems = response.data.data.items.map((item: any) => ({
        id: item.item_id,
        name: item.item_name,
        description: item.description || `Delicious ${item.item_name}`,
        price: item.price,
        category: item.category || 'Main Course',
        image: item.image,
        available: item.available_quantity > 0,
        stock: item.available_quantity,
        tags: item.tags,
        calories: item.calories,
        prepTime: item.prep_time,
        rating: item.rating,
        reviews: item.reviews,
      }));
      
      return {
        success: true,
        data: {
          items: transformedItems,
        },
      };
    }
    
    return response.data;
  },

  getItem: async (itemId: string) => {
    const response = await axios.get(`${API_URL}/stock/${itemId}`);
    
    // Transform single item response
    if (response.data.success && response.data.data) {
      const item = response.data.data;
      return {
        success: true,
        data: {
          id: item.item_id,
          name: item.item_name,
          description: item.description || `Delicious ${item.item_name}`,
          price: item.price,
          category: item.category || 'Main Course',
          image: item.image,
          available: item.available_quantity > 0,
          stock: item.available_quantity,
          tags: item.tags,
          calories: item.calories,
          prepTime: item.prep_time,
          rating: item.rating,
          reviews: item.reviews,
        },
      };
    }
    
    return response.data;
  },
};

export default api;
