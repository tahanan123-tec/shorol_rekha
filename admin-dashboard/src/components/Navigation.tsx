import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { Activity, UtensilsCrossed, ShoppingCart, LogOut, User } from 'lucide-react';
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
  ];

  // Since admin dashboard is served at /admin, we need to check the actual browser path
  const getCurrentPath = () => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname;
  };

  const currentPath = mounted ? getCurrentPath() : '';

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              // Map internal paths to external paths
              const externalPath = item.href === '/admin' ? '/admin' : 
                                   item.href === '/admin/menu' ? '/admin/menu' :
                                   item.href === '/admin/orders' ? '/admin/orders' : item.href;
              const isActive = mounted && currentPath === externalPath;

              return (
                <a
                  key={item.href}
                  href={externalPath}
                  className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </a>
              );
            })}
          </div>
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
