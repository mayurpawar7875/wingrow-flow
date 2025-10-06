-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE app_role AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
CREATE TYPE request_status AS ENUM ('Draft', 'Submitted', 'Approved', 'Rejected', 'Procured', 'Issued');
CREATE TYPE request_category AS ENUM ('Stationery', 'Packaging', 'Transport', 'Misc');
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE reimbursement_status AS ENUM ('Submitted', 'Approved', 'Rejected', 'Paid');
CREATE TYPE reimbursement_category AS ENUM ('Travel', 'Food', 'Stationery', 'Misc');
CREATE TYPE transaction_type AS ENUM ('Inbound', 'Outbound', 'Adjustment');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'EMPLOYEE',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create item_requests table
CREATE TABLE public.item_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category request_category NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL,
  priority priority_level NOT NULL DEFAULT 'Medium',
  needed_by DATE,
  status request_status NOT NULL DEFAULT 'Draft',
  manager_comment TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reimbursements table
CREATE TABLE public.reimbursements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  category reimbursement_category NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  notes TEXT,
  bill_file_url TEXT,
  status reimbursement_status NOT NULL DEFAULT 'Submitted',
  manager_comment TEXT,
  payment_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 10,
  max_level INTEGER NOT NULL DEFAULT 100,
  location TEXT,
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create inventory_transactions table
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  type transaction_type NOT NULL,
  quantity INTEGER NOT NULL,
  reference TEXT,
  performed_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create vendors table
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  gst_number TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create settings table (singleton)
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_name TEXT NOT NULL DEFAULT 'Wingrow Markets',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  currency TEXT NOT NULL DEFAULT 'INR',
  reimbursement_limits_json JSONB,
  approval_rules_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES auth.users(id),
  entity TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  changes_json JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = _user_id
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) = 'ADMIN');

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- RLS Policies for item_requests
CREATE POLICY "Users can view own requests"
  ON public.item_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers and admins can view all requests"
  ON public.item_requests FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Users can create own requests"
  ON public.item_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own draft requests"
  ON public.item_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'Draft');

CREATE POLICY "Managers and admins can update all requests"
  ON public.item_requests FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

-- RLS Policies for reimbursements
CREATE POLICY "Users can view own reimbursements"
  ON public.reimbursements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers and admins can view all reimbursements"
  ON public.reimbursements FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Users can create own reimbursements"
  ON public.reimbursements FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers and admins can update reimbursements"
  ON public.reimbursements FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

-- RLS Policies for inventory_items
CREATE POLICY "All authenticated users can view inventory"
  ON public.inventory_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage inventory"
  ON public.inventory_items FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

-- RLS Policies for inventory_transactions
CREATE POLICY "All authenticated users can view transactions"
  ON public.inventory_transactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can create transactions"
  ON public.inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

-- RLS Policies for vendors
CREATE POLICY "All authenticated users can view vendors"
  ON public.vendors FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers and admins can manage vendors"
  ON public.vendors FOR ALL
  TO authenticated
  USING (public.get_user_role(auth.uid()) IN ('MANAGER', 'ADMIN'));

-- RLS Policies for settings
CREATE POLICY "All authenticated users can view settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

-- RLS Policies for audit_logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.get_user_role(auth.uid()) = 'ADMIN');

CREATE POLICY "All authenticated users can create audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_item_requests_updated_at
  BEFORE UPDATE ON public.item_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reimbursements_updated_at
  BEFORE UPDATE ON public.reimbursements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'EMPLOYEE'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'EMPLOYEE');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to validate inventory transaction
CREATE OR REPLACE FUNCTION public.validate_inventory_transaction()
RETURNS TRIGGER AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  SELECT quantity_on_hand INTO current_qty
  FROM public.inventory_items
  WHERE id = NEW.item_id;
  
  IF NEW.type = 'Outbound' AND (current_qty + NEW.quantity) < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory. Current quantity: %, Requested: %', current_qty, ABS(NEW.quantity);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate transactions
CREATE TRIGGER validate_transaction_before_insert
  BEFORE INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_transaction();

-- Function to update inventory quantity
CREATE OR REPLACE FUNCTION public.update_inventory_quantity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inventory_items
  SET quantity_on_hand = quantity_on_hand + NEW.quantity
  WHERE id = NEW.item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update inventory on transaction
CREATE TRIGGER update_quantity_after_transaction
  AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_inventory_quantity();

-- Insert default settings
INSERT INTO public.settings (
  org_name,
  timezone,
  currency,
  reimbursement_limits_json,
  approval_rules_json
) VALUES (
  'Wingrow Markets',
  'Asia/Kolkata',
  'INR',
  '{"Travel": 5000, "Food": 1000, "Stationery": 2000, "Misc": 3000}'::jsonb,
  '{"item_request_threshold": 10000, "reimbursement_threshold": 5000}'::jsonb
);

-- Create storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', false);

-- Storage policies for attachments
CREATE POLICY "Users can upload own attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Managers and admins can view all attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('MANAGER', 'ADMIN')
    )
  );