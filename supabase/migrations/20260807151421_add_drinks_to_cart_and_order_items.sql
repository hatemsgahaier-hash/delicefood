/*
# Add drinks column to cart_items and order_items

1. Modified Tables
- `cart_items` — add `drinks` jsonb default '[]'
- `order_items` — add `drinks` jsonb default '[]'
2. Notes
- Additive only, no data loss
*/

ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS drinks jsonb DEFAULT '[]'::jsonb;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS drinks jsonb DEFAULT '[]'::jsonb;
