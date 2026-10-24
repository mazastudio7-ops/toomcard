-- 카드 뒷면 "스토리" 숫자: 누구나 볼 수 있는 공개 숫자만 돌려준다 (함께한 날 수, 열린 횟수, 좋아요). 여러 번 실행해도 안전하다.
create or replace function public.tc_card_public_stats(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'since', (select to_char(p.created_at, 'YYYY-MM-DD') from public.pods p where p.slug = p_slug),
    'views', (select count(*) from public.page_views v where v.target_slug = p_slug),
    'likes', (select count(*) from public.star_likes l where l.slug = p_slug)
  );
$$;
grant execute on function public.tc_card_public_stats(text) to anon, authenticated;
