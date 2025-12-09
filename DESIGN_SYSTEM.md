# 🎨 Academy AI Design System

## 개요

Academy AI 앱의 일관된 사용자 경험을 위한 디자인 시스템입니다.
모든 컴포넌트는 Tailwind CSS를 기반으로 제작되었습니다.

---

## 📐 디자인 원칙

### 1. **컬러 팔레트**

| 용도 | Tailwind 클래스 | HEX |
|------|-----------------|-----|
| 페이지 배경 | `bg-slate-50` | #F9FAFB |
| 카드 배경 | `bg-white` | #FFFFFF |
| 메인 컬러 | `indigo-600` | #4F46E5 |
| 성공/정답 | `emerald-500` | #10B981 |
| 경고/마감 | `amber-500` | #F59E0B |
| 오답/위험 | `rose-500` | #F43F5E |
| 메인 텍스트 | `slate-900` | #0F172A |
| 서브 텍스트 | `slate-600` | #475569 |
| 캡션 | `slate-500` | #64748B |
| 보더 | `slate-100` | #F1F5F9 |

### 2. **타이포그래피**

| 요소 | Tailwind 클래스 |
|------|-----------------|
| 페이지 타이틀 | `text-xl font-semibold tracking-tight` |
| 섹션 타이틀 | `text-sm font-semibold` |
| 본문 | `text-sm text-slate-700` |
| 캡션/보조 | `text-xs text-slate-500` |

### 3. **레이아웃**

| 요소 | 스타일 |
|------|--------|
| 카드 | `rounded-2xl shadow-sm border border-slate-100 px-4 py-3` |
| 버튼 | `rounded-xl px-4 py-2` |
| 배지 | `rounded-full px-2 py-0.5` |

---

## 🧩 컴포넌트 목록

### 기본 레이아웃

#### 1. **AppCard**
카드 컨테이너

```typescript
<AppCard>
  <CardHeader title="제목" subtitle="부제목" />
  <CardContent>내용</CardContent>
  <CardFooter>액션 버튼</CardFooter>
</AppCard>

// 클릭 가능한 카드
<AppCard onClick={() => {}} hover>
  클릭 가능
</AppCard>
```

**Props:**
- `children`: ReactNode
- `className?`: string
- `onClick?`: () => void
- `hover?`: boolean

---

#### 2. **PageHeader**
페이지 최상단 헤더

```typescript
<PageHeader 
  title="모의고사 관리"
  description="학생들에게 배포할 모의고사를 관리합니다"
  breadcrumbs={[
    { label: '홈', href: '/admin' },
    { label: '모의고사' }
  ]}
  actions={<Button>새 모의고사</Button>}
/>
```

**Props:**
- `title`: string
- `description?`: string
- `breadcrumbs?`: BreadcrumbItem[]
- `actions?`: ReactNode

---

#### 3. **SectionTitle**
섹션 헤더

```typescript
<SectionTitle 
  title="오늘의 할 일" 
  subtitle="마감이 임박한 과제가 있어요"
  action={<Button variant="ghost" size="sm">전체보기</Button>}
/>
```

**Props:**
- `title`: string
- `subtitle?`: string
- `action?`: ReactNode

---

### 상태 표시

#### 4. **StatusBadge**
시험/숙제 상태 배지

```typescript
<StatusBadge status="ongoing" />
<StatusBadge status="completed" />
<StatusBadge status="overdue" />
```

**Status Types:**
- `scheduled` - 예정
- `ongoing` - 진행중
- `completed` - 완료
- `graded` - 채점완료
- `overdue` - 마감
- `due-soon` - 마감임박
- `draft` - 초안
- `published` - 게시됨
- `closed` - 종료

---

#### 5. **Badge**
범용 배지

```typescript
<Badge variant="success">+5점</Badge>
<Badge variant="warning">주의</Badge>
<Badge variant="danger">오답</Badge>
```

**Variants:**
- `default` - 회색
- `success` - 에메랄드
- `warning` - 앰버
- `danger` - 로즈
- `info` - 인디고

---

#### 6. **Button**
버튼

```typescript
<Button variant="primary">저장</Button>
<Button variant="secondary">취소</Button>
<Button variant="ghost" size="sm">더보기</Button>
<Button leftIcon={<PlusIcon />}>추가</Button>
```

**Variants:**
- `primary` - 인디고 (메인 액션)
- `secondary` - 흰색 보더 (보조 액션)
- `ghost` - 투명 (텍스트 버튼)
- `danger` - 빨강 (삭제 등)

**Sizes:**
- `sm` - 작음
- `md` - 중간 (기본)
- `lg` - 큼

---

### 빈 상태 & 로딩

#### 7. **EmptyState**
데이터 없음

```typescript
<EmptyState 
  icon={<ClipboardIcon size={48} className="text-slate-300" />}
  title="아직 모의고사가 없습니다"
  description="첫 모의고사를 만들어보세요"
  action={<Button>모의고사 만들기</Button>}
/>
```

---

#### 8. **LoadingSpinner**
로딩 표시

```typescript
<LoadingSpinner size="md" text="로딩중..." />
<LoadingOverlay text="저장중..." />
```

---

### 통계 (선생님용)

#### 9. **StatCard**
통계 카드

```typescript
<StatCard 
  label="완료한 학생"
  value="24/30"
  icon={<CheckCircleIcon />}
  trend="up"
  trendValue="+5명"
/>
```

---

## 💡 조합 예시

### 예시 1: 모의고사 카드 (학생용)

```tsx
import { 
  AppCard, 
  CardHeader, 
  CardContent, 
  CardFooter,
  StatusBadge, 
  Button 
} from '@/components/ui';

<AppCard hover onClick={() => router.push('/app/exam/123')}>
  <CardHeader 
    title="수능특강 1회 모의고사"
    subtitle="2024-12-10 23:59 마감"
    badge={<StatusBadge status="ongoing" />}
  />
  
  <CardContent>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">문제 수</span>
        <span className="font-medium text-slate-900">45문제</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600">제한 시간</span>
        <span className="font-medium text-slate-900">70분</span>
      </div>
    </div>
  </CardContent>
  
  <CardFooter>
    <Button variant="primary" fullWidth>
      시험 시작
    </Button>
  </CardFooter>
</AppCard>
```

---

### 예시 2: 오답 문제 카드 (학생용)

```tsx
<AppCard>
  <CardHeader 
    title="21. 빈칸 추론"
    badge={<Badge variant="danger">오답 3회</Badge>}
  />
  
  <CardContent>
    <p className="text-sm text-slate-700 line-clamp-2">
      The study shows that people who regularly...
    </p>
  </CardContent>
  
  <CardFooter>
    <Button variant="secondary" size="sm" fullWidth>
      다시 풀기
    </Button>
  </CardFooter>
</AppCard>
```

---

### 예시 3: 통계 대시보드 (선생님용)

```tsx
import { StatCard, PageHeader } from '@/components/ui';

<div className="space-y-6">
  <PageHeader 
    title="대시보드"
    description="고3-A반의 학습 현황을 확인하세요"
  />
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <StatCard 
      label="총 학생"
      value="30"
      icon={<UsersIcon />}
    />
    
    <StatCard 
      label="평균 점수"
      value="78.5점"
      trend="up"
      trendValue="+3.2점"
      icon={<TrendingUpIcon />}
    />
    
    <StatCard 
      label="완료율"
      value="80%"
      trend="up"
      trendValue="+5%"
      icon={<CheckCircleIcon />}
    />
  </div>
</div>
```

---

### 예시 4: 빈 상태 (공통)

```tsx
import { EmptyState, Button } from '@/components/ui';
import { ClipboardIcon } from '@/components/ui';

<EmptyState 
  icon={<ClipboardIcon size={48} className="text-slate-300" />}
  title="아직 시험이 없습니다"
  description="첫 모의고사를 만들어 학생들에게 배포해보세요"
  action={
    <Button leftIcon={<PlusIcon />}>
      모의고사 만들기
    </Button>
  }
/>
```

---

## 📁 파일 구조

```
src/
└── components/
    └── ui/
        ├── index.ts              # 전체 export
        ├── Card.tsx              # 카드 (AppCard, CardHeader, CardContent, CardFooter)
        ├── Badge.tsx             # 배지 (Badge, StatusBadge)
        ├── Button.tsx            # 버튼
        ├── SectionTitle.tsx      # 섹션 제목
        ├── PageHeader.tsx        # 페이지 헤더
        ├── EmptyState.tsx        # 빈 상태
        ├── LoadingSpinner.tsx    # 로딩
        ├── StatCard.tsx          # 통계 카드
        └── Icons.tsx             # 아이콘
```

---

## 🎯 사용 방법

### Import

```typescript
// 개별 import
import { AppCard, StatusBadge, Button } from '@/components/ui';

// 전체 import
import * as UI from '@/components/ui';
```

### 커스텀 스타일

모든 컴포넌트는 `className` prop으로 확장 가능:

```typescript
<AppCard className="mb-4 hover:shadow-xl">
  ...
</AppCard>

<StatusBadge status="ongoing" className="ml-2" />
```

---

## ✅ 체크리스트

### 컴포넌트 작성 시

- [ ] TypeScript 타입 명확히 정의
- [ ] `className` prop 지원
- [ ] JSDoc 주석 작성
- [ ] 예시 코드 포함
- [ ] 디자인 가이드 준수

### 사용 시

- [ ] 적절한 variant/size 선택
- [ ] 일관된 간격 (gap-4, space-y-3 등)
- [ ] 반응형 고려 (grid-cols-1 md:grid-cols-3)
- [ ] 접근성 고려 (role, tabIndex 등)

---

**디자인 시스템 v1.0 완성!** 🎉
