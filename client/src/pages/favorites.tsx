import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Heart, ShoppingBag } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MenuItemCard } from '@/components/MenuItemCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MenuItemSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore, useMenuStore } from '@/lib/store';
import { stockAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, favorites, setItems } = useMenuStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await stockAPI.getStock();
      if (response.success && response.data?.items) {
        setItems(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const favoriteItems = items.filter((item) => favorites.includes(item.id));

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">
            Your Favorites
          </h1>
          <p className="text-gray-600">
            Quick access to your favorite menu items
          </p>
        </div>

        {/* Favorites Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <MenuItemSkeleton key={i} />
            ))}
          </div>
        ) : favoriteItems.length === 0 ? (
          <Card className="text-center py-16">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-12 h-12 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No favorites yet
            </h3>
            <p className="text-gray-500 mb-6">
              Start adding items to your favorites by clicking the heart icon
            </p>
            <Button
              variant="primary"
              onClick={() => router.push('/menu')}
              icon={<ShoppingBag className="w-5 h-5" />}
            >
              Browse Menu
            </Button>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-gray-600">
                {favoriteItems.length} {favoriteItems.length === 1 ? 'item' : 'items'} in your favorites
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteItems.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
