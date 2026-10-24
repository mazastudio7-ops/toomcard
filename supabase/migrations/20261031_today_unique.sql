-- TODAY/TOTAL: 같은 사람(같은 기기)은 하루에 1번만 센다 (싸이월드 방식). 여러 번 실행해도 안전하다.
--   · 기기 표시(metadata.dev)가 없는 예전 기록은 한 건을 한 명으로 센다
--   · 날짜는 보는 사람의 시간대 기준

create or replace function public.tc_today_total(p_slug text, p_tz text default 'Asia/Seoul')
returns jsonb language sql stable security definer set search_path = public as $$
  with z as (select coalesce((select name from pg_timezone_names where name = p_tz limit 1), 'Asia/Seoul') as tz),
  v as (
    select coalesce(pv.metadata->>'dev', 'id' || pv.id) as who,
           (pv.created_at at time zone (select tz from z))::date as d
    from public.page_views pv
    where pv.target_slug = p_slug
  )
  select jsonb_build_object(
    'today', (select count(distinct who) from v where d = (now() at time zone (select tz from z))::date),
    'total', (select count(*) from (select distinct who, d from v) t)
  );
$$;
grant execute on function public.tc_today_total(text, text) to anon, authenticated;
