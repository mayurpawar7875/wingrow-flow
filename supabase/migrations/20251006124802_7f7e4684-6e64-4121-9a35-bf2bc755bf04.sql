-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create separate policies for better control
-- Allow admins to insert roles for any user
CREATE POLICY "Admins can insert any user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Allow admins to update roles for any user
CREATE POLICY "Admins can update any user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Allow admins to delete roles for any user
CREATE POLICY "Admins can delete any user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);

-- Allow admins to view all user roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);