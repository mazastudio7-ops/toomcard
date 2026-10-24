-- 사용자 카드에 남아 있는 툼카드 기본 로고·'T' 엠블럼을 지운다 (브랜드 카드와 회사 카드는 제외). 로고가 없으면 본인 이니셜 엠블럼이 쓰인다. 여러 번 실행해도 안전하다.
update public.pods
   set components_json = jsonb_set(components_json, '{card,logo,src}', '""'::jsonb, true)
 where slug not in ('toomcard', 'toomus', 'ceo', 'andrew', 'hyangwon')
   and position('/' in slug) = 0
   and coalesce(components_json -> 'card' -> 'logo' ->> 'src', '') ~ '/assets/(logo_toomcard|logo_toomus|toomcard_hd)';
update public.pods
   set components_json = jsonb_set(components_json, '{card,emblem,text}', '""'::jsonb, true)
 where slug not in ('toomcard', 'toomus', 'ceo', 'andrew', 'hyangwon')
   and position('/' in slug) = 0
   and components_json -> 'card' -> 'emblem' ->> 'text' = 'T'
   and left(coalesce(components_json -> 'card' ->> 'name', ''), 1) not in ('T', 't');
