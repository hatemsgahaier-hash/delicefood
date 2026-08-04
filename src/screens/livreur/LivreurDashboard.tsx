import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Delivery, Order, Restaurant, OrderItem } from '@/lib/supabase';
import { Card, Spinner, Button, Badge, EmptyState } from '@/components/ui';
import { Bike, Package, MapPin, Clock, CheckCircle2, Navigation, Star } from 'lucide-react';
import { DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS, ORDER_STATUS_LABELS, formatPrice, formatDate } from '@/lib/constants';
import NotificationBell from '@/components/NotificationBell';

interface DeliveryWithOrder extends Delivery {
  order: Order & { restaurant: Restaurant; order_items: OrderItem[] };
}

type Tab = 'available' | 'active' | 'history';

export default function LivreurDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('available');
  const [deliveries, setDeliveries] = useState<DeliveryWithOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDeliveries = useCallback(async () => {
    if (!profile) return;
    let query = supabase
      .from('deliveries')
      .select('*, order:orders(*, restaurant:restaurants(*), order_items:order_items(*))')
      .order('assigned_at', { ascending: false });

    if (tab === 'available') {
      query = query.or(`driver_id.is.null,driver_id.eq.${profile.id}`).eq('status', 'pending');
    } else if (tab === 'active') {
      query = query.eq('driver_id', profile.id).in('status', ['accepted', 'to_restaurant', 'picked_up', 'to_client']);
    } else {
      query = query.eq('driver_id', profile.id).in('status', ['delivered', 'refused']);
    }

    const { data } = await query;
    setDeliveries((data as any[]) ?? []);
    setLoading(false);
  }, [profile, tab]);

  useEffect(() => {
    setLoading(true);
    loadDeliveries();
    const interval = setInterval(loadDeliveries, 10000);
    return () => clearInterval(interval);
  }, [loadDeliveries]);

  async function acceptDelivery(deliveryId: string) {
    if (!profile) return;
    await supabase.from('deliveries').update({ driver_id: profile.id, status: 'accepted' }).eq('id', deliveryId);
    const delivery = deliveries.find((d) => d.id === deliveryId);
    if (delivery) {
      await supabase.from('orders').update({ status: 'driver_enroute' }).eq('id', delivery.order_id);
    }
    loadDeliveries();
  }

  async function refuseDelivery(deliveryId: string) {
    await supabase.from('deliveries').update({ status: 'refused' }).eq('id', deliveryId);
    loadDeliveries();
  }

  async function updateDeliveryStatus(deliveryId: string, status: Delivery['status'], orderId: string) {
    const updates: any = { status };
    if (status === 'picked_up') updates.picked_up_at = new Date().toISOString();
    if (status === 'delivered') {
      updates.delivered_at = new Date().toISOString();
      await supabase.from('orders').update({ status: 'delivered' }).eq('id', orderId);
    }
    await supabase.from('deliveries').update(updates).eq('id', deliveryId);
    loadDeliveries();
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 relative">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Espace Livreur</h1>
          <p className="text-sm text-slate-400">Gérez vos livraisons</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Badge className={profile?.is_available ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
            {profile?.is_available ? 'Disponible' : 'Indisponible'}
          </Badge>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6">
        {([
          { key: 'available', label: 'Disponibles', icon: Package },
          { key: 'active', label: 'En cours', icon: Navigation },
          { key: 'history', label: 'Historique', icon: Clock },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex-1 justify-center ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {deliveries.length === 0 ? (
        <EmptyState
          icon={<Bike className="w-8 h-8" />}
          title={tab === 'available' ? 'Aucune livraison disponible' : tab === 'active' ? 'Aucune livraison en cours' : 'Aucun historique'}
          message={tab === 'available' ? 'Les demandes de livraison apparaîtront ici.' : 'Vos livraisons passées apparaîtront ici.'}
        />
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-bold text-slate-900">#{delivery.order.id.slice(0, 8)}</span>
                  <p className="text-xs text-slate-400">{formatDate(delivery.assigned_at)}</p>
                </div>
                {tab !== 'available' && (
                  <Badge className={DELIVERY_STATUS_COLORS[delivery.status]}>
                    {DELIVERY_STATUS_LABELS[delivery.status]}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">{delivery.order.restaurant.name}</p>
                  <p className="text-xs text-slate-400">{delivery.order.restaurant.address}, {delivery.order.restaurant.city}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Navigation className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-700">{delivery.order.delivery_address.street}</p>
                  <p className="text-xs text-slate-400">{delivery.order.delivery_address.city}</p>
                </div>
              </div>

              <div className="text-sm text-slate-600 mb-3 border-t border-slate-100 pt-2">
                {delivery.order.order_items.map((item) => (
                  <div key={item.id}>{item.quantity}× {item.name}</div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">Montant: <span className="font-bold text-slate-700">{formatPrice(delivery.order.total)}</span></span>
              </div>

              {tab === 'available' && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => acceptDelivery(delivery.id)}>
                    <CheckCircle2 className="w-4 h-4" /> Accepter
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => refuseDelivery(delivery.id)}>Refuser</Button>
                </div>
              )}

              {tab === 'active' && (
                <div className="flex flex-wrap gap-2">
                  {delivery.status === 'accepted' && (
                    <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, 'to_restaurant', delivery.order_id)}>
                      En route vers le restaurant
                    </Button>
                  )}
                  {delivery.status === 'to_restaurant' && (
                    <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, 'picked_up', delivery.order_id)}>
                      Commande récupérée
                    </Button>
                  )}
                  {delivery.status === 'picked_up' && (
                    <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, 'to_client', delivery.order_id)}>
                      En route vers le client
                    </Button>
                  )}
                  {delivery.status === 'to_client' && (
                    <Button size="sm" onClick={() => updateDeliveryStatus(delivery.id, 'delivered', delivery.order_id)}>
                      <CheckCircle2 className="w-4 h-4" /> Marquer comme livrée
                    </Button>
                  )}
                </div>
              )}

              {tab === 'history' && delivery.status === 'delivered' && (
                <div className="text-sm text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Livrée le {delivery.delivered_at ? formatDate(delivery.delivered_at) : ''}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
