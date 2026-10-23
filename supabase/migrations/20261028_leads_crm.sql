-- 리드 CRM-라이트: 받은 문의마다 상태·메모·다시 연락할 날짜를 남긴다. 여러 번 실행해도 안전하다.
--   상태: new(새 문의) · contacted(연락함) · talking(상담 중) · won(계약) · hold(보류)

alter table public.leads add column if not exists status text not null default 'new';
alter table public.leads add column if not exists note text;
alter table public.leads add column if not exists followup_at timestamptz;
alter table public.leads add column if not exists updated_at timestamptz;
do $$ begin
  alter table public.leads add constraint leads_status_chk check (status in ('new', 'contacted', 'talking', 'won', 'hold'));
exception when duplicate_object then null; end $$;
create index if not exists leads_owner_status_idx on public.leads (user_id, status, created_at desc);
create index if not exists leads_followup_idx on public.leads (user_id, followup_at) where followup_at is not null;

-- 상태·메모·다시 연락 날짜만 바꿀 수 있다 (카드 주인 또는 그 회사 관리자). 연락처 내용은 바꾸지 못한다.
create or replace function public.tc_lead_update(p_id bigint, p_status text, p_note text, p_followup timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare l public.leads;
begin
  select * into l from public.leads where id = p_id;
  if not found then raise exception 'not_found'; end if;
  if not (l.user_id = auth.uid() or (position('/' in coalesce(l.target_slug, '')) > 0 and public.tc_company_can(split_part(l.target_slug, '/', 1)))) then
    raise exception 'not_allowed';
  end if;
  if p_status not in ('new', 'contacted', 'talking', 'won', 'hold') then raise exception 'bad_status'; end if;
  update public.leads set status = p_status, note = left(nullif(trim(coalesce(p_note, '')), ''), 2000), followup_at = p_followup, updated_at = now() where id = p_id;
end $$;
grant execute on function public.tc_lead_update(bigint, text, text, timestamptz) to authenticated;

-- 회사 관리자 목록에도 상태·메모·다시 연락 날짜를 같이 돌려준다
drop function if exists public.tc_company_leads(text);
create or replace function public.tc_company_leads(p_company text)
returns table (id bigint, target_slug text, phone text, metadata jsonb, created_at timestamptz, status text, note text, followup_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.tc_company_can(p_company) then raise exception 'not_allowed'; end if;
  return query select l.id, l.target_slug, l.phone, l.metadata, l.created_at, l.status, l.note, l.followup_at
    from public.leads l where l.target_slug like p_company || '/%' order by l.created_at desc limit 500;
end $$;
grant execute on function public.tc_company_leads(text) to authenticated;
