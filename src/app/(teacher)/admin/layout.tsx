import { ReactNode } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';

export const metadata = {
  title: '선생님 대시보드 | ACE ENGLISH',
  description: '학원 관리 및 모의고사/숙제 관리 시스템',
};

interface TeacherLayoutProps {
  children: ReactNode;
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return <AdminLayout>{children}</AdminLayout>;
}
