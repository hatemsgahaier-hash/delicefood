/*
# Fix infinite recursion in RLS policies

The orders SELECT policy references deliveries, and the deliveries SELECT
policy references orders — creating an infinite recursion. The same cycle
affects order_items, payments, and the UPDATE policies.

Fix: Replace inline cross-table EXISTS checks with SECURITY DEFINER helper
functions that bypass RLS, breaking the recursion cycle.

## New functions
- is_driver_of_order(order_id, user_id): checks if user is the assigned driver
- is_order_owner_or_client(order_id, user_id): checks if user is the client or
  the restaurant owner of the order

## Updated policies
- orders SELECT/UPDATE: use is_driver_of_order instead of inline deliveries check
- deliveries SELECT/UPDATE: use is_order_owner_or_client instead of inline orders check
- order_items SELECT: use both helper functions
- payments SELECT: use is_order_owner_or_client
*/

-- ===== HELPER FUNCTIONS (SECURITY DEFINER = bypass RLS, break recursion) =====

CREATE OR REPLACE FUNCTION is_driver_of_order(p_order_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM deliveries d
    WHERE d.order_id = p_order_id AND d.driver_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION is_order_owner_or_client(p_order_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = p_order_id
    AND (
      o.client_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM restaurants r
        WHERE r.id = o.restaurant_id AND r.owner_id = p_user_id
      )
    )
  );
$$;

-- ===== ORDERS: fix SELECT policy =====
DROP POLICY IF EXISTS "orders_select_visible" ON orders;
CREATE POLICY "orders_select_visible" ON orders FOR SELECT
  TO authenticated USING (
    orders.client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = orders.restaurant_id AND r.owner_id = auth.uid()
    )
    OR is_driver_of_order(orders.id, auth.uid())
  );

-- ===== ORDERS: fix UPDATE policy =====
DROP POLICY IF EXISTS "orders_update_owner_or_driver" ON orders;
CREATE POLICY "orders_update_owner_or_driver" ON orders FOR UPDATE
  TO authenticated USING (
    orders.client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM restaurants r
      WHERE r.id = orders.restaurant_id AND r.owner_id = auth.uid()
    )
    OR is_driver_of_order(orders.id, auth.uid())
  ) WITH CHECK (true);

-- ===== DELIVERIES: fix SELECT policy =====
DROP POLICY IF EXISTS "deliveries_select_visible" ON deliveries;
CREATE POLICY "deliveries_select_visible" ON deliveries FOR SELECT
  TO authenticated USING (
    deliveries.driver_id = auth.uid()
    OR is_order_owner_or_client(deliveries.order_id, auth.uid())
  );

-- ===== DELIVERIES: fix UPDATE policy =====
DROP POLICY IF EXISTS "deliveries_update_owner_or_driver" ON deliveries;
CREATE POLICY "deliveries_update_owner_or_driver" ON deliveries FOR UPDATE
  TO authenticated USING (
    deliveries.driver_id = auth.uid()
    OR is_order_owner_or_client(deliveries.order_id, auth.uid())
  ) WITH CHECK (true);

-- ===== ORDER_ITEMS: fix SELECT policy =====
DROP POLICY IF EXISTS "order_items_select_visible" ON order_items;
CREATE POLICY "order_items_select_visible" ON order_items FOR SELECT
  TO authenticated USING (
    is_order_owner_or_client(order_items.order_id, auth.uid())
    OR is_driver_of_order(order_items.order_id, auth.uid())
  );

-- ===== PAYMENTS: fix SELECT policy =====
DROP POLICY IF EXISTS "payments_select_visible" ON payments;
CREATE POLICY "payments_select_visible" ON payments FOR SELECT
  TO authenticated USING (
    is_order_owner_or_client(payments.order_id, auth.uid())
  );
