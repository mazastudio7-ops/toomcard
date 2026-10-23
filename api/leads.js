const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://omlcbrslzvdtqwbszgvg.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tbGNicnNsenZkdHF3YnN6Z3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3Mzc4NTQsImV4cCI6MjEwODMxMzg1NH0.j2YVNIFIit7nzvaGGCprpFhPQfpQ6cQCf5n-2Dctg3g";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

// Service role key가 제공되면 RLS bypass, 없으면 anon key 사용
const supabaseKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, supabaseKey);

// 백업 원장 파일 경로 (/tmp 는 Vercel Serverless 실행 중 쓰기 가능)
const BACKUP_LEDGER_PATH = '/tmp/toomcard_leads_ledger.jsonl';

function appendToLocalLedger(leadObj) {
  try {
    fs.appendFileSync(BACKUP_LEDGER_PATH, JSON.stringify(leadObj) + '\n', 'utf8');
  } catch (err) {
    console.warn('[TOOMCARD Ledger Warning]:', err.message);
  }
}

function readFromLocalLedger() {
  try {
    if (!fs.existsSync(BACKUP_LEDGER_PATH)) return [];
    const lines = fs.readFileSync(BACKUP_LEDGER_PATH, 'utf8').split('\n').filter(Boolean);
    return lines.map(line => {
      try { return JSON.parse(line); } catch (e) { return null; }
    }).filter(Boolean);
  } catch (err) {
    return [];
  }
}

module.exports = async (req, res) => {
  // CORS 허용 (mazaus.com, autosite.kr 등 외부 도메인에서도 셋업팟 DB로 직접 전달 가능)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { 
        domain, 
        email, 
        phone, 
        kakao_id, 
        contact, 
        name, 
        lead_type, 
        pod_id,
        gift_title,
        memo,
        source 
      } = req.body || {};

      if (!email && !phone && !contact) {
        return res.status(400).json({ success: false, error: 'Contact (email or phone) is required' });
      }

      const normalizedEmail = email 
        ? email.trim().toLowerCase() 
        : (contact && contact.includes('@') ? contact.trim().toLowerCase() : `inbound_${Date.now()}@toomcard.lead`);
      const resolvedPhone = phone || (contact && !contact.includes('@') ? contact : null);
      const resolvedKakao = kakao_id || null;
      const resolvedDomain = domain || 'toomcard.com';
      const resolvedSource = source || 'toomcard_web';
      const timestamp = new Date().toISOString();

      const leadRecord = {
        domain: resolvedDomain,
        email: normalizedEmail,
        phone: resolvedPhone,
        kakao_id: resolvedKakao,
        pod_id: pod_id || 'planner',
        gift_name: gift_title || null,
        name: name || null,
        source: resolvedSource,
        metadata: {
          lead_type: lead_type || 'general',
          pod_id: pod_id || 'planner',
          gift_title: gift_title || null,
          memo: typeof memo === 'string' ? memo.slice(0, 2000) : null,
          raw_contact: contact || null,
          collected_at: timestamp
        },
        created_at: timestamp
      };

      // 1. 로컬 안전 원장에 백업 (어떤 상황에서도 리드 유실 방지)
      appendToLocalLedger(leadRecord);

      let savedToDb = false;

      // 2. 셋업팟 DB (partner_leads) 삽입 시도
      try {
        const { error: pError } = await supabase
          .from('partner_leads')
          .insert([leadRecord]);

        if (!pError) {
          savedToDb = true;
        } else {
          console.warn('[partner_leads insert notice]:', pError.message);
          
          // 3. 만약 partner_leads RLS 등으로 실패 시, public.leads 테이블로 보조 저장 시도
          const { error: leadsErr } = await supabase
            .from('leads')
            .insert([{
              target_slug: resolvedDomain,
              phone: resolvedPhone || resolvedKakao || normalizedEmail,
              metadata: leadRecord,
              created_at: timestamp
            }]);

          if (!leadsErr) savedToDb = true;
        }
      } catch (dbErr) {
        console.error('[TOOMCARD DB Error]:', dbErr.message);
      }

      return res.status(200).json({ 
        success: true, 
        saved: true,
        db_persisted: savedToDb,
        domain: resolvedDomain,
        lead_type: lead_type || 'general'
      });
    } catch (err) {
      console.error('[TOOMCARD Lead Fatal]:', err);
      return res.status(500).json({ success: false, error: 'Server processing error' });
    }
  }

  // GET: 대시보드 리드 목록 조회
  if (req.method === 'GET') {
    try {
      let leads = [];

      // Supabase 조회
      const { data, error } = await supabase
        .from('partner_leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(150);

      if (!error && Array.isArray(data)) {
        leads = data;
      }

      // 로컬 원장 데이터와 병합 (중복 이메일/시간 보정)
      const localLeads = readFromLocalLedger();
      const seen = new Set(leads.map(l => l.email + '_' + (l.created_at || '')));

      for (const loc of localLeads) {
        const key = loc.email + '_' + (loc.created_at || '');
        if (!seen.has(key)) {
          seen.add(key);
          leads.push(loc);
        }
      }

      // 최신순 정렬
      leads.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      return res.status(200).json({ success: true, count: leads.length, leads });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Internal query error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
