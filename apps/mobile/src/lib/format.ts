export function formatNairaFromKobo(kobo: number): string {
  const value = Number.isFinite(kobo) ? Math.max(0, Math.round(kobo)) : 0;
  const naira = value / 100;
  return `\u20a6${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })}`;
}

