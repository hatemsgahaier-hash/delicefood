import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Cart, CartItem, Product, Supplement, Drink, Address, Order } from '@/lib/supabase';
import { Button, Card, Spinner, EmptyState, Select, Badge } from '@/components/ui';
import { ShoppingCart, Trash2, Minus, Plus, MapPin, CreditCard, Tag, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { formatPrice } from '@/lib/constants';

interface CartRow extends CartItem {
  product: { name: string; image_url: string | null };
}

export default function CartScreen({
  userId,
  onBack,
  onOrderPlaced,
}: {
  userId: string;
  onBack: () => void;
  onOrderPlaced: (order: Order) => void;
}) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [items, setItems] = useState<CartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'wallet'>('card');
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [placing, setPlacing] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    setLoading(true);
    const { data: cartData } = await supabase
      .from('carts')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    const c = cartData as Cart | null;
    setCart(c);

    if (c) {
      const { data: itemsData } = await supabase
        .from('cart_items')
        .select('*, product:products(name, image_url)')
        .eq('cart_id', c.id);
      setItems((itemsData as CartRow[]) ?? []);
    } else {
      setItems([]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    supabase.from('addresses').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      .then(({ data }) => {
        setAddresses((data as Address[]) ?? []);
        if (data && data.length > 0) setSelectedAddressId(data[0].id);
      });
  }, [userId]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity
      + item.supplements.reduce((s, sup) => s + sup.price * item.quantity, 0)
      + (item.drinks ?? []).reduce((s, d) => s + d.price * item.quantity, 0),
    0
  );
  const deliveryFee = 2.99;
  const discount = appliedPromo === 'BIENVENUE' ? subtotal * 0.1 : 0;
  const total = Math.max(0, subtotal + deliveryFee - discount);

  async function updateQuantity(itemId: string, currentQty: number, delta: number) {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      await supabase.from('cart_items').delete().eq('id', itemId);
    } else {
      await supabase.from('cart_items').update({ quantity: newQty }).eq('id', itemId);
    }
    loadCart();
  }

  async function removeItem(itemId: string) {
    await supabase.from('cart_items').delete().eq('id', itemId);
    loadCart();
  }

  async function placeOrder() {
    if (!cart || items.length === 0) return;
    const address = addresses.find((a) => a.id === selectedAddressId);
    if (!address) return;
    setPlacing(true);
    setOrderError(null);

    const { data: orderData, error } = await supabase
      .from('orders')
      .insert({
        client_id: userId,
        restaurant_id: cart.restaurant_id,
        delivery_address: {
          label: address.label,
          street: address.street,
          city: address.city,
          postal_code: address.postal_code,
        },
        total,
        promo_code: appliedPromo || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !orderData) {
      setOrderError(error?.message ?? 'Échec de la création de la commande.');
      setPlacing(false);
      return;
    }

    const order = orderData as Order;

    const { error: itemsError } = await supabase.from('order_items').insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        supplements: item.supplements,
        drinks: item.drinks ?? [],
      }))
    );

    if (itemsError) {
      setOrderError('Échec de l\'ajout des articles: ' + itemsError.message);
      setPlacing(false);
      return;
    }

    await supabase.from('payments').insert({
      order_id: order.id,
      method: paymentMethod,
      amount: total,
      status: paymentMethod === 'cash' ? 'pending' : 'paid',
    });

    await supabase.from('cart_items').delete().eq('cart_id', cart.id);
    await supabase.from('carts').delete().eq('id', cart.id);

    setPlacing(false);
    onOrderPlaced(order);
  }

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6" /> Mon panier
      </h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="Panier vide"
          message="Ajoutez des produits depuis le menu d'un restaurant."
        />
      ) : checkoutMode ? (
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" /> Adresse de livraison
            </h2>
            {addresses.length === 0 ? (
              <p className="text-sm text-slate-400">Ajoutez une adresse depuis votre profil.</p>
            ) : (
              <Select value={selectedAddressId} onChange={(e) => setSelectedAddressId(e.target.value)}>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} — {a.street}, {a.city}
                  </option>
                ))}
              </Select>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-orange-500" /> Mode de paiement
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(['card', 'cash', 'wallet'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPaymentMethod(m)}
                  className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                    paymentMethod === m ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {m === 'card' ? 'Carte' : m === 'cash' ? 'Espèces' : 'Portefeuille'}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-500" /> Code promotionnel
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Essayez BIENVENUE"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-400"
              />
              <Button
                variant="secondary"
                onClick={() => setAppliedPromo(promoCode)}
              >
                Appliquer
              </Button>
            </div>
            {appliedPromo === 'BIENVENUE' && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Code appliqué : -10%
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Frais de livraison</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Réduction</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900 text-base">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
            {orderError && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
                {orderError}
              </div>
            )}
            <Button onClick={placeOrder} disabled={placing || addresses.length === 0} className="w-full mt-4" size="lg">
              {placing ? 'Traitement...' : `Confirmer — ${formatPrice(total)}`}
            </Button>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                {item.product.image_url && <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{item.product.name}</h3>
                {item.supplements.length > 0 && (
                  <p className="text-xs text-slate-400 truncate">
                    {item.supplements.map((s) => s.name).join(', ')}
                  </p>
                )}
                {(item.drinks ?? []).length > 0 && (
                  <p className="text-xs text-slate-400 truncate">
                    {item.drinks.map((d) => d.name).join(', ')}
                  </p>
                )}
                <p className="text-sm font-bold text-orange-600 mt-1">
                  {formatPrice(item.unit_price * item.quantity
                    + item.supplements.reduce((s, sup) => s + sup.price * item.quantity, 0)
                    + (item.drinks ?? []).reduce((s, d) => s + d.price * item.quantity, 0))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(item.id, item.quantity, -1)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-semibold text-slate-700 w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity, 1)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => removeItem(item.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}

          <Card className="p-5">
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Frais de livraison</span>
                <span>{formatPrice(deliveryFee)}</span>
              </div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-900 text-base">
                <span>Total</span>
                <span>{formatPrice(subtotal + deliveryFee)}</span>
              </div>
            </div>
            <Button onClick={() => setCheckoutMode(true)} className="w-full" size="lg">
              Passer la commande
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}

export async function addToCart(
  userId: string,
  restaurantId: string,
  product: Product,
  supplements: Supplement[],
  drinks: Drink[]
) {
  let { data: cart, error } = await supabase
    .from('carts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!cart) {
    const { data: newCart, error: insertError } = await supabase
      .from('carts')
      .insert({ user_id: userId, restaurant_id: restaurantId })
      .select()
      .single();
    if (insertError) return;
    cart = newCart;
  } else if ((cart as Cart).restaurant_id !== restaurantId) {
    await supabase.from('cart_items').delete().eq('cart_id', (cart as Cart).id);
    const { data: updatedCart } = await supabase
      .from('carts')
      .update({ restaurant_id: restaurantId })
      .eq('id', (cart as Cart).id)
      .select()
      .single();
    cart = updatedCart ?? cart;
  }

  const cartId = (cart as Cart).id;
  const unitPrice = product.promotion_price && product.promotion_price < product.price
    ? product.promotion_price : product.price;

  await supabase.from('cart_items').insert({
    cart_id: cartId,
    product_id: product.id,
    quantity: 1,
    unit_price: unitPrice,
    supplements: supplements.map((s) => ({ id: s.id, name: s.name, price: s.price })),
    drinks: drinks.map((d) => ({ id: d.id, name: d.name, price: d.price })),
  });
}
