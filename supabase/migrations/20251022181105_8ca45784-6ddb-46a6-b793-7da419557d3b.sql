-- Clean up duplicate/old profile policies
DROP POLICY IF EXISTS "admin read all" ON public.profiles;
DROP POLICY IF EXISTS "read own profile" ON public.profiles;

-- Verify storage buckets are private
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('reimbursement-receipts', 'inspection-selfies');

-- Ensure all storage policies exist (using IF NOT EXISTS pattern)
DO $$ 
BEGIN
  -- Reimbursement receipts policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users upload own receipts') THEN
    CREATE POLICY "Users upload own receipts"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'reimbursement-receipts' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Users view own receipts') THEN
    CREATE POLICY "Users view own receipts"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'reimbursement-receipts' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins update receipts') THEN
    CREATE POLICY "Admins update receipts"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'reimbursement-receipts' AND
        has_role(auth.uid(), 'ADMIN')
      );
  END IF;

  -- Inspection selfies policies  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employees upload own selfies') THEN
    CREATE POLICY "Employees upload own selfies"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'inspection-selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Employees view own selfies') THEN
    CREATE POLICY "Employees view own selfies"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'inspection-selfies' AND
        auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins update selfies') THEN
    CREATE POLICY "Admins update selfies"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'inspection-selfies' AND
        has_role(auth.uid(), 'ADMIN')
      );
  END IF;
END $$;