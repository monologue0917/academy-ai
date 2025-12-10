'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui';

/**
 * 결과/분석 페이지
 * 
 * 전체 학원 성적 분석 대시보드
 */

// 더미 데이터
const DUMMY_RECENT_EXAMS = [
  { id: '1', title: '2024 수능 영어 모의고사', date: '12월 9일', avgScore: 78, studentCount: 15, completionRate: 93 },
  { id: '2', title: '고3 수능완성 1회', date: '12월 7일', avgScore: 72, studentCount: 12, completionRate: 100 },
  { id: '3', title: '고2 내신대비 모의고사', date: '12월 5일', avgScore: 81, studentCount: 18, completionRate: 89 },
];

const DUMMY_CLASS_STATS = [
  { id: '1', name: '고3 수능반', avgScore: 76, studentCount: 15, trend: 'up' },
  { id: '2', name: '고2-A반', avgScore: 72, studentCount: 12, trend: 'down' },
  { id: '3', name: '고1-A반', avgScore: 68, studentCount: 10, trend: 'up' },
];

const DUMMY_TOP_STUDENTS = [
  { id: '1', name: '김민준', className: '고3 수능반', avgScore: 94, examCount: 5 },
  { id: '2', name: '이서연', className: '고3 수능반', avgScore: 91, examCount: 5 },
  { id: '3', name: '박지호', className: '고2-A반', avgScore: 88, examCount: 4 },
  { id: '4', name: '최유진', className: '고3 수능반', avgScore: 86, examCount: 5 },
  { id: '5', name: '정현우', className: '고1-A반', avgScore: 85, examCount: 3 },
];

const DUMMY_WEAK_QUESTIONS = [
  { id: '1', type: '빈칸 추론', avgCorrectRate: 32, examTitle: '수능 모의고사' },
  { id: '2', type: '순서 배열', avgCorrectRate: 41, examTitle: '내신대비' },
  { id: '3', type: '문장 삽입', avgCorrectRate: 45, examTitle: '수능완성' },
];

export default function ResultsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'exams' | 'students'>('overview');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="결과 및 분석"
        description="학생들의 성적과 학습 패턴을 분석합니다"
      />

      {/* 탭 */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6">
          {[
            { key: 'overview', label: '전체 현황' },
            { key: 'exams', label: '시험별 결과' },
            { key: 'students', label: '학생별 분석' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 전체 현황 탭 */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 요약 통계 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="총 시험 수" value="24" sub="이번 달" color="indigo" />
            <StatCard label="평균 점수" value="75.2" sub="전체 학생" color="blue" />
            <StatCard label="응시율" value="92%" sub="평균" color="green" />
            <StatCard label="등록 학생" value="45명" sub="활성" color="purple" />
          </div>

          {/* 최근 시험 + 반별 통계 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* 최근 시험 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">최근 시험</h3>
                <button 
                  onClick={() => setActiveTab('exams')}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  전체 보기
                </button>
              </div>
              <div className="space-y-3">
                {DUMMY_RECENT_EXAMS.map((exam) => (
                  <div 
                    key={exam.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => router.push(`/admin/exams/${exam.id}/results`)}
                  >
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{exam.title}</p>
                      <p className="text-xs text-slate-500">{exam.date} · {exam.studentCount}명</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-indigo-600">{exam.avgScore}점</p>
                      <p className="text-xs text-slate-500">응시 {exam.completionRate}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 반별 평균 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">반별 평균 점수</h3>
              <div className="space-y-3">
                {DUMMY_CLASS_STATS.map((cls) => (
                  <div key={cls.id} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700">{cls.name}</span>
                        <span className="text-sm text-slate-600">{cls.avgScore}점</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${cls.avgScore}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs ${cls.trend === 'up' ? 'text-green-600' : 'text-rose-600'}`}>
                      {cls.trend === 'up' ? '↑' : '↓'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 성적 우수 학생 + 취약 유형 */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* TOP 5 학생 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">🏆 성적 우수 학생 TOP 5</h3>
              <div className="space-y-2">
                {DUMMY_TOP_STUDENTS.map((student, idx) => (
                  <div 
                    key={student.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-600' :
                      idx === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{student.name}</p>
                      <p className="text-xs text-slate-500">{student.className}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-indigo-600">{student.avgScore}점</p>
                      <p className="text-xs text-slate-500">{student.examCount}회 응시</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 취약 유형 */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 mb-4">⚠️ 전체 취약 유형</h3>
              <div className="space-y-3">
                {DUMMY_WEAK_QUESTIONS.map((q, idx) => (
                  <div 
                    key={q.id}
                    className="flex items-center justify-between p-3 bg-rose-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-rose-100 text-rose-600 rounded-lg flex items-center justify-center text-sm font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-900">{q.type}</p>
                        <p className="text-xs text-slate-500">{q.examTitle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-rose-600">{q.avgCorrectRate}%</p>
                      <p className="text-xs text-slate-500">정답률</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 시험별 결과 탭 */}
      {activeTab === 'exams' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">시험명</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">날짜</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">응시</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">평균</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">최고/최저</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: '1', title: '2024 수능 영어 모의고사', date: '12/09', count: '14/15', avg: 78, high: 96, low: 52 },
                { id: '2', title: '고3 수능완성 1회', date: '12/07', count: '12/12', avg: 72, high: 88, low: 48 },
                { id: '3', title: '고2 내신대비 모의고사', date: '12/05', count: '16/18', avg: 81, high: 94, low: 62 },
                { id: '4', title: '고1 기초 문법 테스트', date: '12/03', count: '10/10', avg: 85, high: 100, low: 70 },
              ].map((exam) => (
                <tr key={exam.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{exam.title}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600">{exam.date}</td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600">{exam.count}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-indigo-600">{exam.avg}점</span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    <span className="text-green-600">{exam.high}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-rose-600">{exam.low}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => router.push(`/admin/exams/${exam.id}/results`)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 학생별 분석 탭 */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">학생</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">반</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">응시 수</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">평균 점수</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">추세</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { id: '1', name: '김민준', class: '고3 수능반', exams: 5, avg: 94, trend: 'up' },
                { id: '2', name: '이서연', class: '고3 수능반', exams: 5, avg: 91, trend: 'up' },
                { id: '3', name: '박지호', class: '고2-A반', exams: 4, avg: 88, trend: 'same' },
                { id: '4', name: '최유진', class: '고3 수능반', exams: 5, avg: 86, trend: 'down' },
                { id: '5', name: '정현우', class: '고1-A반', exams: 3, avg: 85, trend: 'up' },
                { id: '6', name: '이현석', class: '고3 수능반', exams: 2, avg: 72, trend: 'up' },
              ].map((student) => (
                <tr key={student.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{student.name}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                      {student.class}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-slate-600">{student.exams}회</td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-slate-900">{student.avg}점</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-lg ${
                      student.trend === 'up' ? 'text-green-500' :
                      student.trend === 'down' ? 'text-rose-500' : 'text-slate-400'
                    }`}>
                      {student.trend === 'up' ? '📈' : student.trend === 'down' ? '📉' : '➡️'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-sm text-indigo-600 hover:underline">
                      상세 보기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 통계 카드 컴포넌트
function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color: 'indigo' | 'blue' | 'green' | 'purple';
}) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-200',
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const textColors = {
    indigo: 'text-indigo-700',
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-sm text-slate-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${textColors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
