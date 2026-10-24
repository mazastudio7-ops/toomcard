-- 이젠스타: 깨끗한 카드는 발행하자마자 바로 올라간다. 금지어·수상한 링크·하루 3장 초과만 검토 대기.
--   관리자는 /admin/star 에서 언제든 내리거나(보류) 다시 올릴 수 있다. 여러 번 실행해도 안전하다.
create or replace function public.star_on_pod_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := new.components_json->'card';
  on_now boolean := false;
  h text := md5(coalesce(c->'front'->'bg'->>'src', ''));
  r public.star_review;
  today_count int := 0;
  fl text[];
  clean boolean;
  admin_owner boolean := exists (select 1 from public.tc_admins where user_id = new.user_id);
begin
  on_now := lower(coalesce(c->'star'->>'on', '')) in ('true', 't', '1');
  if not on_now then return new; end if;
  fl := public.star_rule_flags(c);
  -- 사진이 없어도(플레이트·캐릭터 카드) 올라갈 수 있다. 금지어·링크·이름 없음만 막는다
  clean := coalesce(array_length(public.star_array_minus(fl, array['nophoto']), 1), 0) = 0;
  select * into r from public.star_review where slug = new.slug;
  if not found then
    select count(*) into today_count from public.star_review sr join public.pods p on p.slug = sr.slug
      where p.user_id = new.user_id and sr.submitted_at > now() - interval '1 day';
    if admin_owner or (clean and today_count < 3) then
      insert into public.star_review (slug, status, flags, photo_hash, approved_once, reviewed_at, reviewed_by)
        values (new.slug, 'approved', '{}', h, true, now(), new.user_id);
    else
      insert into public.star_review (slug, status, flags, photo_hash, reason)
        values (new.slug, 'pending', fl || case when today_count >= 3 then array['daily'] else '{}'::text[] end, h,
                case when today_count >= 3 then 'daily limit' end);
    end if;
  elsif r.status = 'rejected' and not admin_owner then
    -- 관리자가 내린 카드는 카드를 고쳐도 다시 검토를 거친다
    update public.star_review set status = 'pending', flags = fl, photo_hash = h, submitted_at = now(), reason = null where slug = new.slug;
  elsif admin_owner or clean then
    update public.star_review set status = 'approved', flags = '{}', photo_hash = h, approved_once = true, reviewed_at = now(), reviewed_by = new.user_id where slug = new.slug;
  else
    update public.star_review set status = 'pending', flags = fl, photo_hash = h, submitted_at = now(), reason = null where slug = new.slug;
  end if;
  return new;
exception when others then
  raise warning 'star_on_pod_change: %', sqlerrm;
  return new;
end $$;

-- 지금 대기 중인 깨끗한 카드도 한 번에 올린다
update public.star_review sr set status = 'approved', flags = '{}', approved_once = true, reviewed_at = now()
  from public.pods p
  where p.slug = sr.slug and sr.status = 'pending'
    and coalesce(array_length(public.star_array_minus(sr.flags, array['nophoto']), 1), 0) = 0;

-- 페이지 주소로 쓰는 아이디는 예약
insert into public.tc_reserved_slugs (slug, note) values ('friends', 'system'), ('stickers', 'system') on conflict do nothing;
