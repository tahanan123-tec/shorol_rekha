import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowLeft, Clock, Package, MapPin, CreditCard } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { useAuthStore } from '@/lib/store';
import { orderAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getOrderStatusColor, getOrderStatusLabel } from '@/lib/utils';
import type { Order } from '@/types';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const router = useRouter();
  const { orderId } = router.query;
  const { isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<Order | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (orderId && typeof orderId === 'string') {
      fetchOrderDetails(orderId);
    }
  }, [orderId, mounted]);

  const fetchOrderDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await orderAPI.getOrderStatus(id);
      
      if (response.success && response.data) {
        setOrder(response.data);
      } else {
        toast.error('Order not found');
        router.push('/orders');
      }
    } catch (error: any) {
      console.error('Failed to fetch order details:', error);
      if (error.response?.status === 404) {
        toast.error('Order not found');
      } else {
        toast.error('Failed to load order details');
      }
      router.push('/orders');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => router.push('/orders')}
            icon={<ArrowLeft className="w-5 h-5" />}
            className="mb-4"
          >
            Back to Orders
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">
                Order #{order.order_id.slice(0, 8)}
              </h1>
              <p className="text-gray-600">
                Placed on {formatDateTime(order.created_at)}
              </p>
            </div>
            <Badge variant={getOrderStatusColor(order.status) as any} className="text-lg px-4 py-2">
              {getOrderStatusLabel(order.status)}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Order Status Timeline */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Order Status</h2>
            <OrderStatusTimeline status={order.status} />
            {order.eta && (
              <div className="mt-4 flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                Estimated delivery: {formatDateTime(order.eta)}
              </div>
            )}
          </Card>

          {/* Order Items */}
          <Card>
            <h2 className="text-xl font-semibold mb-4">Order Items</h2>
            <div className="space-y-3">
              {order.items.map((item: any, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name || item.id || 'Item'}</p>
                      <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {item.price ? formatCurrency(item.price * item.quantity) : '-'}
                    </p>
                    {item.price && (
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price)} each
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Delivery Information */}
          {order.delivery_time && (
            <Card>
              <h2 className="text-xl font-semibold mb-4">Delivery Information</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Delivery Time</p>
                    <p className="font-medium">{formatDateTime(order.delivery_time)}</p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              fullWidth
              onClick={() => router.push('/orders')}
            >
              Back to Orders
            </Button>
            {order.status === 'COMPLETED' && (
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  toast.success('Items added to cart!');
                  router.push('/menu');
                }}
              >
                Reorder
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
