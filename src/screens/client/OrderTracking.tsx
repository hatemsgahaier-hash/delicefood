import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, Restaurant, Delivery } from '@/lib/supabase';
import { Card, Spinner, Button, Badge, EmptyState } from '@/components/ui';
import { Package, MapPin, Clock, Star, X, CheckCircle2, Bike } from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_WORKFLOW, formatPrice, formatDate } from '@/lib/constants';

interface OrderWithDetails extends Order {
  restaurant: Restaurant;
  order_items: OrderItem[];
  deliveries: Delivery[];
}

export default function OrderTracking({
  orderId,
  onBack,
}: {
  orderId: string;
  onBack: () => void;
}) {
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewTarget, setReviewTarget] = useState<'restaurant' | 'driver'>('restaurant');
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  async function loadOrder() {
    const { data } = await supabase
      .from('orders')
      .select('*, restaurant:restaurants(*), order_items:order_items(*), deliveries:deliveries(*)')
      .eq('id', orderId)
      .maybeSingle();
    if (data) {
      setOrder(data as OrderWithDetails);
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();
      setHasReviewed(!!existingReview);
    }
    setLoading(false);
  }

  async function submitReview() {
    if (!order) return;
    const delivery = order.deliveries?.[0];
    const targetId = reviewTarget === 'restaurant' ? order.restaurant_id : delivery?.driver_id;
    if (!targetId) return;

    await supabase.from('reviews').insert({
      client_id: order.client_id,
      order_id: order.id,
      restaurant_id: reviewTarget === 'restaurant' ? order.restaurant_id : null,
      driver_id: reviewTarget === 'driver' ? delivery?.driver_id : null,
      rating,
      comment: comment || null,
      target_type: reviewTarget,
    });

    setShowReview(false);
    setHasReviewed(true);
    setComment('');
  }

  async function cancelOrder() {
    if (!order) return;
    await supabase.from('orders').update({ status: 'cancelled' }).eq('id', order.id);
    loadOrder();
  }

  if (loading) return <Spinner />;
  if (!order) return <EmptyState icon={<Package className="w-8 h-8" />} title="Commande introuvable" message="Cette commande n'existe pas." />;

  const currentStepIndex = ORDER_WORKFLOW.indexOf(order.status);
  const canCancel = ['pending', 'accepted', 'preparing'].includes(order.status);
  const canReview = order.status === 'delivered' && !hasReviewed;
  const hasDriver = order.deliveries?.[0]?.driver_id;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <Clock className="w-4 h-4" /> Retour à l'historique
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Commande #{order.id.slice(0, 8)}</h1>
          <p className="text-sm text-slate-400">{formatDate(order.created_at)}</p>
        </div>
        <Badge className={ORDER_STATUS_COLORS[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>

      {order.status !== 'cancelled' && order.status !== 'refused' && (
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            {ORDER_WORKFLOW.map((step, i) => {
              const isDone = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      isDone ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'
                    } ${isCurrent ? 'ring-4 ring-orange-100' : ''}`}>
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                    </div>
                    <span className={`text-xs text-center w-16 ${isDone ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                      {ORDER_STATUS_LABELS[step]}
                    </span>
                  </div>
                  {i < ORDER_WORKFLOW.length - 1 && (
                    <div className={`flex-1 h-1 mx-1 rounded-full transition-all ${i < currentStepIndex ? 'bg-orange-500' : 'bg-slate-100'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">{order.restaurant.name}</h3>
            <p className="text-sm text-slate-400">{order.restaurant.city}</p>
          </div>
        </div>

        <div className="flex items-start gap-3 mb-4 text-sm">
          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
          <div>
            <p className="text-slate-600">{order.delivery_address.street}</p>
            <p className="text-slate-400">{order.delivery_address.city} {order.delivery_address.postal_code}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <div>
                <span className="font-medium text-slate-700">{item.quantity}× {item.name}</span>
                {item.supplements.length > 0 && (
                  <p className="text-xs text-slate-400 ml-4">+ {item.supplements.map((s) => s.name).join(', ')}</p>
                )}
                {(item.drinks ?? []).length > 0 && (
                  <p className="text-xs text-slate-400 ml-4">+ {item.drinks.map((d) => d.name).join(', ')}</p>
                )}
              </div>
              <span className="text-slate-600">{formatPrice(item.unit_price * item.quantity)}</span>
            </div>
          ))}
          <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </Card>

      {hasDriver && order.status === 'driver_enroute' && (
        <Card className="p-5 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Bike className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Livreur en route</h3>
              <p className="text-sm text-slate-400">Votre commande arrive bientôt</p>
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-3">
        {canCancel && (
          <Button variant="outline" onClick={cancelOrder} className="flex-1">
            <X className="w-4 h-4 mr-1" /> Annuler
          </Button>
        )}
        {canReview && (
          <Button onClick={() => setShowReview(true)} className="flex-1">
            <Star className="w-4 h-4 mr-1" /> Évaluer
          </Button>
        )}
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowReview(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Évaluer</h2>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setReviewTarget('restaurant')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  reviewTarget === 'restaurant' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500'
                }`}
              >
                Restaurant
              </button>
              {hasDriver && (
                <button
                  onClick={() => setReviewTarget('driver')}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    reviewTarget === 'driver' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Livreur
                </button>
              )}
            </div>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                  <Star className={`w-8 h-8 ${star <= rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Laissez un commentaire (optionnel)..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400 resize-none mb-4"
              rows={3}
            />

            <Button onClick={submitReview} className="w-full">Publier l'avis</Button>
          </div>
        </div>
      )}
    </div>
  );
}
