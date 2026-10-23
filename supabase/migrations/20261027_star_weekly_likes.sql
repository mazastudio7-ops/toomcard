-- 홈 "이번 주 이젠스타" 타일의 하트 숫자가 카드 안의 전체 좋아요와 같게 나오도록 likes(전체)도 돌려준다.
drop function if exists public.star_weekly(int);
create or replace function public.star_weekly(p_limit int default 3)
returns table (slug text, card jsonb, likes_week bigint, likes bigint)
language sql stable security definer set search_path = public as $$
  select slug, card, likes_week, likes from public.star_feed(null, 'hot', least(p_limit, 10), 0) where likes_week > 0;
$$;
grant execute on function public.star_weekly(int) to anon, authenticated;
