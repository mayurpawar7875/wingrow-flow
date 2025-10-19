-- Add new columns to asset_inspections table for late submission tracking
ALTER TABLE public.asset_inspections
ADD COLUMN is_late boolean NOT NULL DEFAULT false,
ADD COLUMN submission_date timestamp with time zone NOT NULL DEFAULT now(),
ADD COLUMN fine_amount numeric(10, 2) DEFAULT 0,
ADD COLUMN late_remarks text;

-- Add index for filtering by late submissions
CREATE INDEX idx_asset_inspections_is_late ON public.asset_inspections(is_late);
CREATE INDEX idx_asset_inspections_submission_date ON public.asset_inspections(submission_date);