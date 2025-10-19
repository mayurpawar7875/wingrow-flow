-- Add approval tracking columns to new_item_requests
ALTER TABLE public.new_item_requests
ADD COLUMN approved_quantity integer,
ADD COLUMN approved_at timestamp with time zone,
ADD COLUMN approved_unit_price numeric;