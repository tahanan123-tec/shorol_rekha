import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Search, X, TrendingUp, Clock } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MenuItemCard } from '@/components/MenuItemCard';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MenuItemSkeleton } from '@/components/ui/Skeleton';
import { useAuthStore, useMenuStore } from '@/lib/store';
import { stockAPI } from '@/lib/api';
import { debounce } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function SearchPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, setItems } = useMenuStore();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState(items);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    fetchMenu();
    loadRecentSearches();
  }, []);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, items]);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await stockAPI.getStock();
      if (response.success && response.data?.items) {
        setItems(response.data.items);
        setSearchResults(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = debounce((query: string) => {
    if (!query.trim()) {
      setSearchResults(items);
      return;
    }

    const filtered = items.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
    );

    setSearchResults(filtered);
    saveRecentSearch(query);
  }, 300);

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const popularSearches = ['Biryani', 'Pizza', 'Burger', 'Salad', 'Dessert'];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-6">Search Menu</h1>
          
          {/* Search Input */}
          <div className="glass rounded-2xl p-6">
            <Input
              placeholder="Search for dishes, categories, or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="w-5 h-5" />}
              fullWidth
            />
          </div>
        </div>

        {/* Search Suggestions */}
        {!searchQuery && (
          <div className="space-y-6 mb-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold">Recent Searches</h3>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(search)}
                      className="px-4 py-2 glass rounded-lg hover:bg-white/90 transition-colors text-sm"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Popular Searches */}
            <Card>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold">Popular Searches</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularSearches.map((search) => (
                  <button
                    key={search}
                    onClick={() => setSearchQuery(search)}
                    className="px-4 py-2 bg-gradient-to-r from-primary-100 to-purple-100 rounded-lg hover:from-primary-200 hover:to-purple-200 transition-colors text-sm font-medium"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Search Results */}
        {searchQuery && (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'} for "{searchQuery}"
              </p>
              <button
                onClick={() => setSearchQuery('')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Clear search
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <MenuItemSkeleton key={i} />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <Card className="text-center py-16">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-12 h-12 text-gray-300" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No results found
                </h3>
                <p className="text-gray-500 mb-6">
                  Try searching with different keywords
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {searchResults.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
