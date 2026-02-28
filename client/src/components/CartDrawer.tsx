import { useRouter } from 'next/router';
import { X, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import { useCartStore, useUIStore } from '@/lib/store';
import { Button } from './ui/Button';
import { formatCurrency } from '@/lib/utils';

export function CartDrawer() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { cartOpen, toggleCart } = useUIStore();

  const handleCheckout = () => {
    toggleCart();
    router.push('/checkout');
  };

  if (!cartOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-fade-in"
        onClick={toggleCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md glass z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="w-6 h-6 text-primary-600" />
            <h2 className="text-2xl font-bold">Your Cart</h2>
          </div>
          <button onClick={toggleCart} className="btn-ghost p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 mb-6">
                Add items from the menu to get started
              </p>
              <Button
                variant="primary"
                onClick={() => {
                  toggleCart();
                  router.push('/menu');
                }}
              >
                Browse Menu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="glass rounded-xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-lg glass hover:bg-white/90 flex items-center justify-center transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-semibold text-gray-900">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-lg glass hover:bg-white/90 flex items-center justify-center transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {formatCurrency(item.price)} each
                      </p>
                      <p className="font-bold text-primary-600">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 space-y-4">
            {/* Summary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatCurrency(getTotalPrice())}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Tax (10%)</span>
                <span className="font-medium">
                  {formatCurrency(getTotalPrice() * 0.1)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary-600">
                  {formatCurrency(getTotalPrice() * 1.1)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button
                variant="primary"
                fullWidth
                onClick={handleCheckout}
                icon={<ShoppingCart className="w-5 h-5" />}
              >
                Checkout ({items.length} {items.length === 1 ? 'item' : 'items'})
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={clearCart}
                className="text-red-600 hover:text-red-700"
              >
                Clear Cart
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
