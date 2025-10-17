-- Add market_or_location field to item_requests table
ALTER TABLE public.item_requests
ADD COLUMN market_or_location TEXT;