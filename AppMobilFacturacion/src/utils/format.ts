export const formatCurrency = (value: number, currency = '$'): string => {
  const fixed = Math.abs(value).toFixed(2);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = value < 0 ? '-' : '';
  return `${sign}${currency}${withCommas}.${dec}`;
};

export const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso: string): string => {
  const d = new Date(iso);
  const date = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
  const time = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time}`;
};

export const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
