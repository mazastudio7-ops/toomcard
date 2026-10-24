-- 한글 카드 주소를 영문으로 바꾼다. 예전 한글 주소는 새 주소로 자동으로 넘어간다(이미 보낸 링크가 살아 있다). 여러 번 실행해도 안전하다.
--   MAZA 팀: 조윤서 → maza/yunseo-jo, 유지연 → maza/jiyeon, 김현수 → maza/hyunsoo, 김용수 → maza/yongsu, 박수빈 → maza/subin
--   그 외:   a/배미자 → a/baemija, a/배수안 → a/baesuan, 박수빈(이젠스타) → a/subin, 이향원 → hyangwon
-- 화면에 보이는 이름(한글 표기)은 그대로 둔다. 바꾸는 건 주소뿐이다.

create table if not exists public.tc_slug_alias (
  old_slug   text primary key,
  new_slug   text not null,
  created_at timestamptz not null default now()
);
alter table public.tc_slug_alias enable row level security;
drop policy if exists "alias read" on public.tc_slug_alias;
create policy "alias read" on public.tc_slug_alias for select using (true);

do $$
declare
  m record;
begin
  perform set_config('tc.bypass_slug_rule', 'on', true);
  for m in
    select * from (values
      ('maza/조윤서', 'maza/yunseo-jo'),
      ('maza/유지연', 'maza/jiyeon'),
      ('maza/김현수', 'maza/hyunsoo'),
      ('maza/김용수', 'maza/yongsu'),
      ('maza/박수빈', 'maza/subin'),
      ('a/배미자',    'a/baemija'),
      ('a/배수안',    'a/baesuan'),
      ('박수빈',      'a/subin'),
      ('이향원',      'hyangwon')
    ) as t(old_slug, new_slug)
  loop
    continue when not exists (select 1 from public.pods where slug = m.old_slug);       -- 이미 바뀌었거나 없는 것은 건너뜀
    if exists (select 1 from public.pods where lower(slug) = lower(m.new_slug)) then
      raise notice 'skip % (new address % already used)', m.old_slug, m.new_slug; continue;
    end if;
    update public.pods
       set slug = m.new_slug,
           -- 이름·소개 같은 다른 값은 건드리지 않고, 주소가 들어 있는 칸(slug·id·vcard.url)만 바꾼다
           components_json = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(components_json,
             '{slug}', to_jsonb(m.new_slug), false), '{id}', to_jsonb(m.new_slug), false),
             '{card,slug}', to_jsonb(m.new_slug), false), '{card,id}', to_jsonb(m.new_slug), false),
             '{vcard,url}', to_jsonb('https://toomcard.com/' || m.new_slug), false), '{card,vcard,url}', to_jsonb('https://toomcard.com/' || m.new_slug), false),
             '{card,companySlug}', to_jsonb(coalesce(components_json -> 'card' ->> 'companySlug', '')), false), '{card,star}', coalesce(components_json -> 'card' -> 'star', 'null'::jsonb), false)
     where slug = m.old_slug;
    if m.old_slug like 'maza/%' then
      update public.tc_company_members set member_slug = split_part(m.new_slug, '/', 2)
       where company_slug = 'maza' and member_slug = split_part(m.old_slug, '/', 2);
    end if;
    insert into public.tc_slug_alias (old_slug, new_slug) values (m.old_slug, m.new_slug) on conflict (old_slug) do update set new_slug = excluded.new_slug;
  end loop;
  perform set_config('tc.bypass_slug_rule', 'off', true);
end $$;
