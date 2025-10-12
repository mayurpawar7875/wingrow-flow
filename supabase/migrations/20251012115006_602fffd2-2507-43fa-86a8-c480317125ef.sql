-- Fix null emails in profiles by updating from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Now make email not null and unique
ALTER TABLE public.profiles ALTER COLUMN email SET NOT NULL;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;

-- Update RLS policies for email-based auth
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "read own profile" ON public.profiles;
DROP POLICY IF EXISTS "admin read all" ON public.profiles;
DROP POLICY IF EXISTS "admin insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;

-- Read own profile
CREATE POLICY "read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid());

-- Admin read all
CREATE POLICY "admin read all" ON public.profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'ADMIN'));

-- Admin insert/update all
CREATE POLICY "admin insert profiles" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "admin update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'ADMIN'));

-- Users can update own profile
CREATE POLICY "users update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (id = auth.uid());