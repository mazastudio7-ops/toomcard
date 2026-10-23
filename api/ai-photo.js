// AI 프로필 사진: 올린 사진의 얼굴은 그대로 두고 옷·배경·조명만 바꾼다 (Google Gemini 이미지 편집).
// POST /api/ai-photo  { image: "data:image/jpeg;base64,…", style: "studio" }  →  { image: "data:image/png;base64,…" }
// 필요한 환경변수: GEMINI_API_KEY (Google AI Studio에서 발급). 키가 없으면 503.

const MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const MAX_INPUT = 6 * 1024 * 1024;   // base64 기준 약 6MB

// 얼굴·표정·머리는 바꾸지 않는다는 원칙은 모든 스타일에 공통으로 들어간다
const KEEP = 'Keep this exact person: the same face, facial features, skin, hair style and expression. Do not change identity, age, or body shape. ' +
  'Make a realistic professional profile photo, head-and-shoulders, portrait framing, sharp focus, natural skin texture, no text, no watermark.';

const STYLES = {
  studio:  'Change only the clothing to a dark navy business suit with a white shirt, and the background to a neutral dark grey studio backdrop with soft key light.',
  white:   'Change only the clothing to smart business attire and the background to a clean plain white studio background with even soft light.',
  navy:    'Change only the clothing to a tailored business jacket and the background to a deep navy blue gradient with a subtle rim light.',
  bright:  'Change only the clothing to smart-casual (light blazer) and the background to a bright, airy modern office with window light and soft bokeh.',
  outdoor: 'Change only the clothing to a neat casual outfit and the background to an outdoor scene in warm daylight with gentle bokeh.',
  bw:      'Keep the clothing simple and dark; render as a timeless black-and-white editorial portrait with soft directional light and a plain background.'
};

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'no_key' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const style = STYLES[body && body.style] ? body.style : 'studio';
  const image = String((body && body.image) || '');
  const m = image.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return res.status(400).json({ error: 'bad_image' });
  if (m[2].length > MAX_INPUT) return res.status(413).json({ error: 'too_large' });

  const prompt = KEEP + ' ' + STYLES[style];
  const call = async (withAspect) => {
    const generationConfig = { responseModalities: ['IMAGE'] };
    if (withAspect) generationConfig.imageConfig = { aspectRatio: '3:4' };
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: m[1], data: m[2] } }, { text: prompt }] }],
        generationConfig
      })
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, j };
  };

  let out = await call(true);
  if (!out.ok && out.status === 400) out = await call(false);   // 세로 비율 옵션을 모르는 모델이면 빼고 다시
  if (!out.ok) {
    const msg = (out.j && out.j.error && out.j.error.message) || ('http_' + out.status);
    return res.status(out.status === 429 ? 429 : 502).json({ error: 'gemini', message: String(msg).slice(0, 200) });
  }
  const parts = (((out.j.candidates || [])[0] || {}).content || {}).parts || [];
  const img = parts.find((p) => p.inlineData && p.inlineData.data);
  if (!img) {
    const reason = ((out.j.candidates || [])[0] || {}).finishReason || (out.j.promptFeedback && out.j.promptFeedback.blockReason) || 'no_image';
    return res.status(422).json({ error: 'no_image', message: String(reason) });
  }
  res.status(200).json({ image: `data:${img.inlineData.mimeType || 'image/png'};base64,${img.inlineData.data}`, style });
};

module.exports.config = { maxDuration: 60 };
