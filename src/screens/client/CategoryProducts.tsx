import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Category, Restaurant, Product, Supplement, Drink } from '@/lib/supabase';
import { Card, Spinner, EmptyState, Button, Badge } from '@/components/ui';
import { ArrowLeft, UtensilsCrossed, Plus, Tag, Star, MapPin, CupSoda, Leaf, FlaskConical, Check } from 'lucide-react';
import { formatPrice } from '@/lib/constants';

interface ProductWithSupplements extends Product {
  supplements?: Supplement[];
  drinks?: Drink[];
}

export default function CategoryProducts({
  category,
  restaurant,
  onBack,
  onAddToCart,
}: {
  category: Category;
  restaurant: Restaurant;
  onBack: () => void;
  onAddToCart: (product: Product, supplements: Supplement[], drinks: Drink[]) => void;
}) {
  const [products, setProducts] = useState<ProductWithSupplements[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSupplements | null>(null);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [selectedDrinks, setSelectedDrinks] = useState<string[]>([]);
  const [ingredientImages, setIngredientImages] = useState<Record<string, string | null>>({});

  useEffect(() => {
    loadProducts();
  }, [category.id]);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', category.id)
      .eq('restaurant_id', restaurant.id)
      .order('name');
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }

  async function openProduct(product: Product) {
    const { data: suppData } = await supabase
      .from('product_supplements')
      .select('supplement_id, supplements(id, name, price, image_url, is_available)')
      .eq('product_id', product.id);
    const supps: Supplement[] = (suppData ?? [])
      .map((row: any) => row.supplements)
      .filter(Boolean)
      .filter((s: Supplement) => s.is_available);

    const { data: drinkData } = await supabase
      .from('product_drinks')
      .select('drink_id, drinks(id, name, price, image_url, is_available)')
      .eq('product_id', product.id);
    const allDrinks: Drink[] = (drinkData ?? [])
      .map((row: any) => row.drinks)
      .filter(Boolean);
    const availableDrinks = allDrinks.filter((d) => d.is_available);

    const { data: restoIngs } = await supabase
      .from('ingredients')
      .select('name, image_url, is_available')
      .eq('restaurant_id', restaurant.id);
    const ingMap = new Map((restoIngs ?? []).map((ri: any) => [ri.name, ri]));
    const imgMap: Record<string, string | null> = {};
    const availableIngs = (product.ingredients ?? []).filter((name) => {
      const ri = ingMap.get(name);
      if (ri) {
        imgMap[name] = ri.image_url;
        return ri.is_available;
      }
      return true;
    });

    setSelectedProduct({ ...product, ingredients: availableIngs, supplements: supps, drinks: availableDrinks });
    setSelectedSupplements(supps.map((s) => s.id));
    setSelectedIngredients(availableIngs);
    setSelectedDrinks([]);
    setIngredientImages(imgMap);
  }

  function toggleSupplement(id: string) {
    setSelectedSupplements((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleDrink(id: string) {
    setSelectedDrinks((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  function handleAdd() {
    if (!selectedProduct) return;
    const supps = (selectedProduct.supplements ?? []).filter((s) =>
      selectedSupplements.includes(s.id)
    );
    const drks = (selectedProduct.drinks ?? []).filter((d) =>
      selectedDrinks.includes(d.id)
    );
    onAddToCart(selectedProduct, supps, drks);
    setSelectedProduct(null);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Retour aux catégories
      </button>

      <div className="mb-6 flex items-center gap-4">
        {category.image_url && (
          <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0">
            <img src={category.image_url} alt={category.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{category.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" /> {restaurant.name} — {restaurant.city}
          </span>
          {restaurant.rating > 0 && (
            <span className="flex items-center gap-1 text-amber-600 font-semibold">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {restaurant.rating.toFixed(1)}
            </span>
          )}
          <Badge className={restaurant.is_open ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
            {restaurant.is_open ? 'Ouvert' : 'Fermé'}
          </Badge>
        </div>
      </div>
      </div>
      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-8 h-8" />}
          title="Aucun produit"
          message="Cette catégorie ne contient pas encore de produits."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {products.map((product, idx) => {
            const hasPromo = product.promotion_price && product.promotion_price < product.price;
            const displayPrice = hasPromo ? product.promotion_price! : product.price;
            return (
              <Card
                key={product.id}
                className="p-4 flex gap-4 animate-fade-in-up"
                onClick={() => restaurant.is_open && product.is_available && openProduct(product)}
              >
                <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0">
                  {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-900">{product.name}</h3>
                    {!product.is_available && <Badge className="bg-gray-100 text-gray-500 border-gray-200">Indispo.</Badge>}
                  </div>
                  {product.description && <p className="text-sm text-slate-400 line-clamp-2 mt-0.5">{product.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    {hasPromo && (
                      <>
                        <span className="text-sm text-slate-400 line-through">{formatPrice(product.price)}</span>
                        <span className="flex items-center gap-1 text-sm font-bold text-orange-600">
                          <Tag className="w-3 h-3" /> {formatPrice(displayPrice)}
                        </span>
                      </>
                    )}
                    {!hasPromo && <span className="text-sm font-bold text-slate-700">{formatPrice(displayPrice)}</span>}
                  </div>
                </div>
                <button
                  className="self-center w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-colors flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (restaurant.is_open && product.is_available) openProduct(product);
                  }}
                >
                  <Plus className="w-5 h-5" />
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedProduct(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedProduct.name}</h2>
              {selectedProduct.description && <p className="text-slate-500 text-sm mb-4">{selectedProduct.description}</p>}

              {selectedProduct.ingredients && selectedProduct.ingredients.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-700 mb-1">Ingrédients</h3>
                  <p className="text-xs text-slate-400 mb-2">Décochez pour retirer un ingrédient</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProduct.ingredients.map((ing) => {
                      const checked = selectedIngredients.includes(ing);
                      const img = ingredientImages[ing];
                      return (
                        <button
                          key={ing}
                          type="button"
                          onClick={() => setSelectedIngredients(checked ? selectedIngredients.filter((i) => i !== ing) : [...selectedIngredients, ing])}
                          className={`flex items-center gap-2 p-2 rounded-xl border transition-all text-left ${
                            checked ? 'border-orange-400 bg-orange-50' : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {img ? (
                              <img src={img} alt={ing} className="w-full h-full object-cover" />
                            ) : (
                              <Leaf className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <span className={`flex-1 text-xs font-medium truncate ${checked ? 'text-slate-700' : 'text-slate-400 line-through'}`}>{ing}</span>
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                            checked ? 'bg-orange-500' : 'border border-slate-300'
                          }`}>
                            {checked && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedProduct.supplements && selectedProduct.supplements.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-700 mb-2">Suppléments</h3>
                  <div className="space-y-2">
                    {selectedProduct.supplements.map((s) => (
                      <label key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {s.image_url ? (
                              <img src={s.image_url} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <FlaskConical className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-orange-600">+{formatPrice(s.price)}</span>
                          <input
                            type="checkbox"
                            checked={selectedSupplements.includes(s.id)}
                            onChange={() => toggleSupplement(s.id)}
                            className="w-4 h-4 rounded accent-orange-500"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {selectedProduct.drinks && selectedProduct.drinks.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-slate-700 mb-2">Boissons</h3>
                  <div className="space-y-2">
                    {selectedProduct.drinks.map((d) => (
                      <label key={d.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {d.image_url ? (
                              <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                            ) : (
                              <CupSoda className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{d.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-orange-600">+{formatPrice(d.price)}</span>
                          <input
                            type="checkbox"
                            checked={selectedDrinks.includes(d.id)}
                            onChange={() => toggleDrink(d.id)}
                            className="w-4 h-4 rounded accent-orange-500"
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleAdd} className="w-full" size="lg">
                Ajouter au panier — {formatPrice(
                  (selectedProduct.promotion_price && selectedProduct.promotion_price < selectedProduct.price
                    ? selectedProduct.promotion_price : selectedProduct.price) +
                  (selectedProduct.supplements ?? [])
                    .filter((s) => selectedSupplements.includes(s.id))
                    .reduce((sum, s) => sum + s.price, 0) +
                  (selectedProduct.drinks ?? [])
                    .filter((d) => selectedDrinks.includes(d.id))
                    .reduce((sum, d) => sum + d.price, 0)
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
