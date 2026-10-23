-- 조윤서 대표의 로그인(구글) 이메일을 metasoseono@gmail.com 으로 바꾼다. Supabase SQL Editor 에서 한 번 실행한다.
-- 바뀌는 것: 회사 관리자 이메일, 카드가 본인에게 연결되는 이메일.
-- 바뀌지 않는 것: 카드 뒷면에 보이는 연락처 이메일(ceo@mazastudio.kr). 그건 명함에 적힌 연락처일 뿐 로그인과 별개다.
-- 여러 번 실행해도 안전하다.

-- 1) 회사 관리자로 추가 (예전 ceo@mazastudio.kr 도 그대로 둔다. 지우려면 맨 아래 줄 주석을 풀면 된다)
insert into public.tc_company_admins (company_slug, email) values ('maza-studio', 'metasoseono@gmail.com') on conflict do nothing;

-- 2) 구성원 표의 이메일
update public.tc_company_members set email = 'metasoseono@gmail.com' where company_slug = 'maza-studio' and member_slug = '조윤서';

-- 3) 카드 연결: 아직 본인에게 연결 전이면 새 이메일로 로그인할 때 연결되게 한다
update public.tc_pod_claims set owner_email = 'metasoseono@gmail.com' where slug = 'maza-studio/조윤서';

-- 4) 그 이메일로 이미 가입한 계정이 있으면 바로 연결
update public.pods p set user_id = u.id
from auth.users u
where p.slug = 'maza-studio/조윤서' and p.user_id is null and lower(u.email) = 'metasoseono@gmail.com';

-- (선택) 예전 로그인 이메일을 회사 관리자에서 빼기
-- delete from public.tc_company_admins where company_slug = 'maza-studio' and email = 'ceo@mazastudio.kr';
