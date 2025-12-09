# 프로젝트 폴더 정리 계획

## 📊 **현재 상태 분석**

### 루트 디렉토리 파일 (40개+)

#### ❌ 삭제할 임시/중복 문서 (26개)

**SQL 관련 (중복):**
- [ ] `ENHANCE_EXISTING_SCHEMA.sql` → 중복
- [ ] `FINAL_FIXED_SCHEMA.sql` → 중복
- [ ] `FIXED_SCHEMA.sql` → 중복
- [ ] `SQL_ERROR_FIX.md` → 임시
- [ ] `SCHEMA_V2_REVIEW.md` → 임시
- [ ] `QUICK_FIX_SCHEMA.md` → 임시

**Stage 완료 문서 (보관용 → docs 폴더로 이동):**
- [ ] `STAGE2_COMPLETE.md`
- [ ] `STAGE2_1_COMPLETE.md`
- [ ] `STAGE2_2_COMPLETE.md`
- [ ] `STAGE2_3_COMPLETE.md`
- [ ] `STAGE3_1_COMPLETE.md`
- [ ] `STAGE3_2_COMPLETE.md`
- [ ] `STAGE3_3_COMPLETE.md`
- [ ] `STAGE3_4_COMPLETE.md`
- [ ] `STAGE4_1_COMPLETE.md`
- [ ] `STAGE4_2_COMPLETE.md`
- [ ] `STAGE4_3_COMPLETE.md`
- [ ] `STAGE4_3_TEST_GUIDE.md`

**기타 임시 문서:**
- [ ] `STUDENT_APP_COMPLETE.md`
- [ ] `EXAM_CREATION_COMPLETE.md`
- [ ] `TYPE_FIX_COMPLETE.md`
- [ ] `TYPE_MISMATCH_ANALYSIS.md`
- [ ] `DESIGN_SYSTEM.md` (컴포넌트 주석으로 충분)

**Stage 4-3 임시 파일 (참고용):**
- [ ] `PROMPT_EXAMPLE.md` → docs로 이동
- [ ] `STAGE4_1_USAGE_EXAMPLES.md` → docs로 이동
- [ ] `DATABASE_TYPES_UPDATE.md` → docs로 이동
- [ ] `TEACHER_EXAM_DETAIL_WITH_AI.tsx` → 예시 코드, docs로 이동
- [ ] `STUDENT_RESULT_WITH_AI.tsx` → 예시 코드, docs로 이동
- [ ] `STAGE3_3_GUIDE.md` → docs로 이동

**Supabase 관련:**
- [ ] `SUPABASE_AI_MIGRATION.sql` → supabase/migrations로 이미 있음
- [ ] `SUPABASE_MIGRATION_GUIDE.md` → docs로 이동
- [ ] `SUPABASE_DEPLOYMENT_GUIDE.md` → docs로 이동

**기타:**
- [ ] `index.html` → 불필요 (Next.js 사용)

---

#### ✅ 유지할 필수 파일

**설정 파일:**
- ✅ `.env.local.example`
- ✅ `.eslintrc.json`
- ✅ `.gitignore`
- ✅ `next.config.js`
- ✅ `postcss.config.js`
- ✅ `tailwind.config.js`
- ✅ `tsconfig.json`
- ✅ `next-env.d.ts`
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `vercel.json`

**문서:**
- ✅ `README.md` (프로젝트 소개)

---

## 📁 **새로운 폴더 구조**

```
academy-ai/
├── docs/                          ← 새로 생성
│   ├── stages/                    ← Stage 완료 문서
│   │   ├── STAGE2_COMPLETE.md
│   │   ├── STAGE3_COMPLETE.md
│   │   └── STAGE4_COMPLETE.md
│   ├── guides/                    ← 가이드 문서
│   │   ├── SUPABASE_DEPLOYMENT_GUIDE.md
│   │   ├── SUPABASE_MIGRATION_GUIDE.md
│   │   └── STAGE3_3_GUIDE.md
│   ├── examples/                  ← 예시 코드
│   │   ├── TEACHER_EXAM_DETAIL_WITH_AI.tsx
│   │   ├── STUDENT_RESULT_WITH_AI.tsx
│   │   └── PROMPT_EXAMPLE.md
│   └── archive/                   ← 임시/디버그 문서
│       ├── SQL_ERROR_FIX.md
│       ├── TYPE_FIX_COMPLETE.md
│       └── ...
│
├── src/                           ← 소스 코드 (유지)
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── types/
│
├── supabase/                      ← Supabase 설정 (유지)
│   └── migrations/
│       └── 20241208090000_add_ai_columns.sql
│
├── public/                        ← 정적 파일 (유지)
│
├── .env.local.example            ← 환경 변수 예시
├── README.md                     ← 프로젝트 소개
├── package.json
└── ... (설정 파일들)
```

---

## 🗑️ **삭제할 파일 목록**

### 즉시 삭제 (복구 불필요)

```bash
# SQL 중복 파일
rm ENHANCE_EXISTING_SCHEMA.sql
rm FINAL_FIXED_SCHEMA.sql
rm FIXED_SCHEMA.sql

# 임시 HTML
rm index.html

# 중복 Supabase SQL
rm SUPABASE_AI_MIGRATION.sql  # supabase/migrations에 이미 있음
```

---

## 📦 **이동할 파일 목록**

### docs/stages/ 폴더로 이동

```bash
mkdir -p docs/stages
mv STAGE2_COMPLETE.md docs/stages/
mv STAGE2_1_COMPLETE.md docs/stages/
mv STAGE2_2_COMPLETE.md docs/stages/
mv STAGE2_3_COMPLETE.md docs/stages/
mv STAGE3_1_COMPLETE.md docs/stages/
mv STAGE3_2_COMPLETE.md docs/stages/
mv STAGE3_3_COMPLETE.md docs/stages/
mv STAGE3_4_COMPLETE.md docs/stages/
mv STAGE4_1_COMPLETE.md docs/stages/
mv STAGE4_2_COMPLETE.md docs/stages/
mv STAGE4_3_COMPLETE.md docs/stages/
mv STAGE4_3_TEST_GUIDE.md docs/stages/
mv STUDENT_APP_COMPLETE.md docs/stages/
mv EXAM_CREATION_COMPLETE.md docs/stages/
```

### docs/guides/ 폴더로 이동

```bash
mkdir -p docs/guides
mv SUPABASE_DEPLOYMENT_GUIDE.md docs/guides/
mv SUPABASE_MIGRATION_GUIDE.md docs/guides/
mv STAGE3_3_GUIDE.md docs/guides/
```

### docs/examples/ 폴더로 이동

```bash
mkdir -p docs/examples
mv TEACHER_EXAM_DETAIL_WITH_AI.tsx docs/examples/
mv STUDENT_RESULT_WITH_AI.tsx docs/examples/
mv PROMPT_EXAMPLE.md docs/examples/
mv STAGE4_1_USAGE_EXAMPLES.md docs/examples/
```

### docs/archive/ 폴더로 이동 (참고용)

```bash
mkdir -p docs/archive
mv SQL_ERROR_FIX.md docs/archive/
mv SCHEMA_V2_REVIEW.md docs/archive/
mv QUICK_FIX_SCHEMA.md docs/archive/
mv TYPE_FIX_COMPLETE.md docs/archive/
mv TYPE_MISMATCH_ANALYSIS.md docs/archive/
mv DESIGN_SYSTEM.md docs/archive/
mv DATABASE_TYPES_UPDATE.md docs/archive/
```

---

## ✅ **정리 후 최종 구조**

### 루트 디렉토리 (깔끔!)

```
academy-ai/
├── docs/              ← 📚 모든 문서
├── src/               ← 💻 소스 코드
├── supabase/          ← 🗄️ DB 설정
├── public/            ← 🖼️ 정적 파일
├── .env.local.example
├── .gitignore
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## 🎯 **실행 명령어 (한 번에)**

```bash
cd "/mnt/c/Users/dueb0/OneDrive/바탕 화면/학원어플/academy-ai"

# 1. 폴더 생성
mkdir -p docs/stages docs/guides docs/examples docs/archive

# 2. Stage 문서 이동
mv STAGE2_COMPLETE.md STAGE2_1_COMPLETE.md STAGE2_2_COMPLETE.md STAGE2_3_COMPLETE.md docs/stages/
mv STAGE3_1_COMPLETE.md STAGE3_2_COMPLETE.md STAGE3_3_COMPLETE.md STAGE3_4_COMPLETE.md docs/stages/
mv STAGE4_1_COMPLETE.md STAGE4_2_COMPLETE.md STAGE4_3_COMPLETE.md STAGE4_3_TEST_GUIDE.md docs/stages/
mv STUDENT_APP_COMPLETE.md EXAM_CREATION_COMPLETE.md docs/stages/

# 3. 가이드 이동
mv SUPABASE_DEPLOYMENT_GUIDE.md SUPABASE_MIGRATION_GUIDE.md STAGE3_3_GUIDE.md docs/guides/

# 4. 예시 코드 이동
mv TEACHER_EXAM_DETAIL_WITH_AI.tsx STUDENT_RESULT_WITH_AI.tsx docs/examples/
mv PROMPT_EXAMPLE.md STAGE4_1_USAGE_EXAMPLES.md docs/examples/

# 5. 아카이브 이동
mv SQL_ERROR_FIX.md SCHEMA_V2_REVIEW.md QUICK_FIX_SCHEMA.md docs/archive/
mv TYPE_FIX_COMPLETE.md TYPE_MISMATCH_ANALYSIS.md DESIGN_SYSTEM.md DATABASE_TYPES_UPDATE.md docs/archive/

# 6. 불필요한 파일 삭제
rm ENHANCE_EXISTING_SCHEMA.sql FINAL_FIXED_SCHEMA.sql FIXED_SCHEMA.sql
rm SUPABASE_AI_MIGRATION.sql  # supabase/migrations에 이미 있음
rm index.html

echo "✅ 정리 완료!"
```

---

## 📝 **README.md 업데이트**

```markdown
# Academy AI - 모의고사·숙제 전용 AI 학원 앱

## 📚 문서 구조

- `docs/stages/` - 개발 단계별 완료 문서
- `docs/guides/` - 배포 및 사용 가이드
- `docs/examples/` - 예시 코드 및 프롬프트
- `docs/archive/` - 참고용 임시 문서

## 🚀 빠른 시작

1. 환경 설정
2. Supabase 마이그레이션
3. 개발 서버 실행

자세한 내용은 `docs/guides/` 참고
```

---

## 🎊 **정리 효과**

### Before (루트 파일 40개+)
```
❌ 너무 많은 문서
❌ 중복 SQL 파일
❌ 임시 파일 산재
❌ 찾기 어려움
```

### After (루트 파일 15개)
```
✅ 깔끔한 루트
✅ 체계적인 docs 폴더
✅ 찾기 쉬움
✅ 유지보수 편함
```
