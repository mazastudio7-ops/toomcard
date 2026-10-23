-- 문의(리드) 알림 + 회사 단위 보기. 여러 번 실행해도 안전하다.
--
-- 1) 새 문의가 오면 카드 주인에게 이메일로 알린다 (Resend 서비스 사용). 비밀 값은 채팅에 보내지 말고 SQL 편집기에서 직접 넣는다:
--      insert into public.tc_secrets (k, v) values ('resend_key', '여기에_API_키') on conflict (k) do update set v = excluded.v;
--      insert into public.tc_secrets (k, v) values ('lead_from', 'TOOMCARD <hello@toomcard.com>') on conflict (k) do update set v = excluded.v;
--    (보내는 주소의 도메인은 Resend 에서 인증돼 있어야 한다. 키를 넣기 전에는 알림만 조용히 건너뛰고 문의 저장은 정상이다.)
-- 2) 관리자 디스코드로는 "새 문의가 왔다"는 사실만 알린다 (개인정보는 보내지 않는다). 선택:
--      insert into public.tc_secrets (k, v) values ('discord_lead', '웹훅_주소') on conflict (k) do update set v = excluded.v;
-- 3) 알림을 끄려면:  delete from public.tc_secrets where k in ('resend_key', 'discord_lead');

create extension if not exists pg_net with schema extensions;
create table if not exists public.tc_secrets (k text primary key, v text not null);
alter table public.tc_secrets enable row level security;

create index if not exists leads_target_slug_idx on public.leads (target_slug, created_at desc);

create or replace function public.lead_notify() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_key text; v_from text; v_hook text; v_to text; v_name text; m jsonb := coalesce(new.metadata, '{}'::jsonb);
  v_html text;
  esc text;
begin
  select v into v_key from public.tc_secrets where k = 'resend_key';
  select v into v_from from public.tc_secrets where k = 'lead_from';
  select v into v_hook from public.tc_secrets where k = 'discord_lead';

  select (components_json -> 'card' ->> 'name') into v_name from public.pods where slug = new.target_slug;
  v_to := (select lower(email) from auth.users where id = new.user_id);
  if v_to is null then v_to := (select lower(owner_email) from public.tc_pod_claims where slug = new.target_slug); end if;

  if coalesce(v_key, '') <> '' and v_to is not null then
    v_html := '<div style="font-family:sans-serif;font-size:15px;line-height:1.6">'
      || '<b>' || replace(replace(coalesce(v_name, new.target_slug), '<', '&lt;'), '>', '&gt;') || '</b> 님의 명함으로 새 문의가 왔어요.<br><br>'
      || case when coalesce(m ->> 'name', '') <> '' then '이름: ' || replace(replace(m ->> 'name', '<', '&lt;'), '>', '&gt;') || '<br>' else '' end
      || case when coalesce(new.phone, '') <> '' then '전화: ' || replace(replace(new.phone, '<', '&lt;'), '>', '&gt;') || '<br>' else '' end
      || case when coalesce(m ->> 'email', '') <> '' then '이메일: ' || replace(replace(m ->> 'email', '<', '&lt;'), '>', '&gt;') || '<br>' else '' end
      || case when coalesce(m ->> 'memo', '') <> '' then '문의: ' || replace(replace(m ->> 'memo', '<', '&lt;'), '>', '&gt;') || '<br>' else '' end
      || case when coalesce(m ->> 'channel', '') <> '' then '유입: ' || replace(replace(m ->> 'channel', '<', '&lt;'), '>', '&gt;') || '<br>' else '' end
      || '<br><a href="https://toomcard.com/dashboard">대시보드에서 보기</a></div>';
    perform net.http_post(
      url := 'https://api.resend.com/emails',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
      body := jsonb_build_object('from', coalesce(nullif(v_from, ''), 'TOOMCARD <onboarding@resend.dev>'), 'to', jsonb_build_array(v_to),
                                 'subject', '[TOOMCARD] 새 문의가 왔어요', 'html', v_html));
  end if;

  if coalesce(v_hook, '') <> '' then
    perform net.http_post(url := v_hook, body := jsonb_build_object('content', '**새 문의** ' || coalesce(v_name, new.target_slug) || ' (' || coalesce(new.target_slug, '-') || ')'));
  end if;
  return new;
exception when others then
  raise warning 'lead_notify: %', sqlerrm;   -- 알림이 실패해도 문의 저장은 막지 않는다
  return new;
end $$;

drop trigger if exists lead_notify on public.leads;
create trigger lead_notify after insert on public.leads for each row execute function public.lead_notify();

-- 회사 관리자: 우리 회사 카드들로 들어온 문의를 한 번에 본다
create or replace function public.tc_company_leads(p_company text)
returns table (id bigint, target_slug text, phone text, metadata jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  return query select l.id, l.target_slug, l.phone, l.metadata, l.created_at
    from public.leads l where l.target_slug like p_company || '/%' order by l.created_at desc limit 500;
end $$;
grant execute on function public.tc_company_leads(text) to authenticated;
