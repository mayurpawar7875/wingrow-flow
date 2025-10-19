-- Make the reimbursement-receipts bucket public so getPublicUrl() works
UPDATE storage.buckets 
SET public = true 
WHERE id = 'reimbursement-receipts';