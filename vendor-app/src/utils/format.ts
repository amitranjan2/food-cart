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

const IST_OFFSET_MS = 330 * 60_000;

/** India wall-clock parts of an instant. Done by hand so it works on every JS engine (IST has no daylight saving). */
function indiaParts(ms: number) {
  const shifted = new Date(ms + IST_OFFSET_MS);
  return {
    dayNumber: Math.floor((ms + IST_OFFSET_MS) / 86_400_000),
    weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shifted.getUTCDay()],
    date: shifted.getUTCDate(),
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][shifted.getUTCMonth()],
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export function clock12(hour: number, minute: number) {
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** "Today 3:00 PM", "Tomorrow 9:30 AM" or "Sun 11 Oct, 12:30 AM" for an order's slot, in India time. */
export function formatSlot(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const slot = indiaParts(ms);
  const today = indiaParts(now).dayNumber;
  const time = clock12(slot.hour, slot.minute);
  if (slot.dayNumber === today) return `Today ${time}`;
  if (slot.dayNumber === today + 1) return `Tomorrow ${time}`;
  return `${slot.weekday} ${slot.date} ${slot.month}, ${time}`;
}
