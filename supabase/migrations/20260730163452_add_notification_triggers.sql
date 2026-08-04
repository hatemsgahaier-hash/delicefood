/*
# Add notification triggers for orders and deliveries

Replaces client-side notification inserts (which fail RLS because a client
cannot write a notification row for another user) with database triggers
that run with definer privileges and bypass RLS.

## Triggers
- on_order_insert: notifies the restaurant owner when a new order arrives
- on_order_status_update: notifies the client when order status changes
- on_delivery_insert: notifies the assigned driver of a new delivery request
*/

CREATE OR REPLACE FUNCTION notify_order_inserted()
RETURNS trigger AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT restaurants.owner_id INTO owner_id FROM restaurants WHERE id = NEW.restaurant_id;
  IF owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type)
    VALUES (owner_id, 'Nouvelle commande', 'Commande #' || substring(NEW.id::text, 1, 8) || ' reçue', 'new_order');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_insert ON orders;
CREATE TRIGGER on_order_insert AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_order_inserted();

CREATE OR REPLACE FUNCTION notify_order_status_changed()
RETURNS trigger AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO notifications (user_id, title, body, type)
    VALUES (
      NEW.client_id,
      'Mise à jour de commande',
      'Votre commande est maintenant: ' ||
        CASE NEW.status
          WHEN 'accepted' THEN 'Acceptée'
          WHEN 'refused' THEN 'Refusée'
          WHEN 'preparing' THEN 'En préparation'
          WHEN 'ready' THEN 'Prête'
          WHEN 'awaiting_driver' THEN 'En attente d''un livreur'
          WHEN 'driver_assigned' THEN 'Livreur affecté'
          WHEN 'driver_enroute' THEN 'Livreur en route'
          WHEN 'delivered' THEN 'Livrée'
          WHEN 'cancelled' THEN 'Annulée'
          ELSE NEW.status
        END,
      'order_update'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_update ON orders;
CREATE TRIGGER on_order_status_update AFTER UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION notify_order_status_changed();

CREATE OR REPLACE FUNCTION notify_delivery_inserted()
RETURNS trigger AS $$
BEGIN
  IF NEW.driver_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type)
    VALUES (NEW.driver_id, 'Nouvelle demande de livraison', 'Vous avez une nouvelle demande de livraison', 'delivery_request');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_delivery_insert ON deliveries;
CREATE TRIGGER on_delivery_insert AFTER INSERT ON deliveries
  FOR EACH ROW EXECUTE FUNCTION notify_delivery_inserted();
