-- Add created_by column to track who created each item
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Drop existing policies that allow managers
DROP POLICY IF EXISTS "Managers and admins can manage inventory" ON public.inventory_items;

-- Create ADMIN-only write policies
CREATE POLICY "admin insert inventory" ON public.inventory_items
FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
);

CREATE POLICY "admin update inventory" ON public.inventory_items
FOR UPDATE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
);

CREATE POLICY "admin delete inventory" ON public.inventory_items
FOR DELETE TO authenticated 
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
);