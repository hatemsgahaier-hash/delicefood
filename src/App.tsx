import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthScreen from '@/screens/AuthScreen';
import ClientHome from '@/screens/client/ClientHome';
import RestaurantMenu from '@/screens/client/RestaurantMenu';
import CartScreen from '@/screens/client/CartScreen';
import OrderTracking from '@/screens/client/OrderTracking';
import OrderHistory from '@/screens/client/OrderHistory';
import ProfileScreen from '@/screens/ProfileScreen';
import RestaurateurDashboard from '@/screens/restaurateur/RestaurateurDashboard';
import LivreurDashboard from '@/screens/livreur/LivreurDashboard';
import NotificationBell from '@/components/NotificationBell';
import type { Restaurant, Order, Product, Supplement } from '@/lib/supabase';
import { addToCart } from '@/screens/client/CartScreen';
import { Home, ShoppingCart, Clock, User, UtensilsCrossed, Bike, Bell } from 'lucide-react';
import { Spinner } from '@/components/ui';

type ClientView =
  | { name: 'home' }
  | { name: 'menu'; restaurant: Restaurant }
  | { name: 'cart' }
  | { name: 'tracking'; orderId: string }
  | { name: 'history' }
  | { name: 'profile' };

type RestoView = 'dashboard' | 'profile';
type LivreurView = 'dashboard' | 'profile';

export default function App() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!session || !profile) {
    return <AuthScreen />;
  }

  if (profile.role === 'client') return <ClientApp />;
  if (profile.role === 'restaurateur') return <RestaurateurApp />;
  if (profile.role === 'livreur') return <LivreurApp />;
  return null;
}

function ClientApp() {
  const { session } = useAuth();
  const [view, setView] = useState<ClientView>({ name: 'home' });
  const [toast, setToast] = useState<string | null>(null);

  async function handleAddToCart(product: Product, supplements: Supplement[]) {
    if (!session) return;
    await addToCart(session.user.id, product.restaurant_id, product, supplements);
    setToast('Produit ajouté au panier');
    setTimeout(() => setToast(null), 2000);
  }

  const navActive = ['home', 'cart', 'history', 'profile'].includes(view.name) ? view.name : 'home';

  function handleNavChange(key: string) {
    // Don't interrupt deep flows (menu, tracking) if user taps the active tab
    if (key === 'home' && (view.name === 'menu' || view.name === 'tracking')) {
      setView({ name: 'home' });
      return;
    }
    setView({ name: key } as ClientView);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {view.name === 'home' && <ClientHome onSelectRestaurant={(r) => setView({ name: 'menu', restaurant: r })} />}
      {view.name === 'menu' && (
        <RestaurantMenu
          restaurant={view.restaurant}
          onBack={() => setView({ name: 'home' })}
          onAddToCart={handleAddToCart}
        />
      )}
      {view.name === 'cart' && (
        <CartScreen
          userId={session!.user.id}
          onBack={() => setView({ name: 'home' })}
          onOrderPlaced={(order: Order) => setView({ name: 'tracking', orderId: order.id })}
        />
      )}
      {view.name === 'tracking' && (
        <OrderTracking orderId={view.orderId} onBack={() => setView({ name: 'history' })} />
      )}
      {view.name === 'history' && (
        <OrderHistory userId={session!.user.id} onSelectOrder={(id) => setView({ name: 'tracking', orderId: id })} />
      )}
      {view.name === 'profile' && <ProfileScreen />}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg">
          {toast}
        </div>
      )}

      <BottomNav
        items={[
          { key: 'home', icon: Home, label: 'Accueil' },
          { key: 'cart', icon: ShoppingCart, label: 'Panier' },
          { key: 'history', icon: Clock, label: 'Commandes' },
          { key: 'profile', icon: User, label: 'Profil' },
        ]}
        active={navActive}
        onChange={handleNavChange}
      />
    </div>
  );
}

function RestaurateurApp() {
  const [view, setView] = useState<RestoView>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {view === 'dashboard' && <RestaurateurDashboard />}
      {view === 'profile' && <ProfileScreen />}
      <BottomNav
        items={[
          { key: 'dashboard', icon: UtensilsCrossed, label: 'Restaurant' },
          { key: 'profile', icon: User, label: 'Profil' },
        ]}
        active={view}
        onChange={(key) => setView(key as RestoView)}
      />
    </div>
  );
}

function LivreurApp() {
  const [view, setView] = useState<LivreurView>('dashboard');

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {view === 'dashboard' && <LivreurDashboard />}
      {view === 'profile' && <ProfileScreen />}
      <BottomNav
        items={[
          { key: 'dashboard', icon: Bike, label: 'Livraisons' },
          { key: 'profile', icon: User, label: 'Profil' },
        ]}
        active={view}
        onChange={(key) => setView(key as LivreurView)}
      />
    </div>
  );
}

function BottomNav({
  items,
  active,
  onChange,
}: {
  items: { key: string; icon: typeof Home; label: string }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-4 py-2">
      <div className="max-w-2xl mx-auto flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
