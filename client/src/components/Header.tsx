import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  ShoppingCart,
  Bell,
  Menu,
  User,
  LogOut,
  Heart,
  Clock,
  Search,
} from 'lucide-react';
import { useAuthStore, useCartStore, useUIStore, useNotificationStore } from '@/lib/store';
import { Button } from './ui/Button';
import { ThemeSwitcher } from './ThemeSwitcher';

export function Header() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { toggleCart, toggleNotifications, toggleSidebar } = useUIStore();
  const { unreadCount } = useNotificationStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 glass border-b border-white/20 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 gradient-bg rounded-xl flex items-center justify-center float shadow-lg group-hover:scale-110 transition-transform">
              <span className="text-2xl">🍽️</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold gradient-text">Cafeteria</h1>
              <p className="text-xs text-gray-500">Order System</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {/* Theme Switcher */}
            <ThemeSwitcher />
            
            <Link
              href="/menu"
              className={`text-sm font-medium transition-colors hover:text-primary-600 ${
                router.pathname === '/menu' ? 'text-primary-600' : 'text-gray-700'
              }`}
            >
              Menu
            </Link>
            <Link
              href="/orders"
              className={`text-sm font-medium transition-colors hover:text-primary-600 ${
                router.pathname === '/orders' ? 'text-primary-600' : 'text-gray-700'
              }`}
            >
              Orders
            </Link>
            <Link
              href="/favorites"
              className={`text-sm font-medium transition-colors hover:text-primary-600 ${
                router.pathname === '/favorites' ? 'text-primary-600' : 'text-gray-700'
              }`}
            >
              Favorites
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <button
              onClick={() => router.push('/search')}
              className="btn-ghost p-2 hidden sm:flex"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button
              onClick={toggleNotifications}
              className="btn-ghost p-2 relative"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse-glow">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={toggleCart}
              className="btn-ghost p-2 relative"
              aria-label="Shopping cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-500 text-white text-xs rounded-full flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="btn-ghost p-2 flex items-center space-x-2"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {user.full_name?.charAt(0) || user.student_id.charAt(0)}
                  </div>
                  <span className="hidden lg:block text-sm font-medium">
                    {user.full_name || user.student_id}
                  </span>
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl py-2 z-20 animate-slide-up">
                      <Link
                        href="/profile"
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-white/50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <User className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        href="/orders"
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-white/50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Order History</span>
                      </Link>
                      <Link
                        href="/favorites"
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-white/50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Heart className="w-4 h-4" />
                        <span>Favorites</span>
                      </Link>
                      <hr className="my-2 border-gray-200" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-2 px-4 py-2 hover:bg-red-50 text-red-600 transition-colors w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push('/login')}
              >
                Login
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={toggleSidebar}
              className="btn-ghost p-2 md:hidden"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
