# 🚀 Supabase 실제 적용 절차

## 📁 **Step 1: 파일 위치 확인**

### 현재 프로젝트 구조
```
academy-ai/
├── supabase/
│   ├── config.toml                           # Supabase 설정
│   ├── migrations/
│   │   ├── 20240101000000_initial_schema.sql # 기존 스키마
│   │   └── 20241208_v2_final_schema.sql      # 새 스키마 (사용 안 함)
│   └── seed.sql                              # 시드 데이터
├── ENHANCE_EXISTING_SCHEMA.sql               # 기존 스키마 보완용
└── ...
```

### ✅ **확인 사항**
- [x] `supabase/migrations/` 폴더 존재
- [x] `supabase/seed.sql` 파일 존재
- [ ] `.env.local` 파일에 Supabase 연결 정보 설정

---

## 🔧 **Step 2: Supabase CLI 설치 확인**

### 2-1. CLI 설치 여부 확인
```bash
supabase --version
```

**출력 예시:**
```
supabase version 1.x.x
```

### 2-2. CLI 설치 (없는 경우)

#### Windows (Scoop)
```bash
scoop install supabase
```

#### Windows (직접 다운로드)
```bash
# PowerShell에서 실행
iwr -useb https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.zip -OutFile supabase.zip
Expand-Archive supabase.zip -DestinationPath .
Move-Item .\supabase.exe C:\Windows\System32\
```

#### Mac
```bash
brew install supabase/tap/supabase
```

#### Linux
```bash
brew install supabase/tap/supabase
```

---

## 🔗 **Step 3: Supabase 프로젝트 연결**

### 3-1. Supabase 로그인
```bash
supabase login
```

브라우저가 열리면 Supabase 계정으로 로그인

### 3-2. 프로젝트 연결
```bash
# 프로젝트 루트에서 실행
cd C:\Users\dueb0\OneDrive\바탕 화면\학원어플\academy-ai

# Supabase 프로젝트 연결
supabase link --project-ref <YOUR_PROJECT_REF>
```

**PROJECT_REF 찾는 방법:**
1. Supabase Dashboard → 프로젝트 선택
2. Settings → General
3. **Reference ID** 복사

---

## 🗄️ **Step 4: 마이그레이션 적용**

### 방법 1: `db push` (추천) ⭐
**기존 데이터 유지하면서 새 마이그레이션만 적용**

```bash
# 새 마이그레이션 파일을 원격 DB에 적용
supabase db push
```

**장점:**
- ✅ 기존 데이터 보존
- ✅ 새 마이그레이션만 실행

**단점:**
- ❌ 이미 적용된 마이그레이션은 다시 실행 안 됨

---

### 방법 2: `db reset` (초기화)
**모든 데이터 삭제 후 처음부터 다시 적용**

```bash
# ⚠️ 경고: 모든 데이터 삭제됨!
supabase db reset
```

**장점:**
- ✅ 깨끗한 상태에서 시작
- ✅ seed.sql도 자동 실행

**단점:**
- ❌ 기존 데이터 모두 삭제

---

### 방법 3: Supabase Dashboard (수동)
**SQL Editor에서 직접 실행**

1. Supabase Dashboard → **SQL Editor**
2. **New Query**
3. 파일 내용 복사/붙여넣기:
   - `ENHANCE_EXISTING_SCHEMA.sql` (기존 스키마 보완)
4. **Run** 버튼 클릭

---

## 📊 **Step 5: 적용 결과 확인**

### 5-1. 테이블 확인
```bash
# CLI로 확인
supabase db dump --data-only

# 또는 Dashboard에서 확인
```

**Supabase Dashboard:**
1. **Table Editor** 메뉴
2. 테이블 목록 확인 (14개)

```
✅ academies
✅ users
✅ classes
✅ class_enrollments
✅ questions
✅ exams
✅ homeworks
✅ exam_questions
✅ homework_questions
✅ exam_assignments
✅ homework_assignments
✅ submissions
✅ submission_answers
✅ wrong_notes
```

### 5-2. 시드 데이터 확인
```sql
-- SQL Editor에서 실행
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM classes;
SELECT COUNT(*) FROM questions;
```

**예상 결과:**
```
users: 10+ 명
classes: 3+ 개
questions: 20+ 개
```

### 5-3. 트리거 확인
```sql
-- 트리거 목록 조회
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

**예상 트리거 (15+개):**
- `update_academies_updated_at`
- `update_users_updated_at`
- `check_classes_teacher_role`
- `upsert_wrong_note`
- ...

---

## 🔄 **Step 6: 로컬 개발 환경 동기화**

### 6-1. 타입 생성
```bash
# TypeScript 타입 자동 생성
npm run supabase:gen-types
```

또는

```bash
supabase gen types typescript --local > src/types/database.types.ts
```

### 6-2. 환경 변수 설정
`.env.local` 파일:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**키 찾는 방법:**
1. Supabase Dashboard
2. Settings → API
3. **Project URL** 복사
4. **anon public** 키 복사

---

## 🧪 **Step 7: 테스트**

### 7-1. API 연결 테스트
```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// 테스트 쿼리
const { data, error } = await supabase
  .from('academies')
  .select('*')
  .limit(1)

console.log('Supabase 연결:', data ? '✅ 성공' : '❌ 실패')
```

### 7-2. 간단한 CRUD 테스트
```typescript
// 학원 생성 테스트
const { data: academy } = await supabase
  .from('academies')
  .insert({
    name: '테스트 학원',
    address: '서울시 강남구',
    phone: '02-1234-5678'
  })
  .select()
  .single()

console.log('학원 생성:', academy)
```

---

## 📝 **전체 실행 순서 요약**

```bash
# 1. 프로젝트 폴더로 이동
cd C:\Users\dueb0\OneDrive\바탕 화면\학원어플\academy-ai

# 2. Supabase CLI 설치 확인
supabase --version

# 3. Supabase 로그인
supabase login

# 4. 프로젝트 연결
supabase link --project-ref <YOUR_PROJECT_REF>

# 5-A. 기존 데이터 유지 (추천)
supabase db push

# 5-B. 전체 초기화 (선택)
supabase db reset

# 6. 타입 생성
npm run supabase:gen-types

# 7. 개발 서버 시작
npm run dev
```

---

## 🚨 **문제 해결**

### 문제 1: "supabase: command not found"
**해결:**
```bash
# Windows (Scoop)
scoop install supabase

# 또는 PATH에 추가
```

### 문제 2: "migration already applied"
**해결:**
```bash
# 마이그레이션 히스토리 확인
supabase migration list

# 특정 마이그레이션 스킵
supabase db push --dry-run
```

### 문제 3: "ENUM already exists"
**해결:**
- Dashboard에서 수동으로 실행
- `ENHANCE_EXISTING_SCHEMA.sql` 사용 (IF NOT EXISTS 포함)

### 문제 4: RLS 정책 에러
**해결:**
```sql
-- 일시적으로 RLS 비활성화 (개발용)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

## ✅ **체크리스트**

### 마이그레이션 전
- [ ] Supabase CLI 설치됨
- [ ] 프로젝트 연결 완료
- [ ] `.env.local` 설정 완료
- [ ] 기존 데이터 백업 (필요시)

### 마이그레이션 후
- [ ] 14개 테이블 생성 확인
- [ ] 시드 데이터 확인
- [ ] 트리거 15+개 확인
- [ ] TypeScript 타입 생성
- [ ] API 연결 테스트 성공

### 프로덕션 배포 전
- [ ] RLS 정책 설정
- [ ] 인덱스 성능 확인
- [ ] 백업 자동화 설정

---

## 🎯 **다음 단계**

1. **시드 데이터 추가**
   - `supabase/seed.sql` 수정
   - 실제 학원/반/학생 데이터 추가

2. **API 라우트 작성**
   - `src/app/api/admin/exams/route.ts`
   - `src/app/api/student/submissions/route.ts`

3. **프론트엔드 연동**
   - Supabase Client 설정
   - 데이터 fetching hooks 작성

4. **인증 구현**
   - Supabase Auth 연동
   - RLS 정책 설정

---

**모든 준비 완료!** 🚀
