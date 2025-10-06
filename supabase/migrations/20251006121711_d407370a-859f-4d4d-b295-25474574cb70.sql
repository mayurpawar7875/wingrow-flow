-- Add new columns to profiles table for employee management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add check constraint for location
ALTER TABLE public.profiles
ADD CONSTRAINT location_check CHECK (location IN ('Pune', 'Mumbai') OR location IS NULL);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Update the handle_new_user function to include username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, role, username, phone_number, designation, location)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    'EMPLOYEE',
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'designation',
    NEW.raw_user_meta_data->>'location'
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'EMPLOYEE');
  
  RETURN NEW;
END;
$function$;