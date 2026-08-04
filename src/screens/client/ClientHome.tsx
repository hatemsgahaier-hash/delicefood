import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/lib/supabase';
import { Card, Input, Spinner, EmptyState } from '@/components/ui';
import { Search, Star, MapPin, UtensilsCrossed } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import NotificationBell from '@/components/NotificationBell';

interface RestaurantWithDetails extends Restaurant {
  product_count?: number;
}

export default function ClientHome({
  onSelectRestaurant,
}: {
  onSelectRestaurant: (restaurant: Restaurant) => void;
}) {
  const [restaurants, setRestaurants] = useState<RestaurantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadRestaurants();
  }, []);

  async function loadRestaurants() {
    setLoading(true);
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .order('rating', { ascending: false });
    setRestaurants((data as Restaurant[]) ?? []);
    setLoading(false);
  }

  const filtered = restaurants.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Bienvenue</h1>
          <p className="text-slate-500">Découvrez les meilleurs restaurants près de chez vous</p>
        </div>
        <div className="relative"><NotificationBell /></div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          placeholder="Rechercher un restaurant ou une ville..."
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
          title="Aucun restaurant"
          message="Aucun restaurant ne correspond à votre recherche pour le moment."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((r) => (
            <Card key={r.id} onClick={() => onSelectRestaurant(r)} className="overflow-hidden group">
              <div className="h-40 bg-gradient-to-br from-orange-100 to-amber-100 relative overflow-hidden">
                {r.cover_url ? (
                  <img src={r.cover_url} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-12 h-12 text-orange-300" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <div className="flex items-center gap-1 bg-white/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-amber-600">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {r.rating > 0 ? r.rating.toFixed(1) : 'Nouveau'}
                  </div>
                </div>
                {!r.is_open && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="text-white font-bold text-sm bg-red-500 px-3 py-1 rounded-full">Fermé</span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-slate-900 mb-1">{r.name}</h3>
                {r.description && <p className="text-sm text-slate-500 line-clamp-2 mb-2">{r.description}</p>}
                <div className="flex items-center gap-1 text-sm text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{r.city}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
