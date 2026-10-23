-- 새 주소 체계: 무료 카드는 toomcard.com/a/이름 (같은 이름이면 b, c, d …).
-- 글자 없이 맨 앞에 오는 주소(toomcard.com/이름)는 투머스 관리자만 만든다. 골드네임으로 쓴다.
-- 이미 있는 카드의 주소는 그대로 유지되고, 주인은 계속 고칠 수 있다. 여러 번 실행해도 안전하다.

-- 대소문자만 다른 같은 주소 막기
create unique index if not exists pods_slug_lower_uq on public.pods (lower(slug));

create or replace function public.tc_pod_slug_rule() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;            -- SQL 편집기 · 서버 작업
  if public.tc_is_admin() then return new; end if;           -- 관리자는 맨 앞 주소도 가능
  -- upsert 로 자기 카드를 고치는 경우(예전 맨 앞 주소 포함)
  if exists (select 1 from public.pods p where p.slug = new.slug and p.user_id = auth.uid()) then return new; end if;
  if new.slug !~ '^[a-z]/[a-z0-9_가-힣-]{1,40}$' then
    raise exception 'slug_namespace: free cards use a/name' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists tc_pod_slug_rule on public.pods;
create trigger tc_pod_slug_rule before insert on public.pods
  for each row execute function public.tc_pod_slug_rule();

-- ── 주소 바꾸기 ─────────────────────────────────────────────
-- pods.slug 를 가리키는 모든 표가 주소가 바뀔 때 같이 따라가게 한다 (삭제 때 같이 지워지는 것은 그대로)
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname, pg_get_constraintdef(c.oid) as def
    from pg_constraint c
    where c.contype = 'f' and c.confrelid = 'public.pods'::regclass and c.confupdtype <> 'c'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
    execute format('alter table %s add constraint %I %s on update cascade', r.tbl, r.conname, r.def);
  end loop;
end $$;

create or replace function public.tc_rename_pod(p_old text, p_new text) returns text
language plpgsql security definer set search_path = public as $$
declare v_new text := lower(trim(coalesce(p_new, '')));
begin
  if auth.uid() is null then raise exception 'login_required'; end if;
  if not exists (select 1 from public.pods where slug = p_old and user_id = auth.uid()) then raise exception 'not_owner'; end if;
  if not public.tc_is_admin() and v_new !~ '^[a-z]/[a-z0-9_가-힣-]{1,40}$' then raise exception 'slug_namespace'; end if;
  if v_new = '' or v_new = lower(p_old) then return p_old; end if;
  if exists (select 1 from public.pods where lower(slug) = v_new) then raise exception 'slug_taken'; end if;
  update public.pods set slug = v_new, updated_at = now(),
    components_json = case when components_json ? 'card'
      then jsonb_set(jsonb_set(components_json, '{card,slug}', to_jsonb(v_new), true), '{card,id}', to_jsonb(v_new), true)
      else components_json end
    where slug = p_old;
  update public.page_views set target_slug = v_new where target_slug = p_old;
  update public.profiles set slug = v_new where id = auth.uid() and slug = p_old;
  return v_new;
end $$;
grant execute on function public.tc_rename_pod(text, text) to authenticated;
