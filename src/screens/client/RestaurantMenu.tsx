import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Restaurant, Category, Product, Supplement } from '@/lib/supabase';
import { Card, Spinner, EmptyState, Button, Badge } from '@/components/ui';
import { UtensilsCrossed, Star, MapPin, Plus, Tag, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/constants';

interface ProductWithSupplements extends Product {
  supplements?: Supplement[];
}

export default function RestaurantMenu({
  restaurant,
  onBack,
  onAddToCart,
}: {
  restaurant: Restaurant;
  onBack: () => void;
  onAddToCart: (product: Product, supplements: Supplement[]) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Record<string, ProductWithSupplements[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithSupplements | null>(null);
  const [selectedSupplements, setSelectedSupplements] = useState<string[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);

  useEffect(() => {
    loadMenu();
  }, [restaurant.id]);

  async function loadMenu() {
    setLoading(true);
    const { data: catsData } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('sort_order');
    const cats = (catsData as Category[]) ?? [];
    setCategories(cats);
    if (cats.length > 0) setActiveCategory(cats[0].id);

    const { data: prods } = await supabase
      .from('products')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('name');
    const allProducts = (prods as Product[]) ?? [];

    const byCategory: Record<string, ProductWithSupplements[]> = {};
    for (const p of allProducts) {
      if (!byCategory[p.category_id]) byCategory[p.category_id] = [];
      byCategory[p.category_id].push(p);
    }
    setProducts(byCategory);
    setLoading(false);
  }

  async function openProduct(product: Product) {
    const { data } = await supabase
      .from('product_supplements')
      .select('supplement_id, supplements(id, name, price)')
      .eq('product_id', product.id);
    const supps: Supplement[] = (data ?? [])
      .map((row: any) => row.supplements)
      .filter(Boolean);
    setSelectedProduct({ ...product, supplements: supps });
    // Pre-select all supplements and ingredients by default
    setSelectedSupplements(supps.map((s) => s.id));
    setSelectedIngredients(product.ingredients ?? []);
  }

  function toggleSupplement(id: string) {
    setSelectedSupplements((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function handleAdd() {
    if (!selectedProduct) return;
    const supps = (selectedProduct.supplements ?? []).filter((s) =>
      selectedSupplements.includes(s.id)
    );
    onAddToCart(selectedProduct, supps);
    setSelectedProduct(null);
  }

  const currentProducts = activeCategory ? products[activeCategory] ?? [] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>

      <div className="h-48 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 relative overflow-hidden mb-6">
        {restaurant.cover_url ? (
          <img src={restaurant.cover_url} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-16 h-16 text-orange-300" />
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{restaurant.name}</h1>
            {restaurant.description && <p className="text-slate-500 mt-1">{restaurant.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {restaurant.city}
              </span>
              {restaurant.rating > 0 && (
                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" /> {restaurant.rating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <Badge className={restaurant.is_open ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
            {restaurant.is_open ? 'Ouvert' : 'Fermé'}
          </Badge>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : currentProducts.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-8 h-8" />}
          title="Aucun produit"
          message="Cette catégorie ne contient pas encore de produits."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {currentProducts.map((product) => {
            const hasPromo = product.promotion_price && product.promotion_price < product.price;
            const displayPrice = hasPromo ? product.promotion_price! : product.price;
            return (
              <Card key={product.id} className="p-4 flex gap-4" onClick={() => restaurant.is_open && product.is_available && openProduct(product)}>
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
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.ingredients.map((ing) => {
                      const checked = selectedIngredients.includes(ing);
                      return (
                        <label key={ing} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-all ${checked ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-slate-100 border-slate-200 text-slate-400 line-through'}`}>
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-orange-500"
                            checked={checked}
                            onChange={(e) => setSelectedIngredients(e.target.checked ? [...selectedIngredients, ing] : selectedIngredients.filter((i) => i !== ing))}
                          />
                          {ing}
                        </label>
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
                          <input
                            type="checkbox"
                            checked={selectedSupplements.includes(s.id)}
                            onChange={() => toggleSupplement(s.id)}
                            className="w-4 h-4 rounded accent-orange-500"
                          />
                          <span className="text-sm font-medium text-slate-700">{s.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-600">+{formatPrice(s.price)}</span>
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
                    .reduce((sum, s) => sum + s.price, 0)
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
