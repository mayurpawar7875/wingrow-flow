-- Create collections table to track payments/collections against item requests
CREATE TABLE public.collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_request_id UUID NOT NULL REFERENCES public.item_requests(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  receipt_url TEXT,
  remarks TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recorded_by UUID NOT NULL REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Users can view their own collections
CREATE POLICY "Users can view own collections"
ON public.collections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.item_requests
    WHERE item_requests.id = collections.item_request_id
    AND item_requests.user_id = auth.uid()
  )
);

-- Users can create collections for their own approved requests
CREATE POLICY "Users can create collections for own approved requests"
ON public.collections
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.item_requests
    WHERE item_requests.id = collections.item_request_id
    AND item_requests.user_id = auth.uid()
    AND item_requests.status = 'Approved'
  )
  AND recorded_by = auth.uid()
);

-- Admins and managers can view all collections
CREATE POLICY "Admins and managers can view all collections"
ON public.collections
FOR SELECT
USING (get_user_role(auth.uid()) = ANY (ARRAY['MANAGER'::app_role, 'ADMIN'::app_role]));

-- Create index for faster lookups
CREATE INDEX idx_collections_item_request_id ON public.collections(item_request_id);

-- Add settlement status to item_requests (optional flag)
ALTER TABLE public.item_requests
ADD COLUMN is_settled BOOLEAN NOT NULL DEFAULT false;