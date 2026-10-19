# 🪪 TOOMCARD (toomcard.com)
> **Next-Gen 3D Interactive Digital Business Card Platform**  
> *"오늘의 짧은 만남을 내일의 거대한 비즈니스로 잇는 스마트 카드"*  
> 📖 [브랜드 스토리 & 매니페스토 (BRAND_STORY.md)](./BRAND_STORY.md)  

---

## 1. 프로젝트 개요 (Executive Summary)
* **공식 도메인:** `toomcard.com`
* **브랜드 가치 평가:** Brandpa 공인 감정가 **$14,500 (약 2,000만 원)**
* **핵심 가치 제안:**
  * 종이 명함을 대체하는 살아 움직이는 **3D 메탈/옵시디언 인터랙티브 명함**
  * 스마트폰 주소록에 내 프로필이 1초 만에 저장되는 **원클릭 vCard 엔진**
  * 카카오톡 전용 미리보기 카드 + 미팅 현장 즉시 스캔 **고해상도 QR** + **실물 스마트 NFC 카드** 연동
  * 명함 방문자가 실시간으로 연락처를 남길 수 있는 **인앱 리드 수집(Lead Magnet)**
  * 기업 임직원 명함을 중앙 통제하는 **TOOMUS B2B 콘솔**

---

## 2. 시스템 아키텍처 (Zero-Cost Shared Infrastructure)
TOOMUS 생태계의 고성능 Supabase & Vercel Edge 인프라를 활용하여 **추가 서버/DB 비용 $0**으로 무인 가동됩니다.

```
                    toomcard.com
                         │
     ┌───────────────────┴───────────────────┐
     ▼                                       ▼
/ (index.html)                          /:slug (api/render.js)
• 3D 메탈 명함 라이브 쇼룸              • 로컬 /cards/*.json 초고속 0ms 렌더
• 30초 명함 생성기 전환                 • Supabase 'pods' 동적 폴백
• B2B 도입 & 매각 오퍼 창구             • 실시간 1200x630 동적 OG 이미지 생성
```

* **Database:** Supabase (`pods`, `partner_leads`, `profiles`) — 셋업팟과 공유
* **Hosting:** Vercel (Edge Functions + Serverless SSR)
* **Storage & CDN:** Vercel CDN + Edge Cache (`s-maxage=60`)

---

## 3. 핵심 디렉토리 및 파일 구성
```
/Volumes/M/GitHub/toomcard/
 ├── index.html            # 공식 브랜드 랜딩페이지 (라이브 3D 카드 시뮬레이터 탑재)
 ├── card.html             # 풀스크린 3D 인터랙티브 명함 뷰어
 ├── maker.html            # 3D 명함 제작기 스튜디오 (WYSIWYG 실시간 에디터)
 ├── dashboard.html        # 내 명함 관리 & 방문자 통계 대시보드
 ├── vercel.json           # Vercel 클린 URL 및 슬러그 라우팅
 ├── package.json          # Vercel OG & Supabase 종속성
 ├── api/
 │    ├── render.js        # /:slug 동적 SSR 렌더러 & 메타태그 인젝터
 │    ├── og.jsx           # Edge 런타임 1200x630 동적 오픈그래프 생성기
 │    └── leads.js         # 인앱 리드 및 B2B 문의 수집 엔드포인트
 ├── cards/                # 로컬 명함 데이터셋 (naeun.json, toomus.json 등)
 ├── themes/               # 9종 프리미엄 테마 CSS (metal, obsidian, violet 등)
 ├── js/                   # card-renderer, supabase, auth-modal 등
 └── assets/               # TOOMUS 로고, 파비콘, 목업 이미지
```

---

## 4. Vercel 배포 및 도메인 연결 가이드
1. **GitHub 저장소 생성 및 푸시:**
   ```bash
   cd /Volumes/M/GitHub/toomcard
   git init
   git add .
   git commit -m "feat: initial commit for toomcard.com"
   # GitHub에 새 레포(toomcard) 생성 후 remote 추가 및 push
   ```
2. **Vercel 프로젝트 신규 생성:**
   * Vercel 대시보드 ➔ **Add New... ➔ Project**
   * `toomcard` 저장소 선택 ➔ Framework Preset: `Other` (Default)
   * Environment Variables 설정:
     * `SUPABASE_URL`: `https://xhjauoabxybaksvbtcic.supabase.co`
     * `SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. **도메인 연결 (Porkbun):**
   * Vercel Settings ➔ **Domains** ➔ `toomcard.com` 및 `www.toomcard.com` 추가
   * Porkbun DNS 관리창에 Vercel이 안내하는 A 레코드 / CNAME 레코드 추가:
     * A 레코드: `@` ➔ `76.76.21.21`
     * CNAME 레코드: `www` ➔ `cname.vercel-dns.com`

---

## 5. 데이터 분석 및 추적 규격 (Analytics & Tracking)
* **Google Analytics 4 (GA4) 측정 ID (Measurement ID):** `G-1KRR01VT4L`
* **GA4 Property ID (SETUPOD Fleet Hub 연동):** `559488195` (TOOMCARD 3D Hub)
* **전체 7개 페이지 100% 탑재 및 실시간 수집:**
  1. `index.html`: 공식 브랜드 랜딩 및 라이브 3D 카드 쇼룸
  2. `templates.html`: 3D 스마트 명함 템플릿 갤러리
  3. `maker.html`: 3D 명함 제작 에디터
  4. `card.html`: 3D 인터랙티브 개별 명함 뷰어 (`/:slug`)
  5. `dashboard.html`: 개인/기업 명함 관리 및 방문자 통계 콘솔
  6. `privacy.html`: 개인정보처리방침
  7. `terms.html`: 서비스 이용약관
* **주요 추적 이벤트 (Key Conversion Events):**
  * `page_view`: 전 페이지 트래픽 및 유입 채널 분석
  * `view_card`: 3D 디지털 명함 열람
  * `card_flip`: 3D 카드 앞/뒷면 180도 회전 감상
  * `view_qr`: 스마트 모핑 QR 코드 팝업 스캔
  * `save_contact`: 1초 vCard 스마트폰 연락처 저장
  * `share`: 카카오톡 공유 및 URL 복사
  * `lead_submit`: 인앱 B2B 및 명함 방문자 리드 연락처 제출

