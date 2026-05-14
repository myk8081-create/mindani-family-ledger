# 민다니 패밀리 가계부

민다니와 찌미찌미가 함께 사용하는 개인용 클라우드 동기화 가계부 PWA입니다. React, TypeScript, Vite, Tailwind CSS, Supabase Auth, Supabase PostgreSQL, Supabase Realtime, Recharts로 구성되어 있고 iPhone/Android 홈 화면에 추가해 앱처럼 실행할 수 있습니다.

## 주요 기능

- 이메일/비밀번호 회원가입, 로그인, 로그아웃
- 기본 가족 그룹 `민다니 패밀리`
- 가족 구성원 `민다니`, `찌미찌미`
- 같은 가족 그룹의 거래, 카테고리, 결제수단, 반복 지출만 공유
- 거래 입력, 수정, 삭제, 월별/작성자별/카테고리별/수입·지출 필터, 검색
- 공동생활비/고정비 체크, 개인 작성자 합계 제외, 홈 별도 목록 확인
- Supabase Realtime 기반 실시간 반영
- 홈 대시보드와 Recharts 통계
- 반복 지출 등록 및 이번 달 거래 생성
- CSV 내보내기, JSON 백업, JSON 복원, 전체 데이터 초기화
- PWA manifest, service worker, 오프라인 조회 캐시

## 설치

```bash
npm install
```

## 로컬 실행

```bash
npm run dev
```

기본 주소는 `http://localhost:5173`입니다.

## Supabase 프로젝트 생성

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. Authentication > Providers > Email을 활성화합니다.
3. Project Settings > API에서 Project URL과 anon public key를 확인합니다.
4. Database > Replication에서 Realtime이 켜져 있는지 확인합니다.

## Supabase 테이블 생성 SQL 적용

Supabase SQL Editor에서 [supabase/schema.sql](/Users/minyoungki/Documents/Codex/2026-05-14/pwa-pc-react-typescript-vite-tailwind/supabase/schema.sql)의 전체 내용을 실행합니다.

이미 기존 SQL을 적용한 프로젝트에서 공동생활비 기능만 추가하려면 [supabase/add-shared-expense.sql](/Users/minyoungki/Documents/Codex/2026-05-14/pwa-pc-react-typescript-vite-tailwind/supabase/add-shared-expense.sql)을 한 번 실행해도 됩니다.

이 SQL에는 다음이 포함되어 있습니다.

- `profiles`
- `family_groups`
- `family_members`
- `transactions`
- `categories`
- `payment_methods`
- `recurring_transactions`
- 기본 카테고리/결제수단 생성 함수
- 가족 그룹 가입 RPC
- Row Level Security 정책
- Realtime publication 설정

## 환경변수

`.env.example`을 참고해 `.env`를 만듭니다.

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_DEFAULT_FAMILY_INVITE_CODE=MINDANI-FAMILY-2026
```

`VITE_DEFAULT_FAMILY_INVITE_CODE`는 민다니와 찌미찌미가 같은 가족 그룹에 들어가기 위한 코드입니다. 두 사람 모두 같은 값을 사용해야 합니다.

## Vercel 배포

1. GitHub에 프로젝트를 올립니다.
2. Vercel에서 새 프로젝트로 import합니다.
3. Framework Preset은 Vite로 둡니다.
4. Environment Variables에 `.env`와 같은 값을 등록합니다.
5. Build Command는 `npm run build`, Output Directory는 `dist`입니다.
6. 배포 후 Supabase Authentication > URL Configuration에 Vercel 도메인을 Site URL로 등록합니다.

## iPhone 홈 화면 추가

1. Safari에서 배포 주소를 엽니다.
2. 공유 버튼을 누릅니다.
3. `홈 화면에 추가`를 선택합니다.
4. 이름을 확인하고 추가합니다.

## Android 홈 화면 추가

1. Chrome에서 배포 주소를 엽니다.
2. 메뉴 버튼을 누릅니다.
3. `홈 화면에 추가` 또는 `앱 설치`를 선택합니다.
4. 이름을 확인하고 추가합니다.

## 기본 사용 방법

1. 민다니와 찌미찌미가 각각 이메일/비밀번호로 회원가입합니다.
2. 로그인 후 본인 이름을 선택해 `민다니 패밀리`에 연결합니다.
3. 하단 탭에서 홈, 입력, 내역, 통계, 설정을 사용합니다.
4. 둘이 함께 쓴 돈은 거래 입력에서 `공동생활비`를 체크합니다.
5. 반복 지출은 설정 > 반복 지출 관리에서 등록하고 `이번 달 생성`으로 거래에 반영합니다.
6. 백업은 설정에서 CSV 또는 JSON으로 내려받고, JSON 파일로 복원할 수 있습니다.

## 개발 명령어

```bash
npm run dev       # 개발 서버
npm run build     # 타입 체크 + 프로덕션 빌드
npm run preview   # 빌드 결과 미리보기
npm run typecheck # 타입 체크
```

## 보안 메모

- Supabase anon key는 `.env`로 관리하며 저장소에 커밋하지 않습니다.
- 모든 주요 테이블에 RLS가 적용되어 있습니다.
- 거래와 반복 지출은 `family_group_id` 기준으로 접근을 제한합니다.
- 삭제는 `deleted_at`을 사용하는 soft delete 방식입니다.
