import type React from 'react';

type MetricCardVariant = 'default' | 'success' | 'warning' | 'danger';

type MetricCardProps = {
  title: string;
  value: React.ReactNode;
  change?: React.ReactNode;
  variant?: MetricCardVariant;
};

const VARIANT_STYLES: Record<MetricCardVariant, string> = {
  default: 'border-slate-200',
  success: 'border-emerald-200',
  warning: 'border-amber-200',
  danger: 'border-red-200'
};

export function MetricCard({ title, value, change, variant = 'default' }: MetricCardProps): React.JSX.Element {
  return (
    <section className={`rounded-xl border bg-white p-5 shadow-sm ${VARIANT_STYLES[variant]}`}>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {change ? <p className="mt-2 text-xs text-slate-500">{change}</p> : null}
    </section>
  );
}
