import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ShoppingCart, CreditCard, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCartStore, useOrderStore, useAuthStore } from '@/lib/store';
import { orderAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { subscribeToOrder } from '@/lib/websocket';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { setCurrentOrder } = useOrderStore();
  const { isAuthenticated } = useAuthStore();
  const [isPlacing, setIsPlacing] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'bank'>('cash');
  const [bkashNumber, setBkashNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [mounted, setMounted] = useState(false);

  const subtotal = getTotalPrice();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  // Wait for hydration before checking auth
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check authentication after mount
  useEffect(() => {
    if (mounted && !isAuthenticated()) {
      toast.error('Please login to place an order');
      router.push('/login?redirect=/checkout');
    }
  }, [mounted, isAuthenticated, router]);

  const handlePlaceOrder = async () => {
    // Double-check authentication before placing order
    if (!isAuthenticated()) {
      toast.error('Please login to place an order');
      router.push('/login?redirect=/checkout');
      return;
    }
    
    // Debug: Check if token exists
    const token = useAuthStore.getState().accessToken;
    console.log('=== ORDER DEBUG ===');
    console.log('Token exists:', !!token);
    console.log('Token preview:', token?.substring(0, 30) + '...');
    
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Validation
    if (paymentMethod === 'bkash') {
      if (!bkashNumber || !transactionId) {
        toast.error('Please provide bKash number and transaction ID');
        return;
      }
      if (!/^01[3-9]\d{8}$/.test(bkashNumber)) {
        toast.error('Invalid bKash number format');
        return;
      }
    }

    if (paymentMethod === 'bank') {
      if (!bankAccount || !transactionId) {
        toast.error('Please provide bank account and transaction ID');
        return;
      }
    }

    setIsPlacing(true);
    try {
      const orderItems = items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
      }));

      // Format delivery time to HH:MM if provided
      let formattedDeliveryTime: string | undefined = undefined;
      if (deliveryTime) {
        // Extract time from datetime-local format (YYYY-MM-DDTHH:MM)
        const timePart = deliveryTime.split('T')[1];
        if (timePart) {
          formattedDeliveryTime = timePart;
        }
      }

      console.log('Delivery time raw:', deliveryTime);
      console.log('Delivery time formatted:', formattedDeliveryTime);

      const response = await orderAPI.createOrder(
        orderItems,
        formattedDeliveryTime,
        paymentMethod,
        transactionId || undefined
      );

      if (response.success) {
        const order = response.data;
        setCurrentOrder(order);
        subscribeToOrder(order.order_id);
        clearCart();
        toast.success('Order placed successfully!');
        router.push('/');
      }
    } catch (error: any) {
      // Handle 401 specifically
      if (error.response?.status === 401) {
        toast.error('Your session has expired. Please login again.');
        router.push('/login?redirect=/checkout');
        return;
      }
      
      const errorMessage = error.response?.data?.error || 'Failed to place order';
      toast.error(errorMessage);
    } finally {
      setIsPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Your cart is empty
            </h3>
            <p className="text-gray-500 mb-6">
              Add items to your cart before checking out
            </p>
            <Button variant="primary" onClick={() => router.push('/menu')}>
              Browse Menu
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center space-x-4 mb-8">
          <button onClick={() => router.back()} className="btn-ghost p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-4xl font-bold gradient-text">Checkout</h1>
            <p className="text-gray-600">Review and place your order</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method */}
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Payment Method</h3>
              </div>
              
              <div className="space-y-3">
                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'bkash' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bkash"
                    checked={paymentMethod === 'bkash'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-pink-600">bKash</div>
                    <div className="text-sm text-gray-600">Pay with bKash mobile wallet</div>
                  </div>
                </label>

                {paymentMethod === 'bkash' && (
                  <div className="ml-8 space-y-3 p-4 bg-pink-50 rounded-lg">
                    <Input
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      value={bkashNumber}
                      onChange={(e) => setBkashNumber(e.target.value)}
                      label="bKash Number"
                    />
                    <Input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      label="Transaction ID"
                    />
                    <p className="text-xs text-gray-600">
                      Send money to: <strong>01712345678</strong>
                    </p>
                  </div>
                )}

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-blue-600">Bank Transfer</div>
                    <div className="text-sm text-gray-600">Pay via bank account</div>
                  </div>
                </label>

                {paymentMethod === 'bank' && (
                  <div className="ml-8 space-y-3 p-4 bg-blue-50 rounded-lg">
                    <Input
                      type="text"
                      placeholder="Your account number"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      label="Bank Account"
                    />
                    <Input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      label="Transaction ID"
                    />
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><strong>Bank:</strong> Dutch Bangla Bank</p>
                      <p><strong>Account:</strong> 1234567890</p>
                    </div>
                  </div>
                )}

                <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  paymentMethod === 'cash' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-green-600">Cash on Pickup</div>
                    <div className="text-sm text-gray-600">Pay when you collect</div>
                  </div>
                </label>
              </div>
            </Card>

            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <Clock className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Pickup Time</h3>
              </div>
              <Input
                type="datetime-local"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-2">
                Leave empty for immediate preparation
              </p>
            </Card>

            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-primary-600" />
                <h3 className="text-lg font-semibold">Order Items</h3>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-200 last:border-0">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <span className="font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h3 className="text-lg font-semibold mb-6">Order Summary</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Tax (10%)</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary-600">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
              <Button
                variant="primary"
                fullWidth
                onClick={handlePlaceOrder}
                loading={isPlacing}
                icon={<ShoppingCart className="w-5 h-5" />}
              >
                Place Order
              </Button>
              <p className="text-xs text-gray-500 text-center mt-4">
                By placing this order, you agree to our terms
              </p>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
