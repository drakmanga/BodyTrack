export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatDateDisplay(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

export function periodToLabel(period) {
  switch (period) {
    case '30d':
      return '30 giorni';
    case '90d':
      return '90 giorni';
    case '1y':
      return '1 anno';
    default:
      return 'Tutto';
  }
}
