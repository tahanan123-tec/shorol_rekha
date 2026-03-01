import { useState } from 'react';
import { ShoppingCart, Heart, Clock, Flame } from 'lucide-react';
import { useCartStore, useMenuStore } from '@/lib/store';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@/lib/utils';
import type { MenuItem } from '@/types';
import toast from 'react-hot-toast';

interface MenuItemCardProps {
  item: MenuItem;
  onViewDetails?: () => void;
}

export function MenuItemCard({ item, onViewDetails }: MenuItemCardProps) {
  const { addItem } = useCartStore();
  const { toggleFavorite, isFavorite } = useMenuStore();
  const [isAdding, setIsAdding] = useState(false);
  const favorite = isFavorite(item.id);

  const handleAddToCart = async () => {
    setIsAdding(true);
    try {
      addItem(item);
      toast.success(`${item.name} added to cart!`);
    } finally {
      setTimeout(() => setIsAdding(false), 300);
    }
  };

  const handleToggleFavorite = () => {
    toggleFavorite(item.id);
    toast.success(favorite ? 'Removed from favorites' : 'Added to favorites');
  };

  return (
    <div className="glass rounded-2xl overflow-hidden card-hover group">
      {/* Image */}
      <div className="relative h-48 bg-gradient-to-br from-primary-100 to-purple-100 overflow-hidden">
        {item.image && (item.image.startsWith('http') || item.image.startsWith('/')) ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {item.image || '🍽️'}
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={handleToggleFavorite}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full glass flex items-center justify-center transition-all ${
            favorite ? 'text-red-500 scale-110' : 'text-gray-400 hover:text-red-500'
          }`}
          aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${favorite ? 'fill-current' : ''}`} />
        </button>

        {/* Availability Badge */}
        {!item.available && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="error" size="lg">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category & Tags */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="primary" size="sm">
            {item.category}
          </Badge>
          {item.tags?.map((tag) => (
            <Badge key={tag} variant="info" size="sm">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">
          {item.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
          {item.prepTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{item.prepTime} min</span>
            </div>
          )}
          {item.calories && (
            <div className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              <span>{item.calories} cal</span>
            </div>
          )}
          {item.stock !== undefined && (
            <span className={item.stock < 5 ? 'text-orange-600 font-medium' : ''}>
              {item.stock} left
            </span>
          )}
        </div>

        {/* Price & Actions */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-primary-600">
              {formatCurrency(item.price)}
            </span>
            {item.rating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-500">★</span>
                <span className="text-sm font-medium">{item.rating.toFixed(1)}</span>
                {item.reviews && (
                  <span className="text-xs text-gray-500">({item.reviews})</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onViewDetails && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onViewDetails}
                className="px-3"
              >
                Details
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={handleAddToCart}
              disabled={!item.available || isAdding}
              loading={isAdding}
              icon={<ShoppingCart className="w-4 h-4" />}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
