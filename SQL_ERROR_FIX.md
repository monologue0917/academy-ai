# 🔧 Supabase SQL 에러 해결 방법

## ❌ 에러 메시지
```
ERROR: 42601: syntax error at or near "\"
LINE 14: CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
```

## 🎯 원인
- 14번 라인의 백슬래시 이스케이프 문자(`\"`) 문제
- Supabase는 이미 `uuid-ossp` 확장이 활성화되어 있어서 생성할 필요 없음

## ✅ 해결 방법 (3가지)

### 방법 1: 해당 라인 삭제 (가장 간단) ⭐ 추천

Supabase SQL Editor에서:

1. `20241208_v2_final_schema.sql` 파일 열기
2. **14번 라인 삭제**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
3. 또는 **주석 처리**:
   ```sql
   -- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   ```
4. 전체 SQL 실행

### 방법 2: 수정된 파일 사용

아래 내용을 복사해서 SQL Editor에 붙여넣기:

```sql
-- ============================================================================
-- Academy AI - Database Schema Migration (최종 보완 버전)
-- 수능/내신 영어 학원용 모의고사·숙제 전용 앱
-- ============================================================================
-- Supabase (PostgreSQL) 마이그레이션
-- 생성일: 2024-12-08
-- 버전: v2.0 (요구사항 반영 완료)
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS & CUSTOM TYPES (ENUM)
-- ============================================================================

-- UUID extension (Supabase has this enabled by default)

-- 사용자 역할
CREATE TYPE user_role AS ENUM ('teacher', 'student');

-- 문제 유형
CREATE TYPE question_type AS ENUM ('mcq', 'short_answer', 'essay');

-- 난이도
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');

-- 시험/숙제 상태
CREATE TYPE content_status AS ENUM ('draft', 'published', 'closed');

-- 할당 상태 (학생 진행 상태)
CREATE TYPE assignment_status AS ENUM ('pending', 'in_progress', 'submitted', 'graded');

-- 제출 타입
CREATE TYPE submission_type AS ENUM ('exam', 'homework');


-- ============================================================================
-- 1. CORE TABLES (기본 엔티티)
-- ============================================================================
```

... (나머지 전체 SQL 계속)

### 방법 3: 온라인 텍스트 에디터 사용

1. https://www.textfixer.com/ 같은 온라인 에디터 열기
2. SQL 파일 전체 복사
3. 14번 라인 삭제 또는 주석 처리
4. 수정된 내용 복사
5. Supabase SQL Editor에 붙여넣기

---

## 📝 14번 라인 수정 전/후

### ❌ 수정 전 (에러 발생)
```sql
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
```
또는
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### ✅ 수정 후 (정상 작동)
```sql
-- UUID extension (Supabase has this enabled by default)
```

---

## 🚀 빠른 실행 (Supabase Dashboard)

1. Supabase Project → **SQL Editor**
2. **New Query** 클릭
3. 아래 명령어로 UUID 확장 확인:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'uuid-ossp';
   ```
4. 결과가 나오면 이미 설치됨 ✅
5. `20241208_v2_final_schema.sql` 파일에서 **14번 라인만 삭제**
6. 전체 SQL 실행 (**Run** 버튼)

---

## ✅ 실행 후 확인

```sql
-- 테이블 개수 (13개)
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- ENUM 개수 (6개)
SELECT COUNT(*) FROM pg_type WHERE typtype = 'e';

-- 트리거 확인
SELECT COUNT(*) FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

**예상 결과:**
- 테이블: 13개 ✅
- ENUM: 6개 ✅
- 트리거: 8개 ✅

---

## 💡 왜 이런 에러가 발생했나요?

1. **백슬래시 이스케이프**: 파일 생성 시 `\"` 형태로 저장됨
2. **Supabase 기본 확장**: `uuid-ossp`는 이미 활성화되어 있음
3. **불필요한 라인**: 해당 라인 자체가 필요 없음

---

## 🎯 결론

**14번 라인을 삭제하거나 주석 처리하면 해결됩니다!**

```sql
-- 이 라인을 삭제 또는 주석 처리
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

나머지 SQL은 문제없이 실행됩니다. ✅
