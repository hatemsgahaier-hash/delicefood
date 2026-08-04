import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Address } from '@/lib/supabase';
import { Button, Card, Input, Spinner, EmptyState, Badge } from '@/components/ui';
import { User, MapPin, Plus, Trash2, Edit, Lock, Bike, Check, X } from 'lucide-react';

export default function ProfileScreen() {
  const { profile, session, refreshProfile, signOut } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [vehicleInfo, setVehicleInfo] = useState(profile?.vehicle_info ?? '');
  const [available, setAvailable] = useState(profile?.is_available ?? true);
  const [showAddrModal, setShowAddrModal] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: '', street: '', city: '', postal_code: '' });
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name);
      setPhone(profile.phone ?? '');
      setVehicleInfo(profile.vehicle_info ?? '');
      setAvailable(profile.is_available);
    }
  }, [profile]);

  useEffect(() => {
    loadAddresses();
  }, [session]);

  async function loadAddresses() {
    if (!session) return;
    const { data } = await supabase.from('addresses').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });
    setAddresses((data as Address[]) ?? []);
    setLoading(false);
  }

  async function saveProfile() {
    await supabase.from('profiles').update({
      full_name: fullName,
      phone,
      vehicle_info: profile?.role === 'livreur' ? vehicleInfo : null,
      is_available: profile?.role === 'livreur' ? available : null,
    }).eq('id', profile!.id);
    await refreshProfile();
    setEditing(false);
  }

  async function toggleAvailability() {
    const newVal = !available;
    setAvailable(newVal);
    await supabase.from('profiles').update({ is_available: newVal }).eq('id', profile!.id);
    await refreshProfile();
  }

  async function addAddress() {
    if (!session || !addrForm.label || !addrForm.street || !addrForm.city) return;
    await supabase.from('addresses').insert({
      user_id: session.user.id,
      ...addrForm,
    });
    setAddrForm({ label: '', street: '', city: '', postal_code: '' });
    setShowAddrModal(false);
    loadAddresses();
  }

  async function deleteAddress(id: string) {
    await supabase.from('addresses').delete().eq('id', id);
    loadAddresses();
  }

  async function changePassword() {
    setPasswordMsg('');
    if (newPassword.length < 6) {
      setPasswordMsg('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordMsg(error.message);
    } else {
      setPasswordMsg('Mot de passe modifié avec succès.');
      setNewPassword('');
      setTimeout(() => setChangingPassword(false), 1500);
    }
  }

  if (!profile) return <Spinner />;
  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Mon profil</h1>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white text-xl font-bold">
            {profile.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-900">{profile.full_name}</h2>
            <p className="text-sm text-slate-400">{profile.email}</p>
            <Badge className="mt-1 bg-orange-100 text-orange-700 border-orange-200">
              {profile.role === 'client' ? 'Client' : profile.role === 'restaurateur' ? 'Restaurateur' : 'Livreur'}
            </Badge>
          </div>
          {!editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Edit className="w-4 h-4" /> Modifier
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-3">
            <Input label="Nom complet" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            {profile.role === 'livreur' && (
              <>
                <Input label="Véhicule" value={vehicleInfo} onChange={(e) => setVehicleInfo(e.target.value)} />
                <button
                  onClick={toggleAvailability}
                  className={`w-full py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    available ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  Statut: {available ? 'Disponible' : 'Indisponible'}
                </button>
              </>
            )}
            <div className="flex gap-2">
              <Button onClick={saveProfile} className="flex-1">
                <Check className="w-4 h-4" /> Enregistrer
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <User className="w-4 h-4 text-slate-400" /> {profile.full_name}
            </div>
            {profile.phone && (
              <div className="flex items-center gap-2 text-slate-600">
                <span className="text-slate-400">Tél:</span> {profile.phone}
              </div>
            )}
            {profile.role === 'livreur' && (
              <>
                {profile.vehicle_info && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <Bike className="w-4 h-4 text-slate-400" /> {profile.vehicle_info}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Statut:</span>
                  <Badge className={available ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}>
                    {available ? 'Disponible' : 'Indisponible'}
                  </Badge>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {profile.role === 'client' && (
        <Card className="p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-orange-500" /> Mes adresses
            </h2>
            <Button size="sm" variant="secondary" onClick={() => setShowAddrModal(true)}>
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>
          {addresses.length === 0 ? (
            <EmptyState icon={<MapPin className="w-8 h-8" />} title="Aucune adresse" message="Ajoutez une adresse de livraison." />
          ) : (
            <div className="space-y-2">
              {addresses.map((addr) => (
                <div key={addr.id} className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-sm font-semibold text-slate-700">{addr.label}</span>
                    <p className="text-sm text-slate-400">{addr.street}, {addr.city} {addr.postal_code}</p>
                  </div>
                  <button onClick={() => deleteAddress(addr.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="p-6 mb-4">
        <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-orange-500" /> Sécurité
        </h2>
        {changingPassword ? (
          <div className="space-y-3">
            <Input
              type="password"
              label="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caractères"
            />
            {passwordMsg && <p className={`text-sm ${passwordMsg.includes('succès') ? 'text-green-600' : 'text-red-600'}`}>{passwordMsg}</p>}
            <div className="flex gap-2">
              <Button onClick={changePassword} className="flex-1">Modifier</Button>
              <Button variant="outline" onClick={() => { setChangingPassword(false); setPasswordMsg(''); }}>Annuler</Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setChangingPassword(true)}>
            Changer le mot de passe
          </Button>
        )}
      </Card>

      <Button variant="danger" onClick={signOut} className="w-full">
        Se déconnecter
      </Button>

      {showAddrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddrModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Nouvelle adresse</h2>
            <div className="space-y-3">
              <Input label="Libellé (ex: Domicile)" value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} />
              <Input label="Rue" value={addrForm.street} onChange={(e) => setAddrForm({ ...addrForm, street: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ville" value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} />
                <Input label="Code postal" value={addrForm.postal_code} onChange={(e) => setAddrForm({ ...addrForm, postal_code: e.target.value })} />
              </div>
              <Button onClick={addAddress} className="w-full">Ajouter l'adresse</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
