import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Restaurant, Category, Product, Order, OrderItem, Delivery } from '@/lib/supabase';
import { Card, Spinner, Button, Input, Textarea, Select, Badge, EmptyState, Modal } from '@/components/ui';
import { UtensilsCrossed, Plus, Edit, Trash2, Package, LayoutGrid, Tag, Star, TrendingUp, DollarSign, Clock, Bike, Printer } from 'lucide-react';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, DELIVERY_STATUS_LABELS, DELIVERY_STATUS_COLORS, formatPrice, formatDate } from '@/lib/constants';
import NotificationBell from '@/components/NotificationBell';

type Tab = 'overview' | 'orders' | 'deliveries' | 'products' | 'categories';

export default function RestaurateurDashboard() {
  const { profile } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [showRestaurantModal, setShowRestaurantModal] = useState(false);

  const loadRestaurant = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase.from('restaurants').select('*').eq('owner_id', profile.id).maybeSingle();
    setRestaurant(data as Restaurant | null);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    loadRestaurant();
  }, [loadRestaurant]);

  if (loading) return <Spinner />;

  if (!restaurant) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <EmptyState
          icon={<UtensilsCrossed className="w-8 h-8" />}
          title="Aucun restaurant"
          message="Créez votre restaurant pour commencer à recevoir des commandes."
        />
        <div className="text-center mt-4">
          <Button onClick={() => setShowRestaurantModal(true)}>
            <Plus className="w-4 h-4" /> Créer mon restaurant
          </Button>
        </div>
        <RestaurantFormModal
          open={showRestaurantModal}
          onClose={() => setShowRestaurantModal(false)}
          onSaved={loadRestaurant}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{restaurant.name}</h1>
          <p className="text-sm text-slate-400">{restaurant.city}</p>
        </div>
        <div className="flex items-center gap-2 relative">
          <NotificationBell />
          <button
            onClick={async () => {
              const newVal = !restaurant.is_open;
              await supabase.from('restaurants').update({ is_open: newVal }).eq('id', restaurant.id);
              setRestaurant({ ...restaurant, is_open: newVal });
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer hover:shadow-sm ${
              restaurant.is_open
                ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
                : 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200'
            }`}
          >
            {restaurant.is_open ? 'Ouvert' : 'Fermé'} — Cliquer pour basculer
          </button>
          <Button size="sm" variant="outline" onClick={() => setShowRestaurantModal(true)}>
            <Edit className="w-4 h-4" /> Modifier
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-6 overflow-x-auto">
        {([
          { key: 'overview', label: 'Aperçu', icon: TrendingUp },
          { key: 'orders', label: 'Commandes', icon: Package },
          { key: 'deliveries', label: 'Livraisons', icon: Bike },
          { key: 'products', label: 'Produits', icon: UtensilsCrossed },
          { key: 'categories', label: 'Catégories', icon: LayoutGrid },
        ] as const).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && <OverviewTab restaurant={restaurant} />}
      {tab === 'orders' && <OrdersTab restaurantId={restaurant.id} />}
      {tab === 'deliveries' && <DeliveriesTab restaurantId={restaurant.id} />}
      {tab === 'products' && <ProductsTab restaurantId={restaurant.id} />}
      {tab === 'categories' && <CategoriesTab restaurantId={restaurant.id} />}

      <RestaurantFormModal
        open={showRestaurantModal}
        onClose={() => setShowRestaurantModal(false)}
        onSaved={loadRestaurant}
        existing={restaurant}
      />
    </div>
  );
}

function OverviewTab({ restaurant }: { restaurant: Restaurant }) {
  const [stats, setStats] = useState({ totalOrders: 0, pendingOrders: 0, revenue: 0, avgRating: 0 });

  useEffect(() => {
    (async () => {
      const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id);
      const { count: pendingCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id).in('status', ['pending', 'accepted', 'preparing']);
      const { data: orders } = await supabase.from('orders').select('total').eq('restaurant_id', restaurant.id).eq('status', 'delivered');
      const revenue = (orders ?? []).reduce((sum: number, o: any) => sum + Number(o.total), 0);
      const { data: reviews } = await supabase.from('reviews').select('rating').eq('restaurant_id', restaurant.id);
      const avg = reviews && reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;
      setStats({ totalOrders: count ?? 0, pendingOrders: pendingCount ?? 0, revenue, avgRating: avg });
    })();
  }, [restaurant.id]);

  const cards = [
    { label: 'Commandes totales', value: stats.totalOrders, icon: Package, color: 'text-blue-600 bg-blue-100' },
    { label: 'En cours', value: stats.pendingOrders, icon: Clock, color: 'text-orange-600 bg-orange-100' },
    { label: 'Chiffre d\'affaires', value: formatPrice(stats.revenue), icon: DollarSign, color: 'text-green-600 bg-green-100' },
    { label: 'Note moyenne', value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ★` : 'N/A', icon: Star, color: 'text-amber-600 bg-amber-100' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${c.color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-sm text-slate-400">{c.label}</p>
          </Card>
        );
      })}
    </div>
  );
}

function OrdersTab({ restaurantId }: { restaurantId: string }) {
  const [orders, setOrders] = useState<(Order & { order_items: OrderItem[]; deliveries: Delivery[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from('orders')
      .select('*, order_items:order_items(*), deliveries:deliveries(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });
    setOrders((data as any[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  async function updateStatus(orderId: string, status: Order['status']) {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    loadOrders();
  }

  function printReceipt(order: Order & { order_items: OrderItem[] }) {
    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) return;
    const itemsHtml = order.order_items.map((item) => `
      <tr>
        <td>${item.quantity}× ${item.name}</td>
        <td style="text-align:right">${formatPrice(item.unit_price * item.quantity)}</td>
      </tr>
      ${item.supplements.length > 0 ? `<tr><td colspan="2" style="padding-left:16px;font-size:11px;color:#666">+ ${item.supplements.map((s) => s.name).join(', ')}</td></tr>` : ''}
    `).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket #${order.id.slice(0, 8)}</title>
      <style>
        * { font-family: 'Courier New', monospace; }
        body { width: 80mm; margin: 0 auto; padding: 8px; color: #000; }
        h1 { font-size: 18px; text-align: center; margin: 0 0 4px; }
        .info { font-size: 12px; text-align: center; margin-bottom: 8px; color: #333; }
        table { width: 100%; font-size: 13px; border-collapse: collapse; }
        td { padding: 2px 0; }
        .total { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; }
        .addr { font-size: 12px; margin: 8px 0; padding: 4px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
        .footer { text-align: center; font-size: 11px; margin-top: 12px; color: #333; }
        @media print { body { width: auto; } }
      </style></head><body>
      <h1>FoodExpress</h1>
      <div class="info">Ticket de caisse<br>${formatDate(order.created_at)}</div>
      <div class="info">Commande #${order.id.slice(0, 8)}</div>
      <table>${itemsHtml}</table>
      <div class="addr">Livraison: ${order.delivery_address.street}, ${order.delivery_address.city}</div>
      <div class="total"><span>TOTAL</span><span>${formatPrice(order.total)}</span></div>
      ${order.notes ? `<div class="info" style="text-align:left">Notes: ${order.notes}</div>` : ''}
      <div class="footer">Merci de votre confiance!</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  }

  async function assignDriver(orderId: string, driverId: string) {
    await supabase.from('deliveries').insert({
      order_id: orderId,
      driver_id: driverId,
      status: 'pending',
    });
    await supabase.from('orders').update({ status: 'driver_assigned' }).eq('id', orderId);
    loadOrders();
  }

  if (loading) return <Spinner />;

  const currentOrder = selectedOrder ? orders.find((o) => o.id === selectedOrder) : null;

  return (
    <div>
      {orders.length === 0 ? (
        <EmptyState icon={<Package className="w-8 h-8" />} title="Aucune commande" message="Les nouvelles commandes apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-bold text-slate-900">#{order.id.slice(0, 8)}</span>
                  <p className="text-xs text-slate-400">{formatDate(order.created_at)}</p>
                </div>
                <Badge className={ORDER_STATUS_COLORS[order.status]}>{ORDER_STATUS_LABELS[order.status]}</Badge>
              </div>

              <div className="text-sm text-slate-600 mb-3">
                {order.order_items.map((item) => (
                  <div key={item.id}>{item.quantity}× {item.name}</div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-400">{order.delivery_address.street}, {order.delivery_address.city}</span>
                <span className="font-bold text-slate-900">{formatPrice(order.total)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {order.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => updateStatus(order.id, 'accepted')}>Accepter</Button>
                    <Button size="sm" variant="danger" onClick={() => updateStatus(order.id, 'refused')}>Refuser</Button>
                  </>
                )}
                {order.status === 'accepted' && (
                  <Button size="sm" onClick={() => updateStatus(order.id, 'preparing')}>Commencer préparation</Button>
                )}
                {['accepted', 'preparing', 'ready', 'awaiting_driver', 'driver_assigned', 'driver_enroute', 'delivered'].includes(order.status) && (
                  <Button size="sm" variant="outline" onClick={() => printReceipt(order)}>
                    <Printer className="w-4 h-4" /> Ticket
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button size="sm" onClick={() => updateStatus(order.id, 'ready')}>Marquer comme prête</Button>
                )}
                {order.status === 'ready' && (
                  <DriverAssign orderId={order.id} onAssign={assignDriver} />
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order.id)}>Détails</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!currentOrder} onClose={() => setSelectedOrder(null)} title="Détails de la commande">
        {currentOrder && (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-slate-400">Adresse</p>
              <p className="text-slate-700">{currentOrder.delivery_address.label}</p>
              <p className="text-slate-700">{currentOrder.delivery_address.street}, {currentOrder.delivery_address.city}</p>
            </div>
            <div className="border-t border-slate-100 pt-3">
              <p className="text-sm text-slate-400 mb-2">Articles</p>
              {currentOrder.order_items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span>{item.quantity}× {item.name}</span>
                  <span>{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 flex justify-between font-bold">
                <span>Total</span><span>{formatPrice(currentOrder.total)}</span>
              </div>
            </div>
            {currentOrder.notes && (
              <div>
                <p className="text-sm text-slate-400">Notes</p>
                <p className="text-slate-600">{currentOrder.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function DriverAssign({ orderId, onAssign }: { orderId: string; onAssign: (orderId: string, driverId: string) => void }) {
  const [drivers, setDrivers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name').eq('role', 'livreur').eq('is_available', true)
      .then(({ data }) => setDrivers((data as any[]) ?? []));
  }, []);

  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" /> Affecter un livreur
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Affecter un livreur">
        {drivers.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun livreur disponible pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {drivers.map((d) => (
              <button
                key={d.id}
                onClick={() => { onAssign(orderId, d.id); setOpen(false); }}
                className="w-full p-3 rounded-xl border border-slate-200 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="font-medium text-slate-700">{d.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

function DeliveriesTab({ restaurantId }: { restaurantId: string }) {
  const [deliveries, setDeliveries] = useState<(Delivery & { order: Order & { order_items: OrderItem[] } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string; is_available: boolean }[]>([]);
  const [reassigning, setReassigning] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('deliveries')
      .select('*, order:orders(*, order_items:order_items(*))')
      .eq('order.restaurant_id', restaurantId)
      .order('assigned_at', { ascending: false });
    setDeliveries((data as any[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    supabase.from('profiles').select('id, full_name, is_available').eq('role', 'livreur')
      .then(({ data }) => setDrivers((data as any[]) ?? []));
  }, []);

  async function reassignDriver(deliveryId: string, newDriverId: string) {
    await supabase.from('deliveries').update({ driver_id: newDriverId, status: 'pending' }).eq('id', deliveryId);
    setReassigning(null);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-4">Gestion des livraisons</h2>
      {deliveries.length === 0 ? (
        <EmptyState icon={<Bike className="w-8 h-8" />} title="Aucune livraison" message="Les livraisons de vos commandes apparaîtront ici." />
      ) : (
        <div className="space-y-3">
          {deliveries.map((delivery) => (
            <Card key={delivery.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-bold text-slate-900">#{delivery.order.id.slice(0, 8)}</span>
                  <p className="text-xs text-slate-400">{formatDate(delivery.assigned_at)}</p>
                </div>
                <Badge className={DELIVERY_STATUS_COLORS[delivery.status]}>
                  {DELIVERY_STATUS_LABELS[delivery.status]}
                </Badge>
              </div>

              <div className="text-sm text-slate-600 mb-3 border-t border-slate-100 pt-2">
                {delivery.order.order_items.map((item) => (
                  <div key={item.id}>{item.quantity}× {item.name}</div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-400">Livreur: </span>
                  <span className="font-medium text-slate-700">
                    {drivers.find((d) => d.id === delivery.driver_id)?.full_name ?? 'Non affecté'}
                  </span>
                </div>
                <span className="font-bold text-slate-900">{formatPrice(delivery.order.total)}</span>
              </div>

              {delivery.status !== 'delivered' && delivery.status !== 'refused' && (
                <div className="mt-3">
                  {reassigning === delivery.id ? (
                    <div className="flex gap-2 flex-wrap">
                      {drivers.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => reassignDriver(delivery.id, d.id)}
                          disabled={!d.is_available}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all ${
                            d.is_available
                              ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100'
                              : 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                          }`}
                        >
                          {d.full_name} {d.is_available ? '' : '(indispo.)'}
                        </button>
                      ))}
                      <button onClick={() => setReassigning(null)} className="text-xs px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setReassigning(delivery.id)}>
                      {delivery.driver_id ? 'Modifier l\'affectation' : 'Affecter un livreur'}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductsTab({ restaurantId }: { restaurantId: string }) {
  const [products, setProducts] = useState<(Product & { category: Category })[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*, category:categories(*)').eq('restaurant_id', restaurantId).order('name');
    setProducts((data as any[]) ?? []);
    const { data: cats } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('name');
    setCategories((cats as Category[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  async function toggleAvailability(product: Product) {
    await supabase.from('products').update({ is_available: !product.is_available }).eq('id', product.id);
    load();
  }

  async function deleteProduct(id: string) {
    await supabase.from('products').delete().eq('id', id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-slate-900">Produits ({products.length})</h2>
        <Button size="sm" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      {products.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed className="w-8 h-8" />} title="Aucun produit" message="Ajoutez vos premiers produits au menu." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {products.map((p) => (
            <Card key={p.id} className="p-4 flex gap-3">
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{p.name}</h3>
                <p className="text-xs text-slate-400">{p.category?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-slate-700">{formatPrice(p.price)}</span>
                  {p.promotion_price && p.promotion_price < p.price && (
                    <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                      <Tag className="w-3 h-3" /> Promo
                    </Badge>
                  )}
                </div>
                <div className="flex gap-1 mt-2">
                  <button onClick={() => toggleAvailability(p)} className={`text-xs px-2 py-1 rounded-lg font-medium ${p.is_available ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-100'}`}>
                    {p.is_available ? 'Disponible' : 'Indisponible'}
                  </button>
                  <button onClick={() => { setEditing(p); setShowModal(true); }} className="text-xs px-2 py-1 rounded-lg text-blue-600 bg-blue-50">
                    <Edit className="w-3 h-3" />
                  </button>
                  <button onClick={() => deleteProduct(p.id)} className="text-xs px-2 py-1 rounded-lg text-red-500 bg-red-50">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ProductFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSaved={load}
        restaurantId={restaurantId}
        categories={categories}
        product={editing}
      />
    </div>
  );
}

function ProductFormModal({
  open, onClose, onSaved, restaurantId, categories, product,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  restaurantId: string;
  categories: Category[];
  product: Product | null;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [promoPrice, setPromoPrice] = useState('');
  const [available, setAvailable] = useState(true);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  const [supplements, setSupplements] = useState<{ id: string; name: string; price: number }[]>([]);
  const [newSuppName, setNewSuppName] = useState('');
  const [newSuppPrice, setNewSuppPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? '');
      setPrice(String(product.price));
      setCategoryId(product.category_id);
      setImageUrl(product.image_url ?? '');
      setPromoPrice(product.promotion_price ? String(product.promotion_price) : '');
      setAvailable(product.is_available);
      setIngredients(product.ingredients ?? []);
      supabase
        .from('product_supplements')
        .select('supplement_id, supplements(id, name, price)')
        .eq('product_id', product.id)
        .then(({ data: prodSupps }) => {
          setSupplements((prodSupps ?? []).map((row: any) => row.supplements).filter(Boolean));
        });
    } else {
      setName(''); setDescription(''); setPrice(''); setCategoryId(categories[0]?.id ?? '');
      setImageUrl(''); setPromoPrice(''); setAvailable(true); setIngredients([]); setSupplements([]);
    }
    setNewIngredient(''); setNewSuppName(''); setNewSuppPrice('');
  }, [product, open, categories]);

  function addIngredient() {
    const val = newIngredient.trim();
    if (!val || ingredients.includes(val)) return;
    setIngredients((prev) => [...prev, val]);
    setNewIngredient('');
  }

  function removeIngredient(ing: string) {
    setIngredients((prev) => prev.filter((i) => i !== ing));
  }

  function addSupplement() {
    const val = newSuppName.trim();
    if (!val || supplements.some((s) => s.name === val)) return;
    setSupplements((prev) => [...prev, { id: crypto.randomUUID(), name: val, price: parseFloat(newSuppPrice) || 0 }]);
    setNewSuppName(''); setNewSuppPrice('');
  }

  function removeSupplement(id: string) {
    setSupplements((prev) => prev.filter((s) => s.id !== id));
  }

  async function save() {
    if (!name || !price || !categoryId) return;
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      category_id: categoryId,
      name,
      description: description || null,
      price: parseFloat(price),
      image_url: imageUrl || null,
      promotion_price: promoPrice ? parseFloat(promoPrice) : null,
      is_available: available,
      ingredients,
    };
    let productId = product?.id;
    if (product) {
      await supabase.from('products').update(payload).eq('id', product.id);
    } else {
      const { data: newProd } = await supabase.from('products').insert(payload).select().single();
      productId = newProd?.id;
    }
    if (productId) {
      await supabase.from('product_supplements').delete().eq('product_id', productId);
      for (const supp of supplements) {
        let suppId = supp.id;
        const { data: existing } = await supabase.from('supplements').select('id').eq('restaurant_id', restaurantId).eq('name', supp.name).maybeSingle();
        if (existing) {
          suppId = existing.id;
          await supabase.from('supplements').update({ price: supp.price }).eq('id', suppId);
        } else {
          const { data: newSupp } = await supabase.from('supplements').insert({ restaurant_id: restaurantId, name: supp.name, price: supp.price }).select().single();
          suppId = newSupp?.id;
        }
        if (suppId) {
          await supabase.from('product_supplements').insert({ product_id: productId, supplement_id: suppId });
        }
      }
    }
    setSaving(false);
    onClose();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={product ? 'Modifier le produit' : 'Nouveau produit'}>
      <div className="space-y-3">
        <Input label="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prix (€)" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          <Input label="Prix promo (€)" type="number" step="0.01" value={promoPrice} onChange={(e) => setPromoPrice(e.target.value)} />
        </div>
        <Select label="Catégorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="URL de l'image" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Ingrédients</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newIngredient}
              onChange={(e) => setNewIngredient(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
              placeholder="Ex: Tomate, Mozzarella..."
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-400"
            />
            <button
              type="button"
              onClick={addIngredient}
              className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {ingredients.map((ing) => (
                <span key={ing} className="flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded-full text-xs font-medium">
                  {ing}
                  <button type="button" onClick={() => removeIngredient(ing)} className="hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Suppléments</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newSuppName}
              onChange={(e) => setNewSuppName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSupplement())}
              placeholder="Nom du supplément"
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-400"
            />
            <input
              type="number"
              step="0.01"
              value={newSuppPrice}
              onChange={(e) => setNewSuppPrice(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSupplement())}
              placeholder="Prix €"
              className="w-20 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-orange-400"
            />
            <button
              type="button"
              onClick={addSupplement}
              className="px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {supplements.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {supplements.map((s) => (
                <span key={s.id} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                  {s.name} (+{s.price.toFixed(2)} €)
                  <button type="button" onClick={() => removeSupplement(s.id)} className="hover:text-red-500 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} className="w-4 h-4 accent-orange-500" />
          Disponible à la vente
        </label>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
      </div>
    </Modal>
  );
}

function CategoriesTab({ restaurantId }: { restaurantId: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('categories').select('*').eq('restaurant_id', restaurantId).order('sort_order');
    setCategories((data as Category[]) ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { load(); }, [load]);

  async function addCategory() {
    if (!newName) return;
    await supabase.from('categories').insert({ restaurant_id: restaurantId, name: newName });
    setNewName('');
    load();
  }

  async function updateCategory(id: string, name: string) {
    await supabase.from('categories').update({ name }).eq('id', id);
    setEditing(null);
    load();
  }

  async function deleteCategory(id: string) {
    await supabase.from('categories').delete().eq('id', id);
    load();
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h2 className="font-bold text-slate-900 mb-4">Catégories du menu</h2>
      <div className="flex gap-2 mb-4">
        <Input placeholder="Nom de la catégorie" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1" />
        <Button onClick={addCategory}><Plus className="w-4 h-4" /> Ajouter</Button>
      </div>
      {categories.length === 0 ? (
        <EmptyState icon={<LayoutGrid className="w-8 h-8" />} title="Aucune catégorie" message="Créez des catégories pour organiser votre menu." />
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <Card key={cat.id} className="p-3 flex items-center justify-between">
              {editing?.id === cat.id ? (
                <input
                  defaultValue={cat.name}
                  onBlur={(e) => updateCategory(cat.id, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateCategory(cat.id, (e.target as HTMLInputElement).value)}
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-orange-400"
                  autoFocus
                />
              ) : (
                <span className="font-medium text-slate-700">{cat.name}</span>
              )}
              <div className="flex gap-1">
                <button onClick={() => setEditing(cat)} className="text-xs px-2 py-1 rounded-lg text-blue-600 bg-blue-50">
                  <Edit className="w-3 h-3" />
                </button>
                <button onClick={() => deleteCategory(cat.id)} className="text-xs px-2 py-1 rounded-lg text-red-500 bg-red-50">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantFormModal({
  open, onClose, onSaved, existing,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing?: Restaurant | null;
}) {
  const { profile } = useAuth();
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(existing?.logo_url ?? '');
  const [coverUrl, setCoverUrl] = useState(existing?.cover_url ?? '');
  const [isOpen, setIsOpen] = useState(existing?.is_open ?? true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name); setDescription(existing.description ?? ''); setAddress(existing.address);
      setCity(existing.city); setPhone(existing.phone ?? ''); setLogoUrl(existing.logo_url ?? '');
      setCoverUrl(existing.cover_url ?? ''); setIsOpen(existing.is_open);
    }
  }, [existing, open]);

  async function save() {
    if (!name || !address || !city || !profile) return;
    setSaving(true);
    const payload = {
      owner_id: profile.id,
      name, description: description || null, address, city,
      phone: phone || null, logo_url: logoUrl || null, cover_url: coverUrl || null,
      is_open: isOpen,
    };
    if (existing) {
      await supabase.from('restaurants').update(payload).eq('id', existing.id);
    } else {
      await supabase.from('restaurants').insert(payload);
    }
    setSaving(false);
    onClose();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Modifier le restaurant' : 'Créer mon restaurant'}>
      <div className="space-y-3">
        <Input label="Nom du restaurant" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <Input label="Adresse" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Ville" value={city} onChange={(e) => setCity(e.target.value)} />
          <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input label="URL Logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
        <Input label="URL Cover" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} className="w-4 h-4 accent-orange-500" />
          Restaurant ouvert
        </label>
        <Button onClick={save} disabled={saving} className="w-full">{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
      </div>
    </Modal>
  );
}
