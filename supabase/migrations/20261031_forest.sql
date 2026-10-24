-- 동네 숲: 지역·업종별로 모아 보는 나무들. 메이커에서 "동네 숲에 내 나무 심기"를 켠 카드만 나온다 (기본 꺼짐).
--   카드 데이터: card.region = { sido, city, forest: true }
--   전화번호·이메일은 돌려주지 않는다. 이젠스타 카드는 대화명/가린 이름. 여러 번 실행해도 안전하다.

insert into public.tc_reserved_slugs (slug, note) values ('forest', 'system'), ('sitemap', 'system'), ('robots', 'system')
on conflict do nothing;

create or replace function public.tc_forest(p_sido text default null, p_city text default null, p_industry text default null)
returns table (slug text, name text, company text, role text, industry text, industry_text text, sido text, city text,
               photo text, kind text, has_home boolean, visits bigint, follows bigint, guestbook bigint, likes bigint, since date)
language sql stable security definer set search_path = public as $$
  with m as (
    select p.slug, p.created_at, coalesce(p.components_json->'card', p.components_json) as c
    from public.pods p
    where coalesce((coalesce(p.components_json->'card', p.components_json)->'region'->>'forest')::boolean, false)
  )
  select m.slug,
         case when coalesce((m.c->'star'->>'on')::boolean, false)
              then coalesce(nullif(trim(m.c->'star'->>'nick'), ''), public.tc_mask_name(m.c->>'name'))
              else coalesce(m.c->>'name', '') end,
         coalesce(m.c->>'company', ''), coalesce(m.c->>'role', ''),
         coalesce(m.c->>'industry', ''), coalesce(m.c->>'industryText', ''),
         m.c->'region'->>'sido', m.c->'region'->>'city',
         coalesce(case when m.c->'front'->'bg'->>'type' = 'image' then m.c->'front'->'bg'->>'src' end, m.c->>'plateCardImage', ''),
         coalesce(m.c->>'kind', 'personal'),
         coalesce((m.c->'page'->>'on')::boolean, false) or coalesce(m.c->>'kind', '') = 'minihome',
         (select count(*) from (select distinct coalesce(v.metadata->>'dev', 'id' || v.id), (v.created_at at time zone 'Asia/Seoul')::date
                                 from public.page_views v where v.target_slug = m.slug) t),
         (select count(*) from public.tc_follow f where f.slug = m.slug),
         (select count(*) from public.tc_guestbook g where g.slug = m.slug and g.status = 'approved'),
         (select count(*) from public.star_likes l where l.slug = m.slug),
         m.created_at::date
  from m
  where (p_sido is null or p_sido = '' or m.c->'region'->>'sido' = p_sido)
    and (p_city is null or p_city = '' or m.c->'region'->>'city' = p_city)
    and (p_industry is null or p_industry = '' or m.c->>'industry' = p_industry)
  limit 300;
$$;
grant execute on function public.tc_forest(text, text, text) to anon, authenticated;

-- 숲 지도: 지역별 나무 수
create or replace function public.tc_forest_regions()
returns table (sido text, city text, industry text, n bigint)
language sql stable security definer set search_path = public as $$
  select c->'region'->>'sido', coalesce(c->'region'->>'city', ''), coalesce(c->>'industry', ''), count(*)
  from (select coalesce(components_json->'card', components_json) as c from public.pods) p
  where coalesce((c->'region'->>'forest')::boolean, false) and coalesce(c->'region'->>'sido', '') <> ''
  group by 1, 2, 3;
$$;
grant execute on function public.tc_forest_regions() to anon, authenticated;
