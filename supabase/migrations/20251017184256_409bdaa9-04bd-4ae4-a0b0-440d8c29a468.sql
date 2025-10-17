-- Add proof of payment columns to item_requests table
ALTER TABLE public.item_requests
ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT,
ADD COLUMN IF NOT EXISTS proof_of_payment_remarks TEXT,
ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add comment
COMMENT ON COLUMN public.item_requests.proof_of_payment_url IS 'URL to proof of payment file uploaded after approval';
COMMENT ON COLUMN public.item_requests.proof_of_payment_remarks IS 'Employee remarks when uploading proof of payment';
COMMENT ON COLUMN public.item_requests.proof_uploaded_at IS 'Timestamp when proof of payment was uploaded';