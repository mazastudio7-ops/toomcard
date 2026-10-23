const crypto = require('crypto');
const webpush = require('web-push');

// GET  /api/push  → 브라우저가 알림을 구독할 때 쓰는 공개 키
// POST /api/push  → DB(새 문의 트리거)가 호출: 헤더 x-push-secret 이 맞을 때만, 받은 구독 목록에 알림을 보낸다
module.exports = async (req, res) => {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, secret = process.env.PUSH_SECRET;
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).json({ key: pub || null });
  }
  if (req.method !== 'POST') return res.status(405).end();
  const given = String(req.headers['x-push-secret'] || '');
  const ok = secret && given.length === secret.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return res.status(401).json({ error: 'unauthorized' });
  if (!pub || !priv) return res.status(503).json({ error: 'vapid_not_set' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const subs = Array.isArray(body.subs) ? body.subs.slice(0, 20) : [];
  const count = Math.max(1, Number(body.count) || 1);
  webpush.setVapidDetails('mailto:hello@toomcard.com', pub, priv);
  const payload = JSON.stringify({
    title: count > 1 ? `새 문의 ${count}건` : '새 문의가 왔어요',
    body: '눌러서 받은 연락처를 확인하세요',
    url: '/dashboard',
    count
  });
  const results = await Promise.allSettled(subs.map((s) => webpush.sendNotification(s, payload, { TTL: 3600, urgency: 'high', topic: 'leads' })));
  res.status(200).json({ sent: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length });
};
