/*
# Create product_drinks junction table

1. New Tables
- `product_drinks` — junction linking products to drinks (many-to-many)
  - `id` (uuid PK)
  - `product_id` (uuid FK → products, ON DELETE CASCADE)
  - `drink_id` (uuid FK → drinks, ON DELETE CASCADE)
  - `created_at` (timestamptz)
2. Security
- RLS enabled, owner-scoped via product's restaurant ownership
- anon can read (for client browsing)
3. Notes
- Unique constraint on (product_id, drink_id) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS product_drinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  drink_id uuid NOT NULL REFERENCES drinks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (product_id, drink_id)
);

ALTER TABLE product_drinks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_product_drinks" ON product_drinks;
CREATE POLICY "select_own_product_drinks" ON product_drinks FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN restaurants r ON r.id = p.restaurant_id
      WHERE p.id = product_drinks.product_id AND r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_product_drinks" ON product_drinks;
CREATE POLICY "insert_own_product_drinks" ON product_drinks FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM products p
      JOIN restaurants r ON r.id = p.restaurant_id
      WHERE p.id = product_drinks.product_id AND r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_product_drinks" ON product_drinks;
CREATE POLICY "delete_own_product_drinks" ON product_drinks FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN restaurants r ON r.id = p.restaurant_id
      WHERE p.id = product_drinks.product_id AND r.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "anon_select_product_drinks" ON product_drinks;
CREATE POLICY "anon_select_product_drinks" ON product_drinks FOR SELECT
  TO anon, authenticated USING (true);
