-- 이젠스타에는 실명 대신 대화명을 보여 준다. 대화명이 없으면 이름을 "박○○"처럼 가린다. 여러 번 실행해도 안전하다.
create or replace function public.tc_mask_name(n text) returns text language sql immutable as $$
  select case when coalesce(trim(n), '') = '' then '' else left(trim(n), 1) || repeat('○', greatest(least(char_length(trim(n)) - 1, 2), 1)) end
$$;

create or replace function public.star_public_card(c jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'name',  coalesce(nullif(trim(c->'star'->>'nick'), ''), public.tc_mask_name(c->>'name')),
    'role',  c->>'role',
    'tag',   c->'star'->>'tag',
    'front', jsonb_build_object('bg', c->'front'->'bg', 'frame', c->'front'->>'frame', 'frameTone', c->'front'->>'frameTone')
  );
$$;
