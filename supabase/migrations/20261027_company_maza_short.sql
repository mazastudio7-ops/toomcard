-- 회사 주소 줄이기: maza-studio → maza (toomcard.com/maza/조윤서 처럼 짧아진다)
-- 이미 있는 toomcard.com/maza (Andrew K 카드)는 그대로다. 회사 주소와 개인 카드 주소는 서로 다른 칸이다.
-- 예전 주소(maza-studio/…)는 사이트가 자동으로 새 주소로 넘겨 준다. 여러 번 실행해도 안전하다.

do $$
begin
  if exists (select 1 from public.tc_companies where slug = 'maza-studio') and not exists (select 1 from public.tc_companies where slug = 'maza') then
    perform set_config('tc.bypass_slug_rule', 'on', true);
    -- 회사 (구성원·관리자 표는 on update cascade 로 같이 바뀐다)
    update public.tc_companies set slug = 'maza' where slug = 'maza-studio';
    -- 카드들 (claims·star 등은 pods(slug) 를 따라 같이 바뀐다)
    update public.pods
       set slug = 'maza/' || substr(slug, length('maza-studio/') + 1),
           components_json = replace(components_json::text, 'maza-studio', 'maza')::jsonb
     where slug like 'maza-studio/%';
    perform set_config('tc.bypass_slug_rule', 'off', true);
  end if;
end $$;

-- 회사 브랜드(로고·앞면) 기본값은 새 주소 기준으로
update public.tc_companies set logo_url = '/assets/logo_maza_mark.webp', plate_url = '/assets/maza_front_plate.jpg', brand_color = '#7c3aed' where slug = 'maza';
