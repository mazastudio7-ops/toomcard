-- 대시보드 그래프용 통계: 하루별 조회·문의, 유입 채널, 문의 상태 깔때기를 서버에서 집계해 작은 결과만 돌려준다.
-- (조회 기록을 통째로 내려받지 않으므로 조회가 많아도 데이터 전송이 거의 들지 않는다.) 여러 번 실행해도 안전하다.

create or replace function public.tc_card_stats(p_slug text, p_days int default 30, p_tz text default 'Asia/Seoul')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 90);
  v_tz text := case when p_tz in (select name from pg_timezone_names) then p_tz else 'Asia/Seoul' end;
  v_from date := (now() at time zone v_tz)::date - (v_days - 1);
  v_ok boolean;
  v_series jsonb; v_vch jsonb; v_lch jsonb; v_fun jsonb;
begin
  select exists (select 1 from public.pods p where p.slug = p_slug and p.user_id = auth.uid())
      or (position('/' in p_slug) > 0 and public.tc_company_can(split_part(p_slug, '/', 1)))
    into v_ok;
  if not coalesce(v_ok, false) then raise exception 'not_allowed'; end if;

  select jsonb_agg(jsonb_build_object('d', to_char(g.d, 'YYYY-MM-DD'), 'views', coalesce(v.n, 0), 'leads', coalesce(l.n, 0)) order by g.d) into v_series
  from generate_series(v_from, (now() at time zone v_tz)::date, interval '1 day') as g(d)
  left join (select (created_at at time zone v_tz)::date as d, count(*) n from public.page_views
             where target_slug = p_slug and created_at >= v_from::timestamp at time zone v_tz group by 1) v on v.d = g.d::date
  left join (select (created_at at time zone v_tz)::date as d, count(*) n from public.leads
             where target_slug = p_slug and created_at >= v_from::timestamp at time zone v_tz group by 1) l on l.d = g.d::date;

  select coalesce(jsonb_agg(jsonb_build_object('name', ch, 'n', n) order by n desc), '[]'::jsonb) into v_vch from (
    select coalesce(nullif(metadata ->> 'channel', ''), 'Direct') ch, count(*) n from public.page_views
    where target_slug = p_slug and created_at >= v_from::timestamp at time zone v_tz group by 1 order by 2 desc limit 6) x;

  select coalesce(jsonb_agg(jsonb_build_object('name', ch, 'n', n) order by n desc), '[]'::jsonb) into v_lch from (
    select coalesce(nullif(metadata ->> 'channel', ''), 'Direct') ch, count(*) n from public.leads
    where target_slug = p_slug and created_at >= v_from::timestamp at time zone v_tz group by 1 order by 2 desc limit 6) x;

  select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) into v_fun from (
    select status, count(*) n from public.leads where target_slug = p_slug and created_at >= v_from::timestamp at time zone v_tz group by 1) x;

  return jsonb_build_object('days', coalesce(v_series, '[]'::jsonb), 'view_channels', v_vch, 'lead_channels', v_lch, 'funnel', v_fun);
end $$;
grant execute on function public.tc_card_stats(text, int, text) to authenticated;
