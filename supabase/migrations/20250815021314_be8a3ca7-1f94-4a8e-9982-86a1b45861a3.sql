-- Fix infinite recursion in users table RLS policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Users: staff select by tenant" ON public.users;
DROP POLICY IF EXISTS "Users: staff update by tenant" ON public.users;

-- Create a security definer function to get current user's tenant_id
CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tenant_id FROM auth.users au 
  JOIN public.users u ON au.id = u.id 
  WHERE au.id = auth.uid();
$function$;

-- Recreate the policies using the security definer function
CREATE POLICY "Users: staff select by tenant" 
ON public.users 
FOR SELECT 
USING (
  (tenant_id = public.get_current_user_tenant_id()) 
  AND (
    public.has_role_in_tenant(auth.uid(), 'teacher'::app_role, tenant_id) 
    OR public.has_role_in_tenant(auth.uid(), 'admin'::app_role, tenant_id)
  )
);

CREATE POLICY "Users: staff update by tenant" 
ON public.users 
FOR UPDATE 
USING (
  (tenant_id = public.get_current_user_tenant_id()) 
  AND (
    public.has_role_in_tenant(auth.uid(), 'teacher'::app_role, tenant_id) 
    OR public.has_role_in_tenant(auth.uid(), 'admin'::app_role, tenant_id)
  )
)
WITH CHECK (
  tenant_id = public.get_current_user_tenant_id()
);