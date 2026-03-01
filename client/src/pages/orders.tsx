import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Clock, Package, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderCardSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore, useOrderStore } from '@/lib/store';
import { orderAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { orderHistory, addToHistory } = useOrderStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrders();
      console.log('Orders API Response:', response);
      
      if (response.success && response.data?.orders) {
        // Backend returns { success, data: { orders: [...], count, limit, offset } }
        const ordersArray = response.data.orders;
        console.log('Orders array:', ordersArray);
        console.log('Orders count:', ordersArray.length);
        setOrders(ordersArray);
        ordersArray.forEach((order: Order) => addToHistory(order));
      } else if (response.success && Array.isArray(response.data)) {
        // Fallback: if data is directly an array
        console.log('Orders as direct array:', response.data);
        setOrders(response.data);
        response.data.forEach((order: Order) => addToHistory(order));
      } else {
        // No orders yet
        console.log('No orders found in response');
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Failed to load orders');
      // Fallback to stored history
      setOrders(orderHistory);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'CONFIRMED':
        return <Clock className="w-5 h-5" />;
      case 'PROCESSING':
        return <RefreshCw className="w-5 h-5 animate-spin" />;
      case 'READY':
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5" />;
      case 'CANCELLED':
      case 'FAILED':
        return <XCircle className="w-5 h-5" />;
      default:
        return <Package className="w-5 h-5" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Order History</h1>
            <p className="text-gray-600">Track all your past and current orders</p>
          </div>
          <Button
            variant="secondary"
            onClick={fetchOrders}
            icon={<RefreshCw className="w-5 h-5" />}
          >
            Refresh
          </Button>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <Card className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No orders yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start by browsing our menu and placing your first order
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/menu')}
            >
              Browse Menu
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.order_id} hover className="cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className={`p-3 rounded-xl bg-${getOrderStatusColor(order.status)}-100`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">
                        Order #{order.order_id.slice(0, 8)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(order.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getOrderStatusColor(order.status) as any}>
                    {getOrderStatusLabel(order.status)}
                  </Badge>
                </div>

                {/* Items */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items.map((item: any, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {item.quantity}x {item.name || item.id || 'Item'}
                        </span>
                        <span className="font-medium">
                          {item.price ? formatCurrency(item.price * item.quantity) : '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => router.push(`/orders/${order.order_id}`)}
                  >
                    View Details
                  </Button>
                  {order.status === 'COMPLETED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      fullWidth
                      onClick={() => {
                        // Reorder functionality
                        toast.success('Items added to cart!');
                        router.push('/menu');
                      }}
                    >
                      Reorder
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
