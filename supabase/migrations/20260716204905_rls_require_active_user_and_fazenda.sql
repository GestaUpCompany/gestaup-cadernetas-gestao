create or replace function public.current_user_has_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $func$
  select
    exists (
      select 1
      from usuarios u
      where (u.auth_id = auth.uid() or u.id = auth.uid())
        and coalesce(u.ativo, false) = true
        and (
          u.papel = 'admin'
          or exists (
            select 1
            from usuario_fazenda uf
            join fazendas f on f.id = uf.fazenda_id
            where uf.usuario_id = u.id
              and coalesce(uf.ativo, false) = true
              and coalesce(f.ativo, false) = true
          )
        )
    )
    or exists (
      select 1
      from peoes p
      join fazendas f on f.acesso_id = p.fazenda_id
      where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        and coalesce(p.ativo, false) = true
        and coalesce(f.ativo, false) = true
    );
$func$;

revoke all on function public.current_user_has_access() from public;
grant execute on function public.current_user_has_access() to authenticated;
grant execute on function public.current_user_has_access() to anon;

-- usuarios
drop policy if exists "require_active_access" on public.usuarios;
create policy "require_active_access" on public.usuarios
  as restrictive for all to authenticated
  using (public.current_user_has_access())
  with check (public.current_user_has_access());

-- fazendas
drop policy if exists "require_active_access" on public.fazendas;
create policy "require_active_access" on public.fazendas
  as restrictive for all to authenticated
  using (public.current_user_has_access())
  with check (public.current_user_has_access());

-- usuario_fazenda
drop policy if exists "require_active_access" on public.usuario_fazenda;
create policy "require_active_access" on public.usuario_fazenda
  as restrictive for all to authenticated
  using (public.current_user_has_access())
  with check (public.current_user_has_access());;
