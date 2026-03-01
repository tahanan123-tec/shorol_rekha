import Link from 'next/link';
import { useRouter } from 'next/router';
import { Activity, UtensilsCrossed, ShoppingCart, BarChart3 } from 'lucide-react';

export function Navigation() {
  const router = useRouter();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Activity },
    { href: '/menu', label: 'Menu Management', icon: UtensilsCrossed },
    { href: '/orders', label: 'Orders', icon: ShoppingCart },
  ];

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = router.pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-4 border-b-2 transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
