-- pods 는 누구나 읽을 수 있어서 owner_email 이 공개로 보인다 → 따로 옮기고 지운다.
-- 20261023_00_base.sql 다음에 한 번 실행. 여러 번 실행해도 안전하다.

create table if not exists public.tc_pod_claims (
  slug        text primary key references public.pods(slug) on delete cascade,
  owner_email text not null
);
alter table public.tc_pod_claims enable row level security;   -- 정책 없음: 아무도 직접 못 읽는다

do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'pods' and column_name = 'owner_email') then
    insert into public.tc_pod_claims (slug, owner_email)
      select slug, owner_email from public.pods where owner_email is not null and user_id is null
      on conflict (slug) do nothing;
    alter table public.pods drop column owner_email;
  end if;
end $$;

create or replace function public.tc_claim_pods()
returns int language plpgsql security definer set search_path = public as $$
declare n int; e text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or e = '' then return 0; end if;
  update public.pods p set user_id = auth.uid()
    from public.tc_pod_claims c
    where c.slug = p.slug and p.user_id is null and lower(c.owner_email) = e;
  get diagnostics n = row_count;
  if n > 0 then
    delete from public.tc_pod_claims c using public.pods p where c.slug = p.slug and p.user_id = auth.uid();
    insert into public.profiles (id, slug, name)
      select auth.uid(), p.slug, p.components_json->'card'->>'name' from public.pods p
      where p.user_id = auth.uid() order by p.updated_at desc limit 1
      on conflict (id) do nothing;
  end if;
  return n;
end $$;
grant execute on function public.tc_claim_pods() to authenticated;
