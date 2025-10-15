-- Add missing columns to reimbursements table
ALTER TABLE public.reimbursements 
ADD COLUMN IF NOT EXISTS market_or_location text,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id);

-- Update RLS policies for reimbursements
DROP POLICY IF EXISTS "Users can view own reimbursements" ON public.reimbursements;
DROP POLICY IF EXISTS "Managers and admins can view all reimbursements" ON public.reimbursements;
DROP POLICY IF EXISTS "Users can create own reimbursements" ON public.reimbursements;
DROP POLICY IF EXISTS "Managers and admins can update reimbursements" ON public.reimbursements;

-- Employees can view their own reimbursements
CREATE POLICY "Employees view own reimbursements" ON public.reimbursements
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Admins can view all reimbursements
CREATE POLICY "Admins view all reimbursements" ON public.reimbursements
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'ADMIN'));

-- Employees can create their own reimbursements
CREATE POLICY "Employees create own reimbursements" ON public.reimbursements
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'EMPLOYEE'));

-- Employees can update their own PENDING reimbursements
CREATE POLICY "Employees update own pending" ON public.reimbursements
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'Submitted')
WITH CHECK (user_id = auth.uid() AND status = 'Submitted');

-- Employees can delete their own PENDING reimbursements
CREATE POLICY "Employees delete own pending" ON public.reimbursements
FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'Submitted');

-- Admins can update any reimbursement (for approval/rejection)
CREATE POLICY "Admins update all reimbursements" ON public.reimbursements
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ADMIN'));

-- Create storage bucket for reimbursement receipts if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('reimbursement-receipts', 'reimbursement-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for reimbursement receipts
CREATE POLICY "Employees upload own receipts" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'reimbursement-receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Employees view own receipts" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'reimbursement-receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins view all receipts" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'reimbursement-receipts' AND
  has_role(auth.uid(), 'ADMIN')
);

CREATE POLICY "Employees delete own receipts" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'reimbursement-receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);