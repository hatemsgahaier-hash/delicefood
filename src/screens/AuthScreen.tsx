import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/lib/supabase';
import { UtensilsCrossed, Bike, User, Mail, Lock, Phone, Car, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';

const ROLES: { value: Role; label: string; icon: typeof User; description: string }[] = [
  { value: 'client', label: 'Client', icon: User, description: 'Commander des repas' },
  { value: 'restaurateur', label: 'Restaurateur', icon: UtensilsCrossed, description: 'Gérer mon restaurant' },
  { value: 'livreur', label: 'Livreur', icon: Bike, description: 'Livrer des commandes' },
];

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [role, setRole] = useState<Role>('client');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password, rememberMe);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password, fullName, role, phone, vehicleInfo);
      if (error) setError(error);
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-orange-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30 mb-4">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">FoodExpress</h1>
          <p className="text-slate-500 mt-1">Votre plateforme de livraison de repas</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Inscription
            </button>
          </div>

          {mode === 'register' && (
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Je suis...</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRole(r.value)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        role === r.value
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <span className="block text-xs font-semibold">{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <Field icon={<User className="w-4 h-4" />}>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nom complet"
                  className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
                />
              </Field>
            )}

            <Field icon={<Mail className="w-4 h-4" />}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Adresse email"
                className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
              />
            </Field>

            <Field icon={<Lock className="w-4 h-4" />}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </Field>

            {mode === 'register' && (
              <Field icon={<Phone className="w-4 h-4" />}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Téléphone (optionnel)"
                  className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
                />
              </Field>
            )}

            {mode === 'register' && role === 'livreur' && (
              <Field icon={<Car className="w-4 h-4" />}>
                <input
                  type="text"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  placeholder="Véhicule (ex: Scooter Yamaha)"
                  className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
                />
              </Field>
            )}

            {mode === 'login' && (
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span className="text-sm text-slate-600">Se souvenir de moi</span>
              </label>
            )}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-orange-400 focus-within:bg-white transition-colors">
      <span className="text-slate-400">{icon}</span>
      {children}
    </div>
  );
}
