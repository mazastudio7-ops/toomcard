#!/usr/bin/env node
// Vercel 빌드 단계에서 sw.js의 __BUILD_ID__를 커밋 SHA(없으면 타임스탬프)로 치환한다.
// vercel.json의 buildCommand에서 호출된다. 로컬에서 직접 실행해도 된다.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'sw.js');
const id = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || Date.now().toString(36)).slice(0, 12);
const src = fs.readFileSync(file, 'utf8');

const marker = "const BUILD_ID = '__BUILD_ID__';";
if (!src.includes(marker)) {
  console.log('[stamp-sw] sw.js already stamped, skipping');
  process.exit(0);
}

fs.writeFileSync(file, src.replace(marker, "const BUILD_ID = '" + id + "';"));
console.log('[stamp-sw] sw.js cache id =', id);
