-- Enable required extension for UUIDs
create extension if not exists pgcrypto;

-- 1) Roles enum
create type public.app_role as enum ('student','teacher','admin');

-- 2) Tenants
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Users (profile) - linked to auth.users
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.tenants(id) on delete set null,
  email text unique,
  display_name text,
  xp integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_users_tenant on public.users(tenant_id);

-- 4) User roles per tenant
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, tenant_id, role)
);

-- 5) Topics (content)
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  description text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_topics_tenant on public.topics(tenant_id);

-- 6) Essays (ex.: redações)
create table if not exists public.essays (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  content text,
  score numeric,
  status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_essays_tenant on public.essays(tenant_id);

-- 7) Countdowns (ex.: vestibulares, provas)
create table if not exists public.countdowns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  title text not null,
  target_at timestamptz not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_countdowns_tenant on public.countdowns(tenant_id);

-- 8) Weekly reports (resumo semanal por aluno)
create table if not exists public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  summary text,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, week_start, week_end)
);
create index if not exists idx_weekly_reports_tenant on public.weekly_reports(tenant_id);

-- 9) Activities (feed de atividades + auditoria de XP)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  xp integer not null default 0,
  reason text,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activities_tenant on public.activities(tenant_id);
create index if not exists idx_activities_user on public.activities(user_id);

-- 10) Updated_at helper
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger trg_tenants_updated_at
before update on public.tenants
for each row execute function public.update_updated_at_column();

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.update_updated_at_column();

create trigger trg_topics_updated_at
before update on public.topics
for each row execute function public.update_updated_at_column();

create trigger trg_essays_updated_at
before update on public.essays
for each row execute function public.update_updated_at_column();

create trigger trg_countdowns_updated_at
before update on public.countdowns
for each row execute function public.update_updated_at_column();

create trigger trg_weekly_reports_updated_at
before update on public.weekly_reports
for each row execute function public.update_updated_at_column();

-- 11) Helper: papel do usuário por tenant
create or replace function public.has_role_in_tenant(_user_id uuid, _role public.app_role, _tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = _user_id
      and ur.role = _role
      and ur.tenant_id = _tenant_id
  );
$$;

-- Helper: tenant do usuário atual
create or replace function public.current_user_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.tenant_id from public.users u where u.id = auth.uid();
$$;

-- 12) Segurança: somente teacher/admin podem alterar XP
create or replace function public.enforce_xp_update_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.xp <> old.xp then
    if not (
      public.has_role_in_tenant(auth.uid(), 'admin', coalesce(new.tenant_id, old.tenant_id)) or
      public.has_role_in_tenant(auth.uid(), 'teacher', coalesce(new.tenant_id, old.tenant_id))
    ) then
      raise exception 'Only teacher/admin can modify XP';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_users_enforce_xp
before update on public.users
for each row execute function public.enforce_xp_update_privileges();

-- 13) Auto-sync profile na criação do usuário de Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 14) Enable RLS
alter table public.tenants enable row level security;
alter table public.users enable row level security;
alter table public.user_roles enable row level security;
alter table public.topics enable row level security;
alter table public.essays enable row level security;
alter table public.countdowns enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.activities enable row level security;

-- 15) RLS Policies
-- Tenants: usuário só enxerga seu tenant
create policy "Tenant: select own tenant" on public.tenants
for select to authenticated
using (
  id = (select tenant_id from public.users where id = auth.uid())
);

-- Users
create policy "Users: select own row" on public.users
for select to authenticated
using (id = auth.uid());

create policy "Users: staff select by tenant" on public.users
for select to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
  and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
);

create policy "Users: self update" on public.users
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users: staff update by tenant" on public.users
for update to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
  and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
)
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
);

-- User roles
create policy "UserRoles: self and staff read" on public.user_roles
for select to authenticated
using (
  user_id = auth.uid() or
  public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
  public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
);

create policy "UserRoles: admin manage" on public.user_roles
for all to authenticated
using (
  public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
)
with check (
  public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
);

-- Topics
create policy "Topics: tenant read" on public.topics
for select to authenticated
using (tenant_id = (select tenant_id from public.users where id = auth.uid()));

create policy "Topics: staff write" on public.topics
for all to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
)
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
);

-- Essays
create policy "Essays: read own or staff by tenant" on public.essays
for select to authenticated
using (
  user_id = auth.uid() or (
    tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
      public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
      public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
    )
  )
);

create policy "Essays: write own" on public.essays
for insert to authenticated
with check (
  user_id = auth.uid() and tenant_id = (select tenant_id from public.users where id = auth.uid())
);

create policy "Essays: update own" on public.essays
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Essays: staff write by tenant" on public.essays
for all to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
)
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
);

-- Countdowns
create policy "Countdowns: tenant read" on public.countdowns
for select to authenticated
using (tenant_id = (select tenant_id from public.users where id = auth.uid()));

create policy "Countdowns: staff write" on public.countdowns
for all to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
)
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
);

-- Weekly reports
create policy "Weekly: read own or staff" on public.weekly_reports
for select to authenticated
using (
  user_id = auth.uid() or (
    tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
      public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
      public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
    )
  )
);

create policy "Weekly: staff write" on public.weekly_reports
for all to authenticated
using (
  tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
)
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid())
);

-- Activities
create policy "Activities: read own or staff" on public.activities
for select to authenticated
using (
  user_id = auth.uid() or (
    tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
      public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
      public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
    )
  )
);

create policy "Activities: staff insert" on public.activities
for insert to authenticated
with check (
  tenant_id = (select tenant_id from public.users where id = auth.uid()) and (
    public.has_role_in_tenant(auth.uid(), 'teacher', tenant_id) or
    public.has_role_in_tenant(auth.uid(), 'admin', tenant_id)
  )
);
