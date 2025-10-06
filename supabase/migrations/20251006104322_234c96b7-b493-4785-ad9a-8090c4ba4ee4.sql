-- Fix security warnings by setting search_path on trigger functions

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_inventory_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  SELECT quantity_on_hand INTO current_qty
  FROM public.inventory_items
  WHERE id = NEW.item_id;
  
  IF NEW.type = 'Outbound' AND (current_qty + NEW.quantity) < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory. Current quantity: %, Requested: %', current_qty, ABS(NEW.quantity);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.inventory_items
  SET quantity_on_hand = quantity_on_hand + NEW.quantity
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$;