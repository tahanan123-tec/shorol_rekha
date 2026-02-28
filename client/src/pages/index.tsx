import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ShoppingCart, Clock, TrendingUp, Zap, ArrowRight } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuthStore, useOrderStore, useCartStore } from '@/lib/store';
import { orderAPI } from '@/lib/api';
import { connectWebSocket, subscribeToOrder, onOrderStatus, offOrderStatus } from '@/lib/websocket';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import toast from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated } = useAuthStore();
  const { currentOrder, setCurrentOrder, updateOrderStatus, clearCurrentOrder } = useOrderStore();
  const { getTotalItems } = useCartStore();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Connect WebSocket
    if (accessToken) {
      const socket = connectWebSocket(accessToken);

      socket.on('connected', (data) => {
        console.log('Connected to notification hub:', data);
      });

      // Listen for order status updates
      onOrderStatus((data) => {
        console.log('Order status update:', data);
        updateOrderStatus(data.order_id, data.status);
        
        if (data.status === 'PROCESSING') {
          toast('🍳 Your order is being prepared!', { icon: '👨‍🍳' });
        } else if (data.status === 'READY') {
          toast.success('🎉 Your order is ready for pickup!');
        } else if (data.status === 'FAILED') {
          toast.error('❌ Order failed. Please try again.');
        }
      });

      return () => {
        offOrderStatus();
      };
    }
  }, [accessToken, isAuthenticated, router, updateOrderStatus]);

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="glass rounded-3xl p-8 md:p-12 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-400/20 to-purple-400/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Welcome back, <span className="gradient-text">{user.full_name || user.student_id}</span>!
            </h1>
            <p className="text-gray-600 text-lg mb-6">
              Order your favorite meals and track them in real-time
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/menu')}
                icon={<ShoppingCart className="w-5 h-5" />}
              >
                Browse Menu
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push('/orders')}
                icon={<Clock className="w-5 h-5" />}
              >
                View Orders
              </Button>
            </div>
          </div>
        </div>

        {/* Current Order */}
        {currentOrder && (
          <Card className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-1">Current Order</h2>
                <p className="text-sm text-gray-500">Order ID: {currentOrder.order_id}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatCurrency(currentOrder.total_amount)}
                </p>
              </div>
            </div>

            <OrderStatusTimeline
              currentStatus={currentOrder.status}
              createdAt={currentOrder.created_at}
              completedAt={currentOrder.status === 'READY' ? new Date().toISOString() : undefined}
            />

            {currentOrder.eta && currentOrder.status !== 'READY' && (
              <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-xl flex items-center">
                <Clock className="w-5 h-5 text-primary-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-primary-900">
                    Estimated Ready Time
                  </p>
                  <p className="text-xs text-primary-700">
                    {new Date(currentOrder.eta).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {currentOrder.status === 'READY' && (
              <Button
                variant="success"
                fullWidth
                className="mt-6"
                onClick={() => {
                  clearCurrentOrder();
                  toast.success('Enjoy your meal!');
                }}
              >
                Mark as Picked Up
              </Button>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card hover className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 float">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast Service</h3>
            <p className="text-gray-600 text-sm">Ready in 3-7 minutes</p>
          </Card>

          <Card hover className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 float">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Live Tracking</h3>
            <p className="text-gray-600 text-sm">Real-time order updates</p>
          </Card>

          <Card hover className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 float">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Easy Ordering</h3>
            <p className="text-gray-600 text-sm">Simple and intuitive</p>
          </Card>
        </div>

        {/* CTA Section */}
        {!currentOrder && (
          <Card className="text-center bg-gradient-to-br from-primary-50 to-purple-50">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Ready to Order?</h2>
              <p className="text-gray-600 mb-6">
                Browse our delicious menu and place your order now
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/menu')}
                icon={<ArrowRight className="w-5 h-5" />}
              >
                View Menu
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
