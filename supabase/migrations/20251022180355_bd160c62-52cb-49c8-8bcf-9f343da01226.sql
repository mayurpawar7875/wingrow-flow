-- Fix 1: Restrict profile visibility to prevent employee data exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Users can only read their own profile
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all profiles  
CREATE POLICY "Admins read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'ADMIN'));

-- Managers can read all profiles (needed for managing requests/reimbursements)
CREATE POLICY "Managers read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'MANAGER'));

-- Fix 3: Secure storage buckets - Make buckets private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('reimbursement-receipts', 'inspection-selfies');

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users view own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins update receipts" ON storage.objects;
DROP POLICY IF EXISTS "Employees upload own selfies" ON storage.objects;
DROP POLICY IF EXISTS "Employees view own selfies" ON storage.objects;
DROP POLICY IF EXISTS "Admins view all selfies" ON storage.objects;
DROP POLICY IF EXISTS "Admins update selfies" ON storage.objects;

-- Add RLS policies for reimbursement receipts
CREATE POLICY "Users upload own receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'reimbursement-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts' AND
    has_role(auth.uid(), 'ADMIN')
  );

CREATE POLICY "Admins update receipts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'reimbursement-receipts' AND
    has_role(auth.uid(), 'ADMIN')
  );

-- Add RLS policies for inspection selfies
CREATE POLICY "Employees upload own selfies"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'inspection-selfies' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Employees view own selfies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inspection-selfies' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all selfies"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'inspection-selfies' AND
    has_role(auth.uid(), 'ADMIN')
  );

CREATE POLICY "Admins update selfies"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'inspection-selfies' AND
    has_role(auth.uid(), 'ADMIN')
  );