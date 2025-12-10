import { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  backButton?: ReactNode;
  className?: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * PageHeader - 페이지 최상단 헤더
 */
export function PageHeader({ 
  title, 
  description, 
  breadcrumbs,
  actions,
  backButton,
  className = '' 
}: PageHeaderProps) {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          {breadcrumbs.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-slate-400">/</span>
              )}
              {item.href ? (
                <a 
                  href={item.href}
                  className="hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span className="text-slate-900 font-medium">
                  {item.label}
                </span>
              )}
            </div>
          ))}
        </nav>
      )}
      
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {backButton}
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-slate-600 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="ml-6 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
