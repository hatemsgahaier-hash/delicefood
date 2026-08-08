import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Restaurant } from '@/lib/supabase';
import { Card, Input, Spinner, EmptyState } from '@/components/ui';
import { Search, UtensilsCrossed, ArrowRight } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';

interface CategoryWithCount extends Category {
  restaurant: { id: string; name: string; city: string; is_open: boolean };
  product_count: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  sandwich: '🥪',
  pizza: '🍕',
  boisson: '🥤',
  dessert: '🍰',
  burger: '🍔',
  salade: '🥗',
  sushi: '🍣',
  taco: '🌮',
  pasta: '🍝',
  coffee: '☕',
  snack: '🍟',
  vegan: '🥦',
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (lower.includes(key)) return CATEGORY_ICONS[key];
  }
  return '🍽️';
}

export default function ClientHome({
  onSelectCategory,
}: {
  onSelectCategory: (category: Category, restaurant: Restaurant) => void;
}) {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    setLoading(true);

    const { data: restaurants } = await supabase
      .from('restaurants')
      .select('id, name, city, is_open, rating')
      .order('rating', { ascending: false });

    const openRestaurants = (restaurants ?? []).filter((r: any) => r.is_open);
    const restaurantIds = openRestaurants.map((r: any) => r.id);

    if (restaurantIds.length === 0) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const { data: cats } = await supabase
      .from('categories')
      .select('id, restaurant_id, name, sort_order')
      .in('restaurant_id', restaurantIds)
      .order('name');

    const { data: products } = await supabase
      .from('products')
      .select('category_id')
      .in('restaurant_id', restaurantIds)
      .eq('is_available', true);

    const productCountByCat: Record<string, number> = {};
    for (const p of products ?? []) {
      const pid = (p as any).category_id as string;
      productCountByCat[pid] = (productCountByCat[pid] ?? 0) + 1;
    }

    const restoMap = new Map(openRestaurants.map((r: any) => [r.id, r]));

    const enriched: CategoryWithCount[] = (cats ?? [])
      .map((c: any) => {
        const resto = restoMap.get(c.restaurant_id);
        if (!resto) return null;
        return {
          ...c,
          restaurant: { id: resto.id, name: resto.name, city: resto.city, is_open: resto.is_open },
          product_count: productCountByCat[c.id] ?? 0,
        } as CategoryWithCount;
      })
      .filter(Boolean) as CategoryWithCount[];

    setCategories(enriched);
    setLoading(false);
  }

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
      c.restaurant.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Bienvenue</h1>
          <p className="text-slate-500">Choisissez une catégorie pour découvrir nos produits</p>
        </div>
        <div className="relative"><NotificationBell /></div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Rechercher une catégorie ou un restaurant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12"
        />
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-8 h-8" />}
          title="Aucune catégorie"
          message="Aucune catégorie ne correspond à votre recherche pour le moment."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cat, idx) => (
            <Card
              key={cat.id}
              onClick={() => onSelectCategory(cat, cat.restaurant as unknown as Restaurant)}
              className="p-5 flex flex-col items-center text-center group animate-fade-in-up"
            >
              <div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 overflow-hidden"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" />
                ) : (
                  getCategoryIcon(cat.name)
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">{cat.name}</h3>
              <p className="text-xs text-slate-400 mb-2">{cat.restaurant.name}</p>
              <div className="flex items-center gap-1 text-xs text-orange-600 font-semibold">
                {cat.product_count} produit{cat.product_count > 1 ? 's' : ''}
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
