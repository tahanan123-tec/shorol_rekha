export interface User {
  user_id: number;
  student_id: string;
  email: string;
  full_name: string;
  created_at?: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  stock: number;
  tags?: string[];
  calories?: number;
  prepTime?: number;
  rating?: number;
  reviews?: number;
}

export interface CartItem extends MenuItem {
  quantity: number;
  customizations?: Record<string, any>;
}

export interface Order {
  order_id: string;
  student_id: string;
  status: OrderStatus;
  items: OrderItem[];
  total_amount: number;
  delivery_time?: string;
  eta?: string;
  created_at: string;
  updated_at?: string;
  completed_at?: string;
}

export interface OrderItem {
  item_id: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: Record<string, any>;
}

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export interface Notification {
  id: string;
  type: 'order' | 'system' | 'promotion';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action?: {
    label: string;
    url: string;
  };
}

export interface StockUpdate {
  item_id: string;
  stock: number;
  available: boolean;
}

export interface OrderStatusUpdate {
  order_id: string;
  status: OrderStatus;
  eta?: string;
  message?: string;
}
