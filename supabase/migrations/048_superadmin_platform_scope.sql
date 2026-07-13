-- Superadmin + platform-scoped admins.
-- super_admin = every platform + can promote/revoke admins.
-- other admin roles = scoped to one platform ('wankong' | 'smartkong').

alter table admin_roles
  add column if not exists platform text not null default 'all'
  check (platform in ('all','wankong','smartkong'));

-- super_admin always spans all platforms.
update admin_roles set platform = 'all' where role = 'super_admin';

-- ── Helper: is the given user a super admin? ──────────────────────────────
create or replace function public.is_super_admin(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from admin_roles
    where user_id = uid and role = 'super_admin'
  );
$$;

-- ── RLS: super admins can see & manage every admin row ────────────────────
drop policy if exists "super_admin manage admin_roles" on admin_roles;
create policy "super_admin manage admin_roles"
  on admin_roles for all
  using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

-- ── Promote an email to an admin role on a platform (super_admin only) ────
create or replace function public.grant_admin(
  p_email    text,
  p_role     text default 'moderator',
  p_platform text default 'all'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid;
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only a super admin can grant admin rights';
  end if;

  if p_role not in ('super_admin','moderator','competition_admin',
                    'distribution_admin','publishing_admin',
                    'finance_admin','support_admin') then
    raise exception 'Unknown admin role: %', p_role;
  end if;
  if p_platform not in ('all','wankong','smartkong') then
    raise exception 'Unknown platform: %', p_platform;
  end if;

  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'No account exists for %', p_email;
  end if;

  -- super_admin always spans all platforms
  if p_role = 'super_admin' then p_platform := 'all'; end if;

  insert into admin_roles (user_id, role, platform, granted_by)
  values (v_uid, p_role, p_platform, auth.uid())
  on conflict (user_id, role)
    do update set platform = excluded.platform, granted_by = excluded.granted_by;

  return v_uid;
end;
$$;

-- ── Revoke an admin role (super_admin only; can't strip your own super_admin) ──
create or replace function public.revoke_admin(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only a super admin can revoke admin rights';
  end if;
  if p_user_id = auth.uid() and p_role = 'super_admin' then
    raise exception 'You cannot revoke your own super admin role';
  end if;
  delete from admin_roles where user_id = p_user_id and role = p_role;
end;
$$;

-- ── List every admin with their email (super_admin only) ──────────────────
create or replace function public.list_admins()
returns table (user_id uuid, email text, role text, platform text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Only a super admin can list admins';
  end if;
  return query
    select ar.user_id, u.email::text, ar.role, ar.platform, ar.created_at
    from admin_roles ar
    join auth.users u on u.id = ar.user_id
    order by (ar.role = 'super_admin') desc, u.email;
end;
$$;

grant execute on function public.is_super_admin(uuid) to authenticated;
grant execute on function public.grant_admin(text, text, text) to authenticated;
grant execute on function public.revoke_admin(uuid, text) to authenticated;
grant execute on function public.list_admins() to authenticated;
