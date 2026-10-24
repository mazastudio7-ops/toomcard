-- 일촌(팔로우): 로그인한 사람이 다른 카드·미니홈을 일촌으로 맺는다. 여러 번 실행해도 안전하다.
--   · 숫자(일촌 수)는 누구나 볼 수 있고, 누가 맺었는지는 본인만 본다

create table if not exists public.tc_follow (
  user_id    uuid not null references auth.users(id) on delete cascade,
  slug       text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, slug)
);
create index if not exists tc_follow_slug_idx on public.tc_follow (slug);
alter table public.tc_follow enable row level security;

drop policy if exists "follow read own" on public.tc_follow;
create policy "follow read own" on public.tc_follow for select using (user_id = auth.uid());

-- 일촌 수 + 내가 맺었는지
create or replace function public.tc_follow_info(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'count', (select count(*) from public.tc_follow where slug = p_slug),
    'me', exists (select 1 from public.tc_follow where slug = p_slug and user_id = auth.uid())
  );
$$;
grant execute on function public.tc_follow_info(text) to anon, authenticated;

-- 맺기 / 끊기 (토글)
create or replace function public.tc_follow_toggle(p_slug text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_on boolean; n int;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if not exists (select 1 from public.pods where slug = p_slug) then raise exception 'no_card'; end if;
  if exists (select 1 from public.pods where slug = p_slug and user_id = auth.uid()) then raise exception 'self'; end if;
  if exists (select 1 from public.tc_follow where user_id = auth.uid() and slug = p_slug) then
    delete from public.tc_follow where user_id = auth.uid() and slug = p_slug; v_on := false;
  else
    select count(*) into n from public.tc_follow where user_id = auth.uid() and created_at > now() - interval '1 day';
    if n >= 300 then raise exception 'rate'; end if;
    insert into public.tc_follow (user_id, slug) values (auth.uid(), p_slug); v_on := true;
  end if;
  return jsonb_build_object('on', v_on, 'count', (select count(*) from public.tc_follow where slug = p_slug));
end $$;
grant execute on function public.tc_follow_toggle(text) to authenticated;

-- 내 일촌 목록 (이젠스타에 올린 카드는 대화명/가린 이름)
create or replace function public.tc_my_follows()
returns table (slug text, name text, photo text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select f.slug,
         case when coalesce((c.card->'star'->>'on')::boolean, false)
              then coalesce(nullif(trim(c.card->'star'->>'nick'), ''), public.tc_mask_name(c.card->>'name'))
              else coalesce(c.card->>'name', f.slug) end,
         coalesce(c.card->'front'->'bg'->>'src', c.card->>'plateCardImage', ''),
         f.created_at
  from public.tc_follow f
  join public.pods p on p.slug = f.slug
  cross join lateral (select coalesce(p.components_json->'card', p.components_json) as card) c
  where f.user_id = auth.uid()
  order by f.created_at desc
  limit 200;
$$;
grant execute on function public.tc_my_follows() to authenticated;
