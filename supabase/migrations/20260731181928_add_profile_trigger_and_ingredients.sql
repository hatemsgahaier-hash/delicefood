-- Fix profiles INSERT: use a trigger so the profile is created automatically
-- when auth.users gets a new row, using raw_user_meta_data passed at signUp.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, phone, vehicle_info)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client')::text,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'vehicle_info'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add ingredients column to products (array of ingredient names)
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients text[] DEFAULT '{}';
