-- Update the handle_new_user trigger to respect role from metadata
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
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'EMPLOYEE'::app_role),
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'designation',
    NEW.raw_user_meta_data->>'location'
  );
  
  -- Insert user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'EMPLOYEE'::app_role));
  
  RETURN NEW;
END;
$function$;

-- Now create the admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'wingrowagritech@wingrow.internal';
  
  -- Only create if doesn't exist
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users (using admin privileges)
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'wingrowagritech@wingrow.internal',
      crypt('Wingrow@1234', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'name', 'Wingrow Admin',
        'username', 'wingrowagritech',
        'phone_number', '0000000000',
        'designation', 'Administrator',
        'location', 'Pune',
        'email', 'wingrowagritech@wingrow.internal',
        'role', 'ADMIN'
      ),
      now(),
      now(),
      'authenticated',
      'authenticated'
    );
    
    RAISE NOTICE 'Admin user created successfully';
  ELSE
    RAISE NOTICE 'Admin user already exists';
  END IF;
END $$;
