'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PageHeader,
  AppCard,
  CardHeader,
  CardContent,
  Badge,
  Button,
  PlusIcon,
  UsersIcon,
  TrashIcon,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 반 관리 페이지
 */

interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  grade: string | null;
  teacher: { id: string; name: string } | null;
  studentCount: number;
}

const GRADE_OPTIONS = [
  { value: '고3', label: '고3' },
  { value: '고2', label: '고2' },
  { value: '고1', label: '고1' },
  { value: '중3', label: '중3' },
  { value: '중2', label: '중2' },
  { value: '중1', label: '중1' },
];

export default function ClassesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<ClassItem | null>(null);

  useEffect(() => {
    if (user?.academyId) {
      fetchClasses();
    }
  }, [user?.academyId]);

  const fetchClasses = async () => {
    if (!user?.academyId) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/classes?academyId=${user.academyId}`);
      const data = await response.json();

      if (data.success) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Classes fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, classItem: ClassItem) => {
    e.stopPropagation(); // 카드 클릭 이벤트 방지
    setClassToDelete(classItem);
  };

  const handleDeleteConfirm = async () => {
    if (!classToDelete) return;

    setDeletingClassId(classToDelete.id);
    try {
      const response = await fetch(`/api/admin/classes/${classToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        await fetchClasses();
        setClassToDelete(null);
      } else {
        alert(data.error || '반 삭제에 실패했습니다');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    } finally {
      setDeletingClassId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader 
          title="반 관리"
          description="수업 반을 관리하고 학생을 배정하세요"
          actions={
            <Button leftIcon={<PlusIcon size={16} />} onClick={() => setShowCreateModal(true)}>
              새 반 만들기
            </Button>
          }
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader 
        title="반 관리"
        description="수업 반을 관리하고 학생을 배정하세요"
        actions={
          <Button leftIcon={<PlusIcon size={16} />} onClick={() => setShowCreateModal(true)}>
            새 반 만들기
          </Button>
        }
      />

      {/* Empty State */}
      {classes.length === 0 ? (
        <AppCard>
          <div className="text-center py-12">
            <UsersIcon size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              아직 등록된 반이 없습니다
            </h3>
            <p className="text-slate-500 mb-6">
              첫 번째 반을 만들어 학생들을 배정해보세요
            </p>
            <Button 
              leftIcon={<PlusIcon size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              첫 반 만들기
            </Button>
          </div>
        </AppCard>
      ) : (
        /* Classes Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((classItem) => (
            <AppCard 
              key={classItem.id} 
              hover 
              onClick={() => router.push(`/admin/classes/${classItem.id}`)}
              className="relative"
            >
              {/* 삭제 버튼 */}
              <button
                onClick={(e) => handleDeleteClick(e, classItem)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors z-10"
                title="반 삭제"
              >
                <TrashIcon size={16} />
              </button>

              <CardHeader 
                title={classItem.name}
                subtitle={classItem.teacher ? `담당: ${classItem.teacher.name}` : '담당 미지정'}
                badge={
                  classItem.grade ? (
                    <Badge variant="default">{classItem.grade}</Badge>
                  ) : null
                }
              />

              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">학생 수</span>
                    <div className="flex items-center gap-1">
                      <UsersIcon size={14} className="text-slate-400" />
                      <span className="font-medium text-slate-900">
                        {classItem.studentCount}명
                      </span>
                    </div>
                  </div>

                  {classItem.description && (
                    <p className="text-sm text-slate-500 truncate">{classItem.description}</p>
                  )}
                </div>
              </CardContent>
            </AppCard>
          ))}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <CreateClassModal
          academyId={user?.academyId || ''}
          teacherId={user?.id || ''}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchClasses();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">반 삭제</h3>
            <p className="text-slate-600 mb-4">
              "{classToDelete.name}" 반을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-rose-600">
                이 반에 소속된 학생들은 반 배정이 해제됩니다.
              </span>
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setClassToDelete(null)}
                disabled={deletingClassId !== null}
              >
                취소
              </Button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingClassId !== null}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {deletingClassId ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 반 생성 모달 컴포넌트
function CreateClassModal({ 
  academyId, 
  teacherId,
  onClose, 
  onCreated 
}: { 
  academyId: string;
  teacherId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [grade, setGrade] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!grade) {
      setError('학년을 선택해주세요');
      return;
    }
    if (!name.trim()) {
      setError('반 이름을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/admin/classes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academyId,
          teacherId,
          grade,
          name: name.trim(),
          description: description.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        onCreated();
      } else {
        setError(data.error || '반 생성에 실패했습니다');
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-slate-900 mb-4">새 반 만들기</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 학년 선택 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              학년 *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {GRADE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGrade(option.value)}
                  className={`py-2.5 px-4 rounded-xl border-2 font-medium transition-colors ${
                    grade === option.value
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* 반 이름 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              반 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: A반, 수능반, 월수금반"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {grade && name && (
              <p className="mt-1 text-sm text-indigo-600">
                → "{grade} {name}"으로 생성됩니다
              </p>
            )}
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 월/수/금 19:00"
              rows={2}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isSubmitting}
            >
              {isSubmitting ? '생성 중...' : '반 만들기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
