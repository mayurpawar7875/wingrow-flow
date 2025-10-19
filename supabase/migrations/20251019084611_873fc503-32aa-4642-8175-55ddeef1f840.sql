-- Create parent inspection sessions table
CREATE TABLE IF NOT EXISTS public.inspection_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  selfie_url TEXT NOT NULL,
  gps_latitude NUMERIC NOT NULL,
  gps_longitude NUMERIC NOT NULL,
  is_late BOOLEAN NOT NULL DEFAULT false,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status inspection_status NOT NULL DEFAULT 'Pending',
  fine_amount NUMERIC DEFAULT 0,
  reviewed_by UUID REFERENCES auth.users(id),
  late_remarks TEXT,
  admin_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(employee_id, inspection_date)
);

-- Create child asset inspections table (stores individual asset details)
CREATE TABLE IF NOT EXISTS public.inspection_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.inspection_sessions(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  expected_quantity INTEGER NOT NULL,
  available_quantity INTEGER NOT NULL,
  condition inspection_condition NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for inspection_sessions
CREATE POLICY "Employees can view own sessions"
  ON public.inspection_sessions FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Employees can create own sessions"
  ON public.inspection_sessions FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own sessions"
  ON public.inspection_sessions FOR UPDATE
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can view all sessions"
  ON public.inspection_sessions FOR SELECT
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can update all sessions"
  ON public.inspection_sessions FOR UPDATE
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- RLS policies for inspection_assets
CREATE POLICY "Employees can view own inspection assets"
  ON public.inspection_assets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.inspection_sessions
    WHERE inspection_sessions.id = inspection_assets.session_id
    AND inspection_sessions.employee_id = auth.uid()
  ));

CREATE POLICY "Employees can create own inspection assets"
  ON public.inspection_assets FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inspection_sessions
    WHERE inspection_sessions.id = inspection_assets.session_id
    AND inspection_sessions.employee_id = auth.uid()
  ));

CREATE POLICY "Admins can view all inspection assets"
  ON public.inspection_assets FOR SELECT
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

CREATE POLICY "Admins can update all inspection assets"
  ON public.inspection_assets FOR UPDATE
  USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Create indexes for performance
CREATE INDEX idx_inspection_sessions_employee_date ON public.inspection_sessions(employee_id, inspection_date);
CREATE INDEX idx_inspection_sessions_status ON public.inspection_sessions(status);
CREATE INDEX idx_inspection_assets_session ON public.inspection_assets(session_id);

-- Migrate existing data from asset_inspections to new structure
-- Group by employee_id and inspection_date to create sessions
INSERT INTO public.inspection_sessions (
  employee_id,
  inspection_date,
  selfie_url,
  gps_latitude,
  gps_longitude,
  is_late,
  submission_date,
  status,
  fine_amount,
  reviewed_by,
  late_remarks,
  admin_comment,
  created_at,
  updated_at
)
SELECT DISTINCT ON (employee_id, inspection_date)
  employee_id,
  inspection_date,
  selfie_url,
  gps_latitude,
  gps_longitude,
  is_late,
  submission_date,
  status,
  fine_amount,
  reviewed_by,
  late_remarks,
  admin_comment,
  created_at,
  updated_at
FROM public.asset_inspections
ORDER BY employee_id, inspection_date, created_at;

-- Migrate asset details to inspection_assets
INSERT INTO public.inspection_assets (
  session_id,
  item_id,
  expected_quantity,
  available_quantity,
  condition,
  notes,
  created_at,
  updated_at
)
SELECT
  s.id as session_id,
  a.item_id,
  a.expected_quantity,
  a.available_quantity,
  a.condition,
  a.notes,
  a.created_at,
  a.updated_at
FROM public.asset_inspections a
JOIN public.inspection_sessions s ON 
  s.employee_id = a.employee_id AND 
  s.inspection_date = a.inspection_date;