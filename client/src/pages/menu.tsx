import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Search, SlidersHorizontal, Grid3x3, List, X } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { MenuItemCard } from '@/components/MenuItemCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MenuItemSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore, useMenuStore, useCartStore } from '@/lib/store';
import { stockAPI } from '@/lib/api';
import type { MenuItem } from '@/types';
import toast from 'react-hot-toast';

export default function MenuPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { items, categories, setItems } = useMenuStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'rating'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

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
      console.log('Menu API Response:', response);
      if (response.success && response.data?.items) {
        console.log('Menu Items:', response.data.items);
        setItems(response.data.items);
      }
    } catch (error) {
      console.error('Failed to fetch menu:', error);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort items
  const filteredItems = useMemo(() => {
    // Don't process if items is not an array or is empty
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    let filtered = items.filter(item => item && item.name); // Filter out invalid items

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.category || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((item) => item.category === selectedCategory);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'price-low':
          return (a.price || 0) - (b.price || 0);
        case 'price-high':
          return (b.price || 0) - (a.price || 0);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchQuery, selectedCategory, sortBy]);

  const allCategories = ['All', ...categories];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">
            Our Menu
          </h1>
          <p className="text-gray-600 text-lg">
            Discover delicious meals prepared fresh daily
          </p>
        </div>

        {/* Search and Filters */}
        <div className="glass rounded-2xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-primary-600 text-white'
                    : 'glass hover:bg-white/90'
                }`}
                aria-label="Grid view"
              >
                <Grid3x3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'glass hover:bg-white/90'
                }`}
                aria-label="List view"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary"
              >
                <SlidersHorizontal className="w-5 h-5 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'name', label: 'Name' },
                    { value: 'price-low', label: 'Price: Low to High' },
                    { value: 'price-high', label: 'Price: High to Low' },
                    { value: 'rating', label: 'Rating' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        sortBy === option.value
                          ? 'bg-primary-600 text-white'
                          : 'glass hover:bg-white/90'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto scrollbar-hide pb-2">
          {allCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-primary-600 to-purple-600 text-white shadow-lg scale-105'
                  : 'glass hover:bg-white/90'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
          </p>
          {(searchQuery || selectedCategory !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>

        {/* Menu Grid/List */}
        {loading ? (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {[...Array(6)].map((_, i) => (
              <MenuItemSkeleton key={i} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No items found
            </h3>
            <p className="text-gray-500 mb-6">
              Try adjusting your search or filters
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
            }
          >
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onViewDetails={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}

        {/* Item Details Modal */}
        {selectedItem && (
          <Modal
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            title={selectedItem.name}
            size="lg"
          >
            <div className="space-y-4">
              {/* Image */}
              <div className="h-64 bg-gradient-to-br from-primary-100 to-purple-100 rounded-xl overflow-hidden">
                {selectedItem.image && (selectedItem.image.startsWith('http') || selectedItem.image.startsWith('/')) ? (
                  <img
                    src={selectedItem.image}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl">
                    {selectedItem.image || '🍽️'}
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <Badge variant="primary" className="mb-3">
                  {selectedItem.category}
                </Badge>
                <p className="text-gray-600 mb-4">{selectedItem.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  {selectedItem.prepTime && (
                    <div>
                      <p className="text-sm text-gray-500">Prep Time</p>
                      <p className="font-semibold">{selectedItem.prepTime} min</p>
                    </div>
                  )}
                  {selectedItem.calories && (
                    <div>
                      <p className="text-sm text-gray-500">Calories</p>
                      <p className="font-semibold">{selectedItem.calories} cal</p>
                    </div>
                  )}
                  {selectedItem.rating && (
                    <div>
                      <p className="text-sm text-gray-500">Rating</p>
                      <p className="font-semibold">
                        ★ {selectedItem.rating.toFixed(1)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Stock</p>
                    <p className="font-semibold">{selectedItem.stock} available</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <span className="text-3xl font-bold text-primary-600">
                    ${selectedItem.price.toFixed(2)}
                  </span>
                  <Button
                    variant="primary"
                    onClick={() => {
                      useCartStore.getState().addItem(selectedItem);
                      toast.success('Added to cart!');
                      setSelectedItem(null);
                    }}
                    disabled={!selectedItem.available}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
