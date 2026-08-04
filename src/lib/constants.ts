import type { OrderStatus, DeliveryStatus } from '@/lib/supabase';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  refused: 'Refusée',
  preparing: 'En préparation',
  ready: 'Prête',
  awaiting_driver: 'En attente d\'un livreur',
  driver_assigned: 'Livreur affecté',
  driver_enroute: 'Livreur en route',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  refused: 'bg-red-100 text-red-700 border-red-200',
  preparing: 'bg-orange-100 text-orange-700 border-orange-200',
  ready: 'bg-green-100 text-green-700 border-green-200',
  awaiting_driver: 'bg-purple-100 text-purple-700 border-purple-200',
  driver_assigned: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  driver_enroute: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-gray-200 text-gray-600 border-gray-300',
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'En attente',
  accepted: 'Acceptée',
  refused: 'Refusée',
  to_restaurant: 'En route vers le restaurant',
  picked_up: 'Commande récupérée',
  to_client: 'En route vers le client',
  delivered: 'Livrée',
};

export const DELIVERY_STATUS_COLORS: Record<DeliveryStatus, string> = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  accepted: 'bg-blue-100 text-blue-700 border-blue-200',
  refused: 'bg-red-100 text-red-700 border-red-200',
  to_restaurant: 'bg-orange-100 text-orange-700 border-orange-200',
  picked_up: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  to_client: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

export const ORDER_WORKFLOW: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'awaiting_driver',
  'driver_assigned',
  'driver_enroute',
  'delivered',
];

export function formatPrice(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
