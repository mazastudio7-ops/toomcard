-- 상품 소개 페이지 주소는 아이디로 못 쓴다 (toomcard.com/link · /minihome). 여러 번 실행해도 안전하다.
insert into public.tc_reserved_slugs (slug, note) values ('link', 'system'), ('minihome', 'system'), ('multilink', 'system'), ('home', 'system'), ('links', 'system')
on conflict do nothing;
insert into public.tc_reserved_slugs (slug, note) values ('find', 'system') on conflict do nothing;
