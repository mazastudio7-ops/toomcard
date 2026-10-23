-- MAZA STUDIO 팀 카드: 앞면을 마자 플레이트로, 로고를 MAZA 로고(움직이는 WebP)로 바꾼다.
-- 이미 DB 로 옮긴 카드(maza-studio/…)에만 적용된다. 파일 카드(/조윤서 등)는 코드 배포로 이미 바뀐다. 여러 번 실행해도 안전하다.
update public.pods p
set components_json =
  (p.components_json || jsonb_build_object(
      'layout', 'plate', 'plateCardImage', '/assets/maza_front_plate.jpg', 'theme', 'maza',
      'logo', jsonb_build_object('src', '/assets/logo_maza_mark.webp', 'fallback', '/assets/logo_maza.gif', 'alt', 'MAZA STUDIO Logo'),
      'avatar', '/assets/logo_maza_mark.webp', 'logoShape', 'square'))
  || jsonb_build_object('card', coalesce(p.components_json -> 'card', '{}'::jsonb) || jsonb_build_object(
      'layout', 'plate', 'plateCardImage', '/assets/maza_front_plate.jpg', 'theme', 'maza',
      'logo', jsonb_build_object('src', '/assets/logo_maza_mark.webp', 'fallback', '/assets/logo_maza.gif', 'alt', 'MAZA STUDIO Logo'),
      'avatar', '/assets/logo_maza_mark.webp', 'logoShape', 'square'))
where p.slug like 'maza-studio/%';
