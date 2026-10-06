export function rupees(amount: number | undefined) {
  if (amount == null || Number.isNaN(amount)) return '₹0';
  return `₹${amount}`;
}

export function isSameLocalDay(iso: string | undefined, day: Date) {
  const created = iso ? new Date(iso) : new Date();
  return (
    created.getFullYear() === day.getFullYear() &&
    created.getMonth() === day.getMonth() &&
    created.getDate() === day.getDate()
  );
}

export function formatDayTitle(_offset: number, day: Date) {
  const month = day.toLocaleDateString('en-US', { month: 'short' });
  const weekday = day.toLocaleDateString('en-US', { weekday: 'short' });
  return `${day.getDate()} ${month}, ${day.getFullYear()}(${weekday})`;
}

export function formatElapsed(iso: string | undefined | null, now: number) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
