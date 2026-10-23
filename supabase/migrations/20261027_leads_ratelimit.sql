-- 문의(리드) 폭주·봇 방지: 로그인 없이 누구나 넣을 수 있으므로 서버(DB)에서 속도를 제한한다. 여러 번 실행해도 안전하다.
--   · 같은 카드에 1분에 30건, 하루 2,000건까지
--   · 같은 카드에 같은 전화번호/이메일은 10분에 1건 (중복 클릭·재전송 흡수)
--   · 전화·이메일 둘 다 없는 빈 문의는 거부
-- 넘으면 insert 가 실패하고, 카드 화면은 "잠시 후 다시 시도" 안내를 보여 준다.

create index if not exists leads_target_created_idx on public.leads (target_slug, created_at desc);

create or replace function public.leads_rate_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  v_email text := lower(trim(coalesce(new.metadata ->> 'email', '')));
  n int;
begin
  if coalesce(new.target_slug, '') = '' then raise exception 'lead_no_target'; end if;
  if length(v_phone) < 8 and position('@' in v_email) = 0 then raise exception 'lead_no_contact'; end if;

  select count(*) into n from public.leads where target_slug = new.target_slug and created_at > now() - interval '1 minute';
  if n >= 30 then raise exception 'lead_rate_minute'; end if;

  select count(*) into n from public.leads where target_slug = new.target_slug and created_at > now() - interval '1 day';
  if n >= 2000 then raise exception 'lead_rate_day'; end if;

  select count(*) into n from public.leads
   where target_slug = new.target_slug and created_at > now() - interval '10 minutes'
     and ((length(v_phone) >= 8 and regexp_replace(coalesce(phone, ''), '\D', '', 'g') = v_phone)
       or (position('@' in v_email) > 0 and lower(trim(coalesce(metadata ->> 'email', ''))) = v_email));
  if n >= 1 then raise exception 'lead_duplicate'; end if;

  -- 메타데이터 크기 제한 (큰 덩어리를 밀어 넣는 공격 차단)
  if length(new.metadata::text) > 8000 then new.metadata := jsonb_build_object('memo', left(coalesce(new.metadata ->> 'memo', ''), 2000), 'email', v_email, 'name', left(coalesce(new.metadata ->> 'name', ''), 80)); end if;
  return new;
end $$;

drop trigger if exists leads_rate_limit on public.leads;
create trigger leads_rate_limit before insert on public.leads for each row execute function public.leads_rate_limit();
