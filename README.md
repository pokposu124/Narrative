# US Market Narrative Tracker

Bloomberg 터미널 스타일의 미국 주식 시장 내러티브/테마 트래커.

뉴스 모멘텀 · 거래량 이상치 · 가격 모멘텀을 결합해 현재 시장에서 가장 활발한 테마를 점수화하고 랭킹합니다.

---

## 기술 스택

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** — Bloomberg 터미널 느낌의 다크 디자인
- **yahoo-finance2** — 비공식 Yahoo Finance API (가격/거래량)
- **Finnhub** 무료 티어 — 뉴스 헤드라인
- **Vercel Cron** — 6시간마다 자동 데이터 갱신
- **JSON 파일** — `/data/snapshots/` 에 스냅샷 누적 (별도 DB 없음)

---

## 빠른 시작 (로컬)

### 1. 환경변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`을 열어 아래 값을 입력:

| 변수 | 설명 |
|---|---|
| `FINNHUB_API_KEY` | [Finnhub](https://finnhub.io/register) 무료 가입 후 발급 |
| `CRON_SECRET` | 임의 문자열 (크론 엔드포인트 보호용) |

### 2. 의존성 설치 및 실행

```bash
npm install
npm run dev
```

### 3. 첫 번째 배치 실행 (데이터 시딩)

앱을 처음 실행하면 `/data/latest.json`이 비어 있어 빈 화면이 표시됩니다.  
아래 명령으로 배치를 수동 트리거하세요 (약 3~5분 소요):

```bash
curl -X POST http://localhost:3000/api/trigger \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)"
```

완료 후 `http://localhost:3000`을 새로고침하면 랭킹 테이블이 채워집니다.

---

## 프로젝트 구조

```
├── app/
│   ├── layout.tsx            # 공통 레이아웃 (IndexBar + Footer)
│   ├── page.tsx              # 메인 랭킹 테이블
│   ├── theme/[id]/page.tsx   # 테마 상세 (종목 테이블 + 차트 + 뉴스)
│   └── api/
│       ├── cron/route.ts     # Vercel Cron 엔드포인트 (6h마다)
│       ├── indices/route.ts  # 지수 실시간 조회 (클라이언트 60s 폴링)
│       └── trigger/route.ts  # 수동 배치 트리거
├── components/
│   ├── IndexBar.tsx          # 상단 지수 바 (NASDAQ/S&P/RUT/VIX)
│   ├── ThemeTable.tsx        # 랭킹 테이블
│   └── ScoreChart.tsx        # 점수 추이 라인 차트 (SVG)
├── lib/
│   ├── yahoo.ts              # yahoo-finance2 래퍼
│   ├── finnhub.ts            # Finnhub API 클라이언트
│   ├── scoring.ts            # 점수 계산 엔진
│   ├── data.ts               # JSON 파일 읽기/쓰기
│   └── batch.ts              # 배치 오케스트레이터
├── types/index.ts            # 공유 TypeScript 타입
├── data/
│   ├── themes.json           # 테마 정의 (사람이 편집)
│   ├── latest.json           # 최신 스냅샷
│   └── snapshots/            # 누적 스냅샷 (타임스탬프별)
└── vercel.json               # Cron 스케줄 설정
```

---

## 점수화 로직

```
종합점수 = 0.40 × 뉴스모멘텀 + 0.35 × 거래량이상치 + 0.25 × 가격모멘텀
```

각 항목은 테마 간 백분위(percentile) 정규화 후 0~100 스케일로 변환됩니다.

| 항목 | 계산 방식 |
|---|---|
| 뉴스 모멘텀 | 최근 48h 기사 수의 직전 48h 대비 가속도 |
| 거래량 이상치 | 당일 거래량 / 20일 평균 거래량 (Relative Volume) 평균 |
| 가격 모멘텀 | 구성 종목 동일가중 5일 수익률 |

---

## Vercel 배포

1. 리포지토리를 Vercel에 연결
2. **Environment Variables** 설정:
   - `FINNHUB_API_KEY`
   - `CRON_SECRET`
3. `vercel.json`의 cron 스케줄이 자동으로 적용됩니다 (`0 */6 * * *`)

> **Note:** Vercel Hobby 플랜은 Cron 함수를 하루 1회만 허용합니다.  
> 6시간 주기는 **Pro 플랜 이상**에서 동작합니다.

---

## 면책 문구

- yahoo-finance2는 **비공식** API입니다. Yahoo가 차단하거나 스키마를 변경할 수 있습니다.
- 모든 시세는 약 15분 지연 기준입니다.
- 이 사이트는 **투자 조언이 아닙니다.** 제공 정보를 기반으로 한 투자 결정의 결과에 대한 책임을 지지 않습니다.
