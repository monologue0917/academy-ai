'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  PageHeader,
  AppCard,
  CardHeader,
  CardContent,
  Button,
  BackButton,
  Badge,
  UsersIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/ui';
import { useAuth } from '@/lib/auth';

/**
 * 반 상세 페이지
 */

interface ClassDetail {
  id: string;
  name: string;
  description: string | null;
  grade: string | null;
  teacher: { id: string; name: string } | null;
}

interface StudentInClass {
  enrollmentId: string;
  studentId: string;
  name: string;
  email: string | null;
  enrolledAt: string;
}

interface AvailableStudent {
  id: string;
  name: string;
  email: string | null;
}

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params?.classId as string;
  const { user } = useAuth();

  const [classInfo, setClassInfo] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<StudentInClass[]>([]);
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchClassDetail();
    }
  }, [classId]);

  const fetchClassDetail = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching class detail for:', classId);
      
      const response = await fetch(`/api/admin/classes/${classId}`);
      const data = await response.json();

      console.log('Class detail response:', data);

      if (data.success) {
        setClassInfo(data.classInfo);
        setStudents(data.students || []);
      } else {
        console.error('Failed to fetch class:', data.error);
      }
    } catch (error) {
      console.error('Class detail fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    if (!user?.academyId) return;

    try {
      const response = await fetch(
        `/api/admin/classes/${classId}/available-students?academyId=${user.academyId}`
      );
      const data = await response.json();

      if (data.success) {
        setAvailableStudents(data.students || []);
      }
    } catch (error) {
      console.error('Available students fetch error:', error);
    }
  };

  const handleAddStudent = async (studentId: string) => {
    setIsAdding(true);
    try {
      const response = await fetch(`/api/admin/classes/${classId}/add-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchClassDetail();
        await fetchAvailableStudents();
      } else {
        alert(data.error || '학생 추가에 실패했습니다');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`${studentName} 학생을 이 반에서 제거하시겠습니까?`)) return;

    setIsRemoving(enrollmentId);
    try {
      const response = await fetch(`/api/admin/classes/${classId}/remove-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollmentId }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchClassDetail();
      } else {
        alert(data.error || '학생 제거에 실패했습니다');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleDeleteClass = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/classes/${classId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        router.push('/admin/classes');
      } else {
        alert(data.error || '반 삭제에 실패했습니다');
      }
    } catch (error) {
      alert('서버 오류가 발생했습니다');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const openAddModal = async () => {
    await fetchAvailableStudents();
    setShowAddModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="반 상세"
          backButton={<BackButton href="/admin/classes" />}
        />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="반 상세"
          backButton={<BackButton href="/admin/classes" />}
        />
        <AppCard>
          <div className="text-center py-12">
            <p className="text-slate-500">반 정보를 찾을 수 없습니다</p>
            <Button 
              variant="secondary" 
              className="mt-4"
              onClick={() => router.push('/admin/classes')}
            >
              반 목록으로 돌아가기
            </Button>
          </div>
        </AppCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={classInfo.name}
        description={classInfo.description || `담당: ${classInfo.teacher?.name || '미지정'}`}
        backButton={<BackButton href="/admin/classes" />}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="secondary"
              leftIcon={<TrashIcon size={16} />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              반 삭제
            </Button>
            <Button leftIcon={<PlusIcon size={16} />} onClick={openAddModal}>
              학생 추가
            </Button>
          </div>
        }
      />

      {/* 반 정보 카드 */}
      <AppCard>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-indigo-600">{students.length}</p>
              <p className="text-sm text-slate-500">총 학생</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">
                {classInfo.teacher?.name || '-'}
              </p>
              <p className="text-sm text-slate-500">담당 선생님</p>
            </div>
            <div>
              {classInfo.grade && (
                <>
                  <p className="text-2xl font-bold text-emerald-600">{classInfo.grade}</p>
                  <p className="text-sm text-slate-500">학년</p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </AppCard>

      {/* 학생 목록 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            소속 학생 ({students.length}명)
          </h2>
        </div>

        {students.length === 0 ? (
          <AppCard>
            <div className="text-center py-8">
              <UsersIcon size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 mb-4">아직 학생이 없습니다</p>
              <Button
                leftIcon={<PlusIcon size={16} />}
                onClick={openAddModal}
              >
                학생 추가하기
              </Button>
            </div>
          </AppCard>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                    이메일
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                    등록일
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr key={student.enrollmentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {student.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(student.enrolledAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveStudent(student.enrollmentId, student.name)}
                        disabled={isRemoving === student.enrollmentId}
                        className="text-rose-600 hover:text-rose-700 p-1 rounded hover:bg-rose-50 disabled:opacity-50"
                      >
                        {isRemoving === student.enrollmentId ? (
                          <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TrashIcon size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 학생 추가 모달 */}
      {showAddModal && (
        <AddStudentModal
          availableStudents={availableStudents}
          isAdding={isAdding}
          onAdd={handleAddStudent}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* 반 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-bold text-slate-900 mb-2">반 삭제</h3>
            <p className="text-slate-600 mb-4">
              "{classInfo.name}" 반을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-rose-600">
                이 반에 소속된 학생들은 반 배정이 해제됩니다.
              </span>
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                취소
              </Button>
              <button
                onClick={handleDeleteClass}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 학생 추가 모달
function AddStudentModal({
  availableStudents,
  isAdding,
  onAdd,
  onClose,
}: {
  availableStudents: AvailableStudent[];
  isAdding: boolean;
  onAdd: (studentId: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const filteredStudents = availableStudents.filter(
    (s) => s.name.includes(search) || s.email?.includes(search)
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">학생 추가</h2>
          <p className="text-sm text-slate-500 mt-1">
            이 반에 추가할 학생을 선택하세요
          </p>
        </div>

        <div className="p-4 border-b border-slate-100">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 이메일로 검색"
            className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">
                {availableStudents.length === 0
                  ? '추가할 수 있는 학생이 없습니다'
                  : '검색 결과가 없습니다'}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                새 학생이 회원가입하면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-medium">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.email || '이메일 없음'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onAdd(student.id)}
                    disabled={isAdding}
                    className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg disabled:opacity-50"
                  >
                    추가
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200">
          <Button variant="secondary" fullWidth onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  );
}
