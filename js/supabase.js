/**
 * TOOMCARD Supabase SDK Client
 * Supabase Project: omlcbrslzvdtqwbszgvg (툼카드 전용. 2026-10 SETUPOD 프로젝트에서 분리)
 */

const SUPABASE_URL = "https://omlcbrslzvdtqwbszgvg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGNicnNsenZkdHF3YnN6Z3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc4NTQsImV4cCI6MjEwODMxMzg1NH0.j2YVNIFIit7nzvaGGCprpFhPQfpQ6cQCf5n-2Dctg3g";

// Supabase 클라이언트 초기화
let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// 1. 카카오 간편 로그인
async function signInWithKakao(customRedirect) {
  if (!supabaseClient) return alert("Supabase 클라이언트가 초기화되지 않았습니다.");
  const redirectTarget = customRedirect || (window.location.origin + window.location.pathname);
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: redirectTarget
    }
  });
  if (error) console.error("Kakao login error:", error);
}

// 2. 구글 간편 로그인
async function signInWithGoogle(customRedirect) {
  if (!supabaseClient) return alert("Supabase 클라이언트가 초기화되지 않았습니다.");
  const redirectTarget = customRedirect || (window.location.origin + window.location.pathname);
  const { data, error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTarget
    }
  });
  if (error) console.error("Google login error:", error);
}

// 3. 이메일/비밀번호 간편 가입
async function signUpWithEmail(email, password) {
  if (!supabaseClient) return;
  return await supabaseClient.auth.signUp({ email, password });
}

// 4. 이메일 로그인
async function signInWithEmail(email, password) {
  if (!supabaseClient) return;
  return await supabaseClient.auth.signInWithPassword({ email, password });
}

// 5. 로그아웃
async function signOutUser() {
  if (!supabaseClient) return;
  await supabaseClient.auth.signOut();
  window.location.reload();
}

// 6. 현재 세션 / 유저 가져오기
async function getCurrentUser() {
  if (!supabaseClient) return null;
  const { data: { session } } = await supabaseClient.auth.getSession();
  return session ? session.user : null;
}

// 7. 내 팟(Pod) & 프로필 클라우드 동기화 (저장)
async function syncPodToCloud(slug, profileData, componentsData) {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  // 프로필 업데이트/생성
  const { error: profileErr } = await supabaseClient
    .from('profiles')
    .upsert({
      id: user.id,
      slug: slug,
      name: profileData.name,
      handle: profileData.handle,
      bio: profileData.bio,
      theme: profileData.theme || 'violet',
      updated_at: new Date().toISOString()
    });

  if (profileErr) return { error: profileErr.message };

  // 팟 컴포넌트 목록 업데이트/생성 (slug 기준 upsert)
  const { error: podErr } = await supabaseClient
    .from('pods')
    .upsert({
      user_id: user.id,
      slug: slug,
      components_json: componentsData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'slug' });

  if (podErr) return { error: podErr.message };

  return { success: true };
}

// 7-2. 팀/기업 명함 일괄 클라우드 저장
async function syncTeamPodsToCloud(companySlug, companyData, members) {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const results = [];
  const cleanCompSlug = companySlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  for (const m of members) {
    const memberSlug = (m.slug || m.name).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const fullSlug = `${cleanCompSlug}/${memberSlug}`;

    const cardModel = {
      theme: companyData.theme || 'obsidian',
      layout: companyData.layout || 'classic',
      name: m.name,
      role: m.role,
      company: companyData.company,
      companyWatermark: companyData.watermark || companyData.company,
      slogan: companyData.slogan || '',
      tagline: companyData.tagline || 'TO DAY, TO TOMORROW',
      phone: m.phone || '',
      email: m.email || '',
      moatTags: companyData.tags || ['3D 인터랙티브', 'vCard 주소록 저장', '스마트 NFC 연동'],
      primaryAction: {
        url: companyData.websiteUrl || 'https://toomcard.com',
        label: companyData.websiteLabel || '공식 웹사이트'
      },
      socials: [
        { type: 'kakao', url: companyData.kakaoUrl || '#', label: companyData.kakaoLabel || '카카오톡' },
        { type: 'instagram', url: companyData.instaUrl || '#', label: companyData.instaLabel || '인스타그램' }
      ],
      logo: {
        src: companyData.logoSrc || '/assets/logo_toomcard_hd.gif',
        fallback: '/assets/logo_toomcard_hd.gif',
        alt: companyData.company
      },
      vcard: {
        firstName: m.name,
        org: companyData.company,
        title: m.role,
        tel: m.phone,
        email: m.email,
        url: `https://toomcard.com/${fullSlug}`
      }
    };

    const { error: err } = await supabaseClient
      .from('pods')
      .upsert({
        user_id: user.id,
        slug: fullSlug,
        components_json: { card: cardModel },
        updated_at: new Date().toISOString()
      }, { onConflict: 'slug' });

    if (err) {
      console.warn(`Failed to sync pod ${fullSlug}:`, err);
      results.push({ slug: fullSlug, success: false, error: err.message });
    } else {
      results.push({ slug: fullSlug, success: true });
    }
  }

  return { success: true, results };
}

// 8. 클라우드에서 팟 불러오기 (공개 페이지 조회)
async function loadPodFromCloud(slug) {
  if (!supabaseClient || !slug) return null;

  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
  } catch (e) {}

  // 1. 디코딩된 slug로 조회 (한글 슬러그 지원)
  let { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('slug', decoded)
    .maybeSingle();

  let { data: pod } = await supabaseClient
    .from('pods')
    .select('*')
    .eq('slug', decoded)
    .maybeSingle();

  // 2. 만약 없으면 원본 slug로 재시도
  if (!pod && !profile && decoded !== slug) {
    const resPod = await supabaseClient
      .from('pods')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    pod = resPod?.data || null;

    const resProfile = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    profile = resProfile?.data || null;
  }

  // 3. 주소는 소문자로 들어오는데 저장된 slug 에 대문자가 있는 경우 (예: AndrewK)
  if (!pod && !profile) {
    const resCi = await supabaseClient.from('pods').select('*').ilike('slug', decoded.replace(/[%_]/g, '\\$&')).limit(1).maybeSingle();
    pod = resCi?.data || null;
  }

  return { profile, pod };
}

async function loadPodByUserId(userId) {
  if (!supabaseClient) return null;

  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) return null;

  const { data: pod } = await supabaseClient
    .from('pods')
    .select('*')
    .eq('slug', profile.slug)
    .single();

  return { profile, pod };
}

// 9. 방문자 리드(전화번호) 클라우드 DB 저장 (정밀 출처 분석 및 UTM 추적)
async function saveLeadToCloud(targetSlug, phone, memo = '', extra = {}) {
  if (!supabaseClient) return false;
  
  // Get owner's user_id from pods table
  let ownerId = null;
  const { data: pod } = await supabaseClient
    .from('pods')
    .select('user_id')
    .eq('slug', targetSlug)
    .maybeSingle();
    
  if (pod) {
    ownerId = pod.user_id;
  } else if (targetSlug && targetSlug.includes('/')) {
    const pureSlug = targetSlug.split('/').pop();
    const { data: podPure } = await supabaseClient
      .from('pods')
      .select('user_id')
      .eq('slug', pureSlug)
      .maybeSingle();
    if (podPure) ownerId = podPure.user_id;
  }

  // 출처(Referrer) 및 채널 스마트 파싱
  const ref = document.referrer || '';
  let channel = 'Direct / 카카오톡';
  if (ref.includes('instagram.com')) channel = '인스타그램';
  else if (ref.includes('naver.com')) channel = '네이버';
  else if (ref.includes('google.com')) channel = '구글 검색';
  else if (ref.includes('youtube.com')) channel = '유튜브';
  else if (ref.includes('threads.net')) channel = '스레드(Threads)';
  else if (ref.includes('facebook.com')) channel = '페이스북';
  else if (ref) channel = new URL(ref).hostname;

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source') || '';
  const utmMedium = urlParams.get('utm_medium') || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const { error } = await supabaseClient
    .from('leads')
    .insert({
      user_id: ownerId,
      target_slug: targetSlug,
      phone: phone || '',
      metadata: { 
        referrer: ref,
        channel: utmSource ? `${channel} (${utmSource})` : channel,
        utm_medium: utmMedium,
        device: isMobile ? 'Mobile' : 'Desktop',
        memo: memo || '',
        name: (extra && extra.name) || '',
        email: (extra && extra.email) || '',
        pageUrl: window.location.href,
        userAgent: navigator.userAgent
      }
    });
  return !error;
}

// 9-1. 내 명함에 접수된 리드(방문자 연락처) 목록 불러오기
async function getMyLeads() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data: leads, error } = await supabaseClient
    .from('leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) console.error("Error fetching leads:", error);
  return leads;
}

// 9-2. 명함 조회수(Analytics) 기록하기 (정밀 채널 및 세션 스토리지 중복 방지)
async function recordPageView(slug) {
  if (!supabaseClient) return false;
  // 중복 조회(새로고침) 방지를 위해 세션 스토리지 체크
  const viewedKey = `toomcard_viewed_${slug}`;
  if (sessionStorage.getItem(viewedKey)) return true;
  
  const ref = document.referrer || '';
  let channel = 'Direct / 카카오톡';
  if (ref.includes('instagram.com')) channel = '인스타그램';
  else if (ref.includes('naver.com')) channel = '네이버';
  else if (ref.includes('google.com')) channel = '구글 검색';
  else if (ref.includes('youtube.com')) channel = '유튜브';
  else if (ref.includes('threads.net')) channel = '스레드(Threads)';
  else if (ref) {
    try { channel = new URL(ref).hostname; } catch(e) { channel = 'External'; }
  }

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source') || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const { error } = await supabaseClient
    .from('page_views')
    .insert({
      target_slug: slug,
      metadata: { 
        referrer: ref,
        channel: utmSource ? `${channel} (${utmSource})` : channel,
        device: isMobile ? 'Mobile' : 'Desktop',
        userAgent: navigator.userAgent
      }
    });
    
  if (!error) {
    sessionStorage.setItem(viewedKey, 'true');
    return true;
  }
  return false;
}

// 9-3. 명함별 총 조회수 가져오기
async function getAnalytics(slug) {
  if (!supabaseClient) return 0;
  const { count, error } = await supabaseClient
    .from('page_views')
    .select('*', { count: 'exact', head: true })
    .eq('target_slug', slug);
  if (error) {
    console.error("Error fetching analytics:", error);
    return 0;
  }
  return count || 0;
}

// 9-4. 명함별 최근 N일 조회수 히스토리 가져오기 (차트용)
async function getAnalyticsHistory(slug, days = 7) {
  if (!supabaseClient) return [];
  
  const d = new Date();
  d.setDate(d.getDate() - days);
  const startDate = d.toISOString();
  
  const { data, error } = await supabaseClient
    .from('page_views')
    .select('created_at')
    .eq('target_slug', slug)
    .gte('created_at', startDate)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error("Error fetching analytics history:", error);
    return [];
  }
  
  // 날짜별 그룹핑 로직 (YYYY-MM-DD 형식)
  const history = {};
  for (let i = days - 1; i >= 0; i--) {
    const tempDate = new Date();
    tempDate.setDate(tempDate.getDate() - i);
    const dateStr = tempDate.toISOString().split('T')[0];
    history[dateStr] = 0;
  }
  
  data.forEach(view => {
    const dateStr = view.created_at.split('T')[0];
    if (history[dateStr] !== undefined) {
      history[dateStr]++;
    }
  });
  
  return Object.keys(history).map(date => ({
    date,
    views: history[date]
  }));
}

// 10. 내 명함 목록 불러오기 (대시보드용 - 본인 소유 명함 + 위임받은 직원 명함)
// 예전 프로젝트에서 옮긴 카드를 같은 이메일의 새 로그인에 연결한다 (한 번만 실제로 바뀜)
async function claimMyPods() {
  if (!supabaseClient) return 0;
  try { const { data } = await supabaseClient.rpc('tc_claim_pods'); return data || 0; } catch (e) { return 0; }
}

async function getMyPods() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const { data: ownPods, error: ownErr } = await supabaseClient
      .from('pods')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    if (ownErr) console.error("Error fetching own pods:", ownErr);
    let allPods = ownPods || [];

    // 위임받은 직원 이메일 체크 (관리자가 이메일로 권한을 부여한 명함)
    if (user.email) {
      try {
        const { data: assignedPods } = await supabaseClient
          .from('pods')
          .select('*')
          .contains('components_json', { assigned_email: user.email.toLowerCase() });
        if (assignedPods && assignedPods.length > 0) {
          assignedPods.forEach(ap => {
            if (!allPods.find(p => p.slug === ap.slug)) {
              ap._isAssignedStaff = true;
              allPods.push(ap);
            }
          });
        }
      } catch(e) {}
    }

    return allPods;
  } catch (err) {
    console.error("getMyPods exception:", err);
    return [];
  }
}

// 10-2. 임직원 이메일 권한 위임 저장 (기업 관리자가 직원에게 개별 관리 권한 부여)
async function assignStaffEmailToPod(slug, staffEmail) {
  const user = await getCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." };
  try {
    const { data: pod, error: getErr } = await supabaseClient
      .from('pods')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (getErr || !pod) return { error: "해당 명함을 찾을 수 없습니다." };

    const comp = pod.components_json || {};
    const cleanEmail = (staffEmail || '').trim().toLowerCase();
    comp.assigned_email = cleanEmail;
    if (comp.card) comp.card.assigned_email = cleanEmail;

    const { error: updateErr } = await supabaseClient
      .from('pods')
      .update({
        components_json: comp,
        updated_at: new Date().toISOString()
      })
      .eq('slug', slug);

    if (updateErr) return { error: updateErr.message };
    return { success: true };
  } catch(e) {
    return { error: e.message };
  }
}

// 11. 내 명함 삭제하기
async function deleteMyPod(slug) {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data, error } = await supabaseClient
    .from('pods')
    .delete()
    .eq('user_id', user.id)
    .eq('slug', slug)
    .select('slug');
  if (error) console.error("Error deleting pod:", error);
  return !error && Array.isArray(data) && data.length > 0;   // 실제로 지워진 줄이 있어야 성공
}

// 12. PRO 업그레이드 상태 저장
async function upgradeToPro() {
  const user = await getCurrentUser();
  if (!user) return false;
  const { error } = await supabaseClient
    .from('profiles')
    .update({ tier: 'PRO' })
    .eq('id', user.id);
  if (error) console.error("Error upgrading to PRO:", error);
  return !error;
}

// 13. PRO 상태 확인
async function checkProStatus() {
  const user = await getCurrentUser();
  if (!user) return false;
  const { data } = await supabaseClient
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();
  return data && data.tier === 'PRO';
}

// 14. 스타(자랑 피드) — docs/STAR.md, supabase/migrations/20261023_star.sql
// 좋아요·신고는 로그인 없이 기기 단위로 센다. 기기 값은 무작위 문자열이라 개인정보가 아니다.
function starDeviceId() {
  try {
    let id = localStorage.getItem('tc_device');
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)).replace(/-/g, '').slice(0, 32);
      localStorage.setItem('tc_device', id);
    }
    return id;
  } catch (e) { return 'nostore' + Math.random().toString(16).slice(2, 12); }
}

async function starLike(slug) {
  if (!supabaseClient || !slug) return false;
  const { error } = await supabaseClient.from('star_likes').insert({ slug, device_id: starDeviceId() });
  return !error || error.code === '23505';   // 이미 누른 경우도 성공으로 본다
}

async function starLikeCount(slug) {
  if (!supabaseClient || !slug) return 0;
  const { data, error } = await supabaseClient.rpc('star_like_count', { p_slug: slug });
  return error ? 0 : Number(data || 0);
}

async function starLiked(slug) {
  if (!supabaseClient || !slug) return false;
  const { data, error } = await supabaseClient.rpc('star_liked', { p_slug: slug, p_device: starDeviceId() });
  return !error && !!data;
}

async function starFeed({ tag = null, sort = 'hot', limit = 40, offset = 0 } = {}) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.rpc('star_feed', { p_tag: tag, p_sort: sort, p_limit: limit, p_offset: offset });
  if (error) { console.warn('star_feed', error); return []; }
  return data || [];
}

async function starWeekly(limit = 3) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.rpc('star_weekly', { p_limit: limit });
  return error ? [] : (data || []);
}

async function recordLinkClick(slug, kind, source = 'card') {
  if (!supabaseClient || !slug || !kind) return false;
  const { error } = await supabaseClient.from('star_link_clicks').insert({ slug, kind: String(kind).slice(0, 32), source });
  return !error;
}

async function reportStarCard(slug, reason) {
  if (!supabaseClient || !slug) return false;
  const { error } = await supabaseClient.from('star_reports').insert({ slug, reason, device_id: starDeviceId() });
  return !error || error.code === '23505';
}

async function getMyStarStats(slug) {
  if (!supabaseClient || !slug) return null;
  const { data, error } = await supabaseClient.rpc('my_star_stats', { p_slug: slug });
  return error ? null : data;
}

// 비공개 항목(전화·이메일 등)은 pods 와 따로 저장한다. 명함 링크 키가 맞을 때만 내려온다.
async function savePrivateCard(slug, data) {
  const user = await getCurrentUser();
  if (!user || !slug) return false;
  const { error } = await supabaseClient.from('tc_pod_private').upsert({ slug, user_id: user.id, data, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
  return !error;
}

async function getMyPrivateCard(slug) {
  if (!supabaseClient || !slug) return null;
  const { data } = await supabaseClient.from('tc_pod_private').select('data').eq('slug', slug).maybeSingle();
  return data ? data.data : null;
}

async function getMyShareKey(slug) {
  if (!supabaseClient || !slug) return null;
  const { data } = await supabaseClient.from('tc_pod_private').select('share_key').eq('slug', slug).maybeSingle();
  return data ? data.share_key : null;
}

async function getPrivateCard(slug, key) {
  if (!supabaseClient || !slug || !key) return null;
  const { data, error } = await supabaseClient.rpc('tc_get_private_card', { p_slug: slug, p_key: key });
  return error ? null : data;
}

// 관리자 검토 화면
async function adminStarQueue() {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.rpc('admin_star_queue');
  if (error) { console.warn('admin_star_queue', error); return null; }
  return data || [];
}

async function adminStarLive() {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.rpc('admin_star_live');
  if (error) { console.warn('admin_star_live', error); return null; }
  return data || [];
}

async function adminStarDecide(slug, status, reason = null) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.rpc('admin_star_decide', { p_slug: slug, p_status: status, p_reason: reason });
  return !error;
}
