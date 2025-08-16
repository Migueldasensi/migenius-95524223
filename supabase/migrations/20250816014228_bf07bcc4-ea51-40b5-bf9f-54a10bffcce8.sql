-- Criar tenant padrão se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.tenants LIMIT 1) THEN
    INSERT INTO public.tenants (id, name, slug) 
    VALUES (gen_random_uuid(), 'Escola Principal', 'escola-principal');
  END IF;
END $$;

-- Atualizar usuários sem tenant para usar o tenant padrão
UPDATE public.users 
SET tenant_id = (SELECT id FROM public.tenants LIMIT 1)
WHERE tenant_id IS NULL;

-- Inserir role de admin para usuários que não têm role
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT u.id, 'admin'::app_role, u.tenant_id
FROM public.users u
WHERE u.tenant_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.tenant_id = u.tenant_id
);

-- Criar registros de gamificação para usuários que não têm
INSERT INTO public.gamification (user_id, xp_total, tier, streak_days, best_streak_days)
SELECT u.id, u.xp, 'Bronze I', 0, 0
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.gamification g WHERE g.user_id = u.id
);

-- Função para criar tenant e role automaticamente para novos usuários
CREATE OR REPLACE FUNCTION public.setup_new_user_with_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_tenant_id uuid;
BEGIN
  -- Buscar tenant padrão
  SELECT id INTO default_tenant_id FROM public.tenants LIMIT 1;
  
  -- Se não houver tenant, criar um
  IF default_tenant_id IS NULL THEN
    INSERT INTO public.tenants (name, slug) 
    VALUES ('Escola Principal', 'escola-principal')
    RETURNING id INTO default_tenant_id;
  END IF;
  
  -- Atualizar usuário com tenant
  UPDATE public.users 
  SET tenant_id = default_tenant_id 
  WHERE id = NEW.id;
  
  -- Inserir role de admin para o usuário
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'admin'::app_role, default_tenant_id);
  
  -- Criar registro de gamificação
  INSERT INTO public.gamification (user_id, xp_total, tier, streak_days, best_streak_days)
  VALUES (NEW.id, 0, 'Bronze I', 0, 0);
  
  RETURN NEW;
END;
$$;

-- Atualizar trigger para usar a nova função
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.setup_new_user_with_tenant();