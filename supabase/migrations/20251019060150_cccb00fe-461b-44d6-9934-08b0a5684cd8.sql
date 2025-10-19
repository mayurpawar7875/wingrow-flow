-- Create enum for inspection condition
CREATE TYPE public.inspection_condition AS ENUM ('New', 'Old');

-- Create enum for inspection status
CREATE TYPE public.inspection_status AS ENUM ('Pending', 'Approved', 'Rejected');

-- Create asset_inspections table
CREATE TABLE public.asset_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  expected_quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  condition inspection_condition NOT NULL,
  notes TEXT,
  selfie_url TEXT NOT NULL,
  gps_latitude NUMERIC(10, 8) NOT NULL,
  gps_longitude NUMERIC(11, 8) NOT NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status inspection_status NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  admin_comment TEXT,
  UNIQUE(employee_id, inspection_date)
);

-- Enable RLS
ALTER TABLE public.asset_inspections ENABLE ROW LEVEL SECURITY;

-- Employees can view their own inspections
CREATE POLICY "Employees can view own inspections"
ON public.asset_inspections
FOR SELECT
USING (employee_id = auth.uid());

-- Employees can create their own inspections
CREATE POLICY "Employees can create own inspections"
ON public.asset_inspections
FOR INSERT
WITH CHECK (employee_id = auth.uid());

-- Admins can view all inspections
CREATE POLICY "Admins can view all inspections"
ON public.asset_inspections
FOR SELECT
USING (has_role(auth.uid(), 'ADMIN'));

-- Admins can update all inspections
CREATE POLICY "Admins can update all inspections"
ON public.asset_inspections
FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'));

-- Create trigger for updated_at
CREATE TRIGGER update_asset_inspections_updated_at
BEFORE UPDATE ON public.asset_inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for inspection selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-selfies', 'inspection-selfies', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for inspection-selfies bucket
CREATE POLICY "Employees can upload own inspection selfies"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees can view own inspection selfies"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'inspection-selfies' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all inspection selfies"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'inspection-selfies' 
  AND has_role(auth.uid(), 'ADMIN')
);