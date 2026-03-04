import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Activity, UtensilsCrossed, ShoppingCart, LogOut, User, Package } from 'lucide-react';
import { useAdminAuth } from '@/lib/auth';

export function Navigation() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { logout, getUsername } = useAdminAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: Activity },
    { href: '/admin/menu', label: 'Menu Management', icon: UtensilsCrossed },
    { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
    { href: '/admin/inventory', label: 'Inventory', icon: Package },
  ];

  // Since admin dashboard is served at /admin, we need to check the actual browser path
  const getCurrentPath = () => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname;
  };

  const currentPath = mounted ? getCurrentPath() : '';

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* IUT Logo and Branding */}
          <div className="flex items-center space-x-3 py-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md overflow-hidden">
              <img 
                src="/iut-logo.png" 
                alt="IUT Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-green-600 to-green-800 bg-clip-text text-transparent">
                IUT Cafeteria Admin
              </h1>
              <p className="text-xs text-gray-500">Islamic University of Technology</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Map internal paths to external paths
              const externalPath = item.href === '/admin' ? '/admin' : 
                                   item.href === '/admin/menu' ? '/admin/menu' :
                                   item.href === '/admin/orders' ? '/admin/orders' :
                                   item.href === '/admin/inventory' ? '/admin/inventory' : item.href;
              const isActive = mounted && currentPath === externalPath;

              return (
                <a
                  key={item.href}
                  href={externalPath}
                  className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                    isActive
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span className="font-medium">{mounted ? getUsername() : 'Admin'}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
