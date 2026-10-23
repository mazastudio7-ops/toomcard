-- 관리자 본인의 카드는 스타에 올리면 검토 대기 없이 바로 승인된다. 여러 번 실행해도 안전하다.
create or replace function public.star_on_pod_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c jsonb := new.components_json->'card';
  on_now boolean := false;
  h text := md5(coalesce(c->'front'->'bg'->>'src', ''));
  r public.star_review;
  today_count int;
  admin_owner boolean := exists (select 1 from public.tc_admins where user_id = new.user_id);
begin
  on_now := lower(coalesce(c->'star'->>'on', '')) in ('true', 't', '1');
  if not on_now then return new; end if;
  -- 투머스 관리자 본인의 카드는 검토 없이 바로 승인한다
  if admin_owner then
    insert into public.star_review (slug, status, flags, photo_hash, approved_once, reviewed_at, reviewed_by)
      values (new.slug, 'approved', '{}', h, true, now(), new.user_id)
      on conflict (slug) do update set status = 'approved', flags = '{}', photo_hash = h, approved_once = true, reviewed_at = now(), reviewed_by = new.user_id;
    return new;
  end if;
  select * into r from public.star_review where slug = new.slug;
  if not found then
    select count(*) into today_count from public.star_review sr join public.pods p on p.slug = sr.slug
      where p.user_id = new.user_id and sr.submitted_at > now() - interval '1 day';
    insert into public.star_review (slug, status, flags, photo_hash, reason)
      values (new.slug, 'pending', public.star_rule_flags(c) || case when today_count >= 3 then array['daily'] else '{}'::text[] end, h,
              case when today_count >= 3 then 'daily limit' end);
  elsif r.photo_hash is distinct from h then
    -- 사진이 바뀌면 다시 검토 (한 번 승인된 사람도)
    update public.star_review set status = 'pending', flags = public.star_rule_flags(c), photo_hash = h, submitted_at = now(), reason = null
      where slug = new.slug;
  elsif r.status = 'approved' then
    -- 사진은 그대로, 글자만 바뀜: 신뢰 사용자는 바로 반영하되 금지어가 생기면 다시 검토
    if coalesce(array_length(public.star_array_minus(public.star_rule_flags(c), array['nophoto']), 1), 0) > 0 then
      update public.star_review set status = 'pending', flags = public.star_rule_flags(c), submitted_at = now() where slug = new.slug;
    end if;
  elsif r.status = 'rejected' then
    update public.star_review set status = 'pending', flags = public.star_rule_flags(c), submitted_at = now(), reason = null where slug = new.slug;
  end if;
  return new;
exception when others then
  -- 스타 처리에 문제가 생겨도 카드 저장은 절대 막지 않는다
  raise warning 'star_on_pod_change: %', sqlerrm;
  return new;
end $$;

-- 이미 대기 중인 관리자 카드도 한 번에 승인
update public.star_review set status = 'approved', flags = '{}', approved_once = true, reviewed_at = now()
  where status in ('pending', 'rejected')
    and slug in (select p.slug from public.pods p join public.tc_admins a on a.user_id = p.user_id);
