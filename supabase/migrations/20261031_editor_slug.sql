-- 페이지 에디터 주소는 아이디로 못 쓴다. 여러 번 실행해도 안전하다.
insert into public.tc_reserved_slugs (slug, note) values ('editor', 'system') on conflict do nothing;
