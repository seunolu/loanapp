import type React from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
};

export function PageHeader({ title, subtitle, right }: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle ? <div className="text-sm text-slate-600">{subtitle}</div> : null}
      </div>
      {right ? <div className="flex flex-wrap items-start justify-end gap-2">{right}</div> : null}
    </div>
  );
}
