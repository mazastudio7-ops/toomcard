-- 관리자: 지금 이젠스타에 게시 중인 카드 목록 (내리기용). 내리기는 기존 admin_star_decide(slug, 'rejected', 사유)를 쓴다.
-- 내려간 카드는 주인이 다시 저장하면 '검토 대기'로 돌아가고, 관리자가 다시 승인해야 올라간다. 여러 번 실행해도 안전하다.
create or replace function public.admin_star_live()
returns table (slug text, card jsonb, status text, flags text[], reason text, reports bigint, submitted_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.tc_is_admin() then raise exception 'not admin'; end if;
  return query
    select r.slug, p.components_json -> 'card', r.status, r.flags, r.reason,
      (select count(*) from public.star_reports s where s.slug = r.slug), coalesce(r.reviewed_at, r.submitted_at)
    from public.star_review r join public.pods p on p.slug = r.slug
    where r.status = 'approved'
      and lower(coalesce(p.components_json -> 'card' -> 'star' ->> 'on', '')) in ('true', 't', '1')
    order by coalesce(r.reviewed_at, r.submitted_at) desc;
end $$;
grant execute on function public.admin_star_live() to authenticated;
