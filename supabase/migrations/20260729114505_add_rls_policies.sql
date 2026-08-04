/*
# Food Delivery Platform — RLS Policies

Enables RLS on all tables and adds per-table policies. Now that all tables
exist, cross-table references (orders -> deliveries) resolve correctly.

## Policy summary
- profiles: readable by all authenticated, insert/update by owner
- addresses, carts, cart_items, notifications: owner-scoped CRUD
- restaurants: readable by all, CRUD by owner
- categories, subcategories, products, product_images, ingredients,
  supplements, product_ingredients, product_supplements: readable by all,
  writable by the restaurant owner (via EXISTS check)
- orders: visible to client, restaurant owner, or assigned driver
- order_items, deliveries, payments: scoped through parent order
- reviews: readable by all, CRUD by the client who wrote it
*/

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES =====
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== ADDRESSES =====
DROP POLICY IF EXISTS "addresses_select_own" ON addresses;
CREATE POLICY "addresses_select_own" ON addresses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
CREATE POLICY "addresses_insert_own" ON addresses FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
CREATE POLICY "addresses_update_own" ON addresses FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "addresses_delete_own" ON addresses;
CREATE POLICY "addresses_delete_own" ON addresses FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== RESTAURANTS =====
DROP POLICY IF EXISTS "restaurants_select_all" ON restaurants;
CREATE POLICY "restaurants_select_all" ON restaurants FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "restaurants_insert_own" ON restaurants;
CREATE POLICY "restaurants_insert_own" ON restaurants FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "restaurants_update_own" ON restaurants;
CREATE POLICY "restaurants_update_own" ON restaurants FOR UPDATE
  TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "restaurants_delete_own" ON restaurants;
CREATE POLICY "restaurants_delete_own" ON restaurants FOR DELETE
  TO authenticated USING (auth.uid() = owner_id);

-- ===== CATEGORIES =====
DROP POLICY IF EXISTS "categories_select_all" ON categories;
CREATE POLICY "categories_select_all" ON categories FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "categories_insert_owner" ON categories;
CREATE POLICY "categories_insert_owner" ON categories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = categories.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "categories_update_owner" ON categories;
CREATE POLICY "categories_update_owner" ON categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = categories.restaurant_id AND restaurants.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = categories.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "categories_delete_owner" ON categories;
CREATE POLICY "categories_delete_owner" ON categories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = categories.restaurant_id AND restaurants.owner_id = auth.uid())
  );

-- ===== SUBCATEGORIES =====
DROP POLICY IF EXISTS "subcategories_select_all" ON subcategories;
CREATE POLICY "subcategories_select_all" ON subcategories FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "subcategories_insert_owner" ON subcategories;
CREATE POLICY "subcategories_insert_owner" ON subcategories FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM categories JOIN restaurants ON restaurants.id = categories.restaurant_id
      WHERE categories.id = subcategories.category_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "subcategories_update_owner" ON subcategories;
CREATE POLICY "subcategories_update_owner" ON subcategories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM categories JOIN restaurants ON restaurants.id = categories.restaurant_id
      WHERE categories.id = subcategories.category_id AND restaurants.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM categories JOIN restaurants ON restaurants.id = categories.restaurant_id
      WHERE categories.id = subcategories.category_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "subcategories_delete_owner" ON subcategories;
CREATE POLICY "subcategories_delete_owner" ON subcategories FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM categories JOIN restaurants ON restaurants.id = categories.restaurant_id
      WHERE categories.id = subcategories.category_id AND restaurants.owner_id = auth.uid())
  );

-- ===== PRODUCTS =====
DROP POLICY IF EXISTS "products_select_all" ON products;
CREATE POLICY "products_select_all" ON products FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "products_insert_owner" ON products;
CREATE POLICY "products_insert_owner" ON products FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = products.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "products_update_owner" ON products;
CREATE POLICY "products_update_owner" ON products FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = products.restaurant_id AND restaurants.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = products.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "products_delete_owner" ON products;
CREATE POLICY "products_delete_owner" ON products FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = products.restaurant_id AND restaurants.owner_id = auth.uid())
  );

-- ===== PRODUCT IMAGES =====
DROP POLICY IF EXISTS "product_images_select_all" ON product_images;
CREATE POLICY "product_images_select_all" ON product_images FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "product_images_insert_owner" ON product_images;
CREATE POLICY "product_images_insert_owner" ON product_images FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products JOIN restaurants ON restaurants.id = products.restaurant_id
      WHERE products.id = product_images.product_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "product_images_delete_owner" ON product_images;
CREATE POLICY "product_images_delete_owner" ON product_images FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products JOIN restaurants ON restaurants.id = products.restaurant_id
      WHERE products.id = product_images.product_id AND restaurants.owner_id = auth.uid())
  );

-- ===== INGREDIENTS =====
DROP POLICY IF EXISTS "ingredients_select_all" ON ingredients;
CREATE POLICY "ingredients_select_all" ON ingredients FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "ingredients_insert_owner" ON ingredients;
CREATE POLICY "ingredients_insert_owner" ON ingredients FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = ingredients.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "ingredients_update_owner" ON ingredients;
CREATE POLICY "ingredients_update_owner" ON ingredients FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = ingredients.restaurant_id AND restaurants.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = ingredients.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "ingredients_delete_owner" ON ingredients;
CREATE POLICY "ingredients_delete_owner" ON ingredients FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = ingredients.restaurant_id AND restaurants.owner_id = auth.uid())
  );

-- ===== PRODUCT_INGREDIENTS =====
DROP POLICY IF EXISTS "product_ingredients_select_all" ON product_ingredients;
CREATE POLICY "product_ingredients_select_all" ON product_ingredients FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "product_ingredients_insert_owner" ON product_ingredients;
CREATE POLICY "product_ingredients_insert_owner" ON product_ingredients FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products JOIN restaurants ON restaurants.id = products.restaurant_id
      WHERE products.id = product_ingredients.product_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "product_ingredients_delete_owner" ON product_ingredients;
CREATE POLICY "product_ingredients_delete_owner" ON product_ingredients FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products JOIN restaurants ON restaurants.id = products.restaurant_id
      WHERE products.id = product_ingredients.product_id AND restaurants.owner_id = auth.uid())
  );

-- ===== SUPPLEMENTS =====
DROP POLICY IF EXISTS "supplements_select_all" ON supplements;
CREATE POLICY "supplements_select_all" ON supplements FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "supplements_insert_owner" ON supplements;
CREATE POLICY "supplements_insert_owner" ON supplements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = supplements.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "supplements_update_owner" ON supplements;
CREATE POLICY "supplements_update_owner" ON supplements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = supplements.restaurant_id AND restaurants.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = supplements.restaurant_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "supplements_delete_owner" ON supplements;
CREATE POLICY "supplements_delete_owner" ON supplements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = supplements.restaurant_id AND restaurants.owner_id = auth.uid())
  );

-- ===== PRODUCT_SUPPLEMENTS =====
DROP POLICY IF EXISTS "product_supplements_select_all" ON product_supplements;
CREATE POLICY "product_supplements_select_all" ON product_supplements FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "product_supplements_insert_owner" ON product_supplements;
CREATE POLICY "product_supplements_insert_owner" ON product_supplements FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM products JOIN restaurants ON restaurants.id = products.restaurant_id
      WHERE products.id = product_supplements.product_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "product_supplements_delete_owner" ON product_supplements;
CREATE POLICY "product_supplements_delete_owner" ON product_supplements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM products JOIN restaurants ON restaurants.id = products.restaurant_id
      WHERE products.id = product_supplements.product_id AND restaurants.owner_id = auth.uid())
  );

-- ===== CARTS =====
DROP POLICY IF EXISTS "carts_select_own" ON carts;
CREATE POLICY "carts_select_own" ON carts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_insert_own" ON carts;
CREATE POLICY "carts_insert_own" ON carts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_update_own" ON carts;
CREATE POLICY "carts_update_own" ON carts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "carts_delete_own" ON carts;
CREATE POLICY "carts_delete_own" ON carts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== CART_ITEMS =====
DROP POLICY IF EXISTS "cart_items_select_own" ON cart_items;
CREATE POLICY "cart_items_select_own" ON cart_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "cart_items_insert_own" ON cart_items;
CREATE POLICY "cart_items_insert_own" ON cart_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "cart_items_update_own" ON cart_items;
CREATE POLICY "cart_items_update_own" ON cart_items FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "cart_items_delete_own" ON cart_items;
CREATE POLICY "cart_items_delete_own" ON cart_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

-- ===== ORDERS =====
DROP POLICY IF EXISTS "orders_select_visible" ON orders;
CREATE POLICY "orders_select_visible" ON orders FOR SELECT
  TO authenticated USING (
    orders.client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = orders.restaurant_id AND restaurants.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.driver_id = auth.uid())
  );
DROP POLICY IF EXISTS "orders_insert_own" ON orders;
CREATE POLICY "orders_insert_own" ON orders FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "orders_update_owner_or_driver" ON orders;
CREATE POLICY "orders_update_owner_or_driver" ON orders FOR UPDATE
  TO authenticated USING (
    orders.client_id = auth.uid()
    OR EXISTS (SELECT 1 FROM restaurants WHERE restaurants.id = orders.restaurant_id AND restaurants.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM deliveries WHERE deliveries.order_id = orders.id AND deliveries.driver_id = auth.uid())
  ) WITH CHECK (true);

-- ===== ORDER_ITEMS =====
DROP POLICY IF EXISTS "order_items_select_visible" ON order_items;
CREATE POLICY "order_items_select_visible" ON order_items FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = order_items.order_id AND restaurants.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders JOIN deliveries ON deliveries.order_id = orders.id
      WHERE orders.id = order_items.order_id AND deliveries.driver_id = auth.uid())
  );
DROP POLICY IF EXISTS "order_items_insert_own" ON order_items;
CREATE POLICY "order_items_insert_own" ON order_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.client_id = auth.uid())
  );

-- ===== DELIVERIES =====
DROP POLICY IF EXISTS "deliveries_select_visible" ON deliveries;
CREATE POLICY "deliveries_select_visible" ON deliveries FOR SELECT
  TO authenticated USING (
    deliveries.driver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM orders WHERE orders.id = deliveries.order_id AND orders.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = deliveries.order_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "deliveries_insert_owner" ON deliveries;
CREATE POLICY "deliveries_insert_owner" ON deliveries FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = deliveries.order_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "deliveries_update_owner_or_driver" ON deliveries;
CREATE POLICY "deliveries_update_owner_or_driver" ON deliveries FOR UPDATE
  TO authenticated USING (
    deliveries.driver_id = auth.uid()
    OR EXISTS (SELECT 1 FROM orders JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = deliveries.order_id AND restaurants.owner_id = auth.uid())
  ) WITH CHECK (true);

-- ===== PAYMENTS =====
DROP POLICY IF EXISTS "payments_select_visible" ON payments;
CREATE POLICY "payments_select_visible" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.client_id = auth.uid())
    OR EXISTS (SELECT 1 FROM orders JOIN restaurants ON restaurants.id = orders.restaurant_id
      WHERE orders.id = payments.order_id AND restaurants.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = payments.order_id AND orders.client_id = auth.uid())
  );

-- ===== REVIEWS =====
DROP POLICY IF EXISTS "reviews_select_all" ON reviews;
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT
  TO authenticated USING (true);
DROP POLICY IF EXISTS "reviews_insert_own" ON reviews;
CREATE POLICY "reviews_insert_own" ON reviews FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews FOR UPDATE
  TO authenticated USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "reviews_delete_own" ON reviews;
CREATE POLICY "reviews_delete_own" ON reviews FOR DELETE
  TO authenticated USING (auth.uid() = client_id);

-- ===== NOTIFICATIONS =====
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
