export function formatNairaFromKobo(kobo: number): string {
  const value = Number.isFinite(kobo) ? Math.max(0, Math.round(kobo)) : 0;
  const naira = value / 100;
  return `\u20a6${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

export function formatMoneyNGN(value: number, unit: 'kobo' | 'naira' = 'kobo'): string {
  const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (unit === 'naira') {
    return `\u20a6${Math.round(safeValue).toLocaleString('en-NG')}`;
  }
  return formatNairaFromKobo(safeValue);
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
}): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('en-NG', options);
}

export function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function formatRelativeTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  const diffMs = parsed.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) {
    return 'Just now';
  }
  if (absMinutes < 60) {
    return describeRelative(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return describeRelative(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 7) {
    return describeRelative(diffDays, 'day');
  }

  return formatDate(value);
}

export function formatStatusLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function parseAmountInput(value: string): number {
  const normalized = value.replace(/[^0-9.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function describeRelative(value: number, unit: 'minute' | 'hour' | 'day'): string {
  const absolute = Math.abs(value);
  const suffix = absolute === 1 ? unit : `${unit}s`;
  if (value < 0) {
    return `${absolute} ${suffix} ago`;
  }
  return `In ${absolute} ${suffix}`;
}
