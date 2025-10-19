-- Create item_category enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.item_category AS ENUM ('Packaging', 'Stationery', 'Equipment', 'Other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create new_item_requests table
CREATE TABLE public.new_item_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category item_category NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  estimated_price_per_unit NUMERIC DEFAULT 0 CHECK (estimated_price_per_unit >= 0),
  needed_by DATE NOT NULL,
  market_or_location TEXT NOT NULL,
  reason TEXT NOT NULL,
  vendor_suggestion TEXT,
  attachment_url TEXT,
  status request_status NOT NULL DEFAULT 'Submitted',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  admin_comment TEXT,
  added_to_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  inventory_item_id UUID REFERENCES public.inventory_items(id)
);

-- Enable RLS
ALTER TABLE public.new_item_requests ENABLE ROW LEVEL SECURITY;

-- Employees can view their own requests
CREATE POLICY "Employees can view own new item requests"
ON public.new_item_requests
FOR SELECT
USING (employee_id = auth.uid());

-- Employees can create their own requests
CREATE POLICY "Employees can create own new item requests"
ON public.new_item_requests
FOR INSERT
WITH CHECK (employee_id = auth.uid());

-- Employees can update their own submitted requests
CREATE POLICY "Employees can update own submitted new item requests"
ON public.new_item_requests
FOR UPDATE
USING (employee_id = auth.uid() AND status = 'Submitted');

-- Admins and managers can view all requests
CREATE POLICY "Admins and managers can view all new item requests"
ON public.new_item_requests
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'MANAGER'));

-- Admins and managers can update all requests
CREATE POLICY "Admins and managers can update all new item requests"
ON public.new_item_requests
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'MANAGER'));

-- Create trigger for updated_at
CREATE TRIGGER update_new_item_requests_updated_at
BEFORE UPDATE ON public.new_item_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for new item request attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('new-item-attachments', 'new-item-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for new-item-attachments bucket
CREATE POLICY "Employees can upload own new item attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'new-item-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees can view own new item attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'new-item-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins and managers can view all new item attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'new-item-attachments' 
  AND (has_role(auth.uid(), 'ADMIN') OR has_role(auth.uid(), 'MANAGER'))
);