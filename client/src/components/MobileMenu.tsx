import Link from 'next/link';
import { useRouter } from 'next/router';
import { X, Home, UtensilsCrossed, Clock, Heart, User, Search } from 'lucide-react';
import { useUIStore } from '@/lib/store';

export function MobileMenu() {
  const router = useRouter();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  if (!sidebarOpen) return null;

  const menuItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/menu', label: 'Menu', icon: UtensilsCrossed },
    { href: '/orders', label: 'Orders', icon: Clock },
    { href: '/favorites', label: 'Favorites', icon: Heart },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/search', label: 'Search', icon: Search },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        onClick={toggleSidebar}
      />

      {/* Menu */}
      <div className="fixed left-0 top-0 h-full w-64 glass z-50 md:hidden animate-slide-in-left">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold gradient-text">Menu</h2>
            <button onClick={toggleSidebar} className="btn-ghost p-2">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={toggleSidebar}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg'
                      : 'hover:bg-white/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
