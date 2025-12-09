import Link from 'next/link';
import { ChevronLeftIcon } from './Icons';

interface BackButtonProps {
  href: string;
  label?: string;
}

/**
 * 뒤로가기 버튼 컴포넌트
 * 
 * 페이지 상단에서 이전 페이지로 이동할 때 사용
 */
export function BackButton({ href, label = '뒤로' }: BackButtonProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors"
    >
      <ChevronLeftIcon size={16} />
      <span>{label}</span>
    </Link>
  );
}
