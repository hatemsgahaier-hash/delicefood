import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order, Restaurant } from '@/lib/supabase';
import { Card, Spinner, EmptyState, Badge } from '@/components/ui';
import { Clock, MapPin } from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, formatDate, formatPrice } from '@/lib/constants';

interface OrderWithRestaurant extends Order {
  restaurant: Restaurant;
}

export default function OrderHistory({
  userId,
  onSelectOrder,
}: {
  userId: string;
  onSelectOrder: (orderId: string) => void;
}) {
  const [orders, setOrders] = useState<OrderWithRestaurant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [userId]);

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('*, restaurant:restaurants(*)')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });
    setOrders((data as OrderWithRestaurant[]) ?? []);
    setLoading(false);
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Historique des commandes</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Aucune commande"
          message="Vous n'avez pas encore passé de commande."
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} onClick={() => onSelectOrder(order.id)} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-900">{order.restaurant.name}</h3>
                  <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                </div>
                <Badge className={ORDER_STATUS_COLORS[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> {order.delivery_address.city}
                </span>
                <span className="font-bold text-slate-900">{formatPrice(order.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
