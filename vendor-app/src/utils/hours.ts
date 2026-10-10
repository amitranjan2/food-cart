import type { OpeningHours, Weekday } from '../types';
import { clock12 } from './format';

/** Opening hours as the profile page edits them: each day's slots in time order. Mirrors the API's SlotRules. */
export type Slot = { opens: string; closes: string };
export type Week = Record<Weekday, Slot[]>;

export const DAYS: { day: Weekday; label: string }[] = [
  { day: 'MONDAY', label: 'Mon' },
  { day: 'TUESDAY', label: 'Tue' },
  { day: 'WEDNESDAY', label: 'Wed' },
  { day: 'THURSDAY', label: 'Thu' },
  { day: 'FRIDAY', label: 'Fri' },
  { day: 'SATURDAY', label: 'Sat' },
  { day: 'SUNDAY', label: 'Sun' },
];

export const MAX_SLOTS = 6;
const MIDNIGHT = 24 * 60;

export function toMinutes(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return hour * 60 + minute;
}

export function fromMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** "9:30 AM"; a closing "24:00" reads "12:00 midnight". */
export function timeLabel(time: string) {
  if (time === '24:00') return '12:00 midnight';
  const minutes = toMinutes(time);
  return clock12(Math.floor(minutes / 60), minutes % 60);
}

export function toWeek(hours: OpeningHours[] | undefined): Week {
  const week = Object.fromEntries(DAYS.map(({ day }) => [day, [] as Slot[]])) as Week;
  for (const h of hours ?? []) week[h.day]?.push({ opens: h.opens, closes: h.closes });
  for (const { day } of DAYS) week[day].sort((a, b) => toMinutes(a.opens) - toMinutes(b.opens));
  return week;
}

export function fromWeek(week: Week): OpeningHours[] {
  return DAYS.flatMap(({ day }) => week[day].map(slot => ({ day, ...slot })));
}

/** Times a slot may start at: after the previous slot ends, before the next one starts (half hours). */
export function startChoices(slots: Slot[], index: number) {
  const from = index > 0 ? toMinutes(slots[index - 1].closes) : 0;
  const until = (index < slots.length - 1 ? toMinutes(slots[index + 1].opens) : MIDNIGHT) - 30;
  return range(from, until);
}

/** Times a slot may end at: after it starts, up to the next slot (or midnight). */
export function endChoices(slots: Slot[], index: number) {
  const from = toMinutes(slots[index].opens) + 30;
  const until = index < slots.length - 1 ? toMinutes(slots[index + 1].opens) : MIDNIGHT;
  return range(from, until);
}

function range(from: number, until: number) {
  const out: string[] = [];
  for (let m = from; m <= until; m += 30) out.push(fromMinutes(m));
  return out;
}

/**
 * A new slot for the day: the first one is open all day (00:00 – midnight, then narrowed by the vendor); later ones
 * start when the previous one ends. Null when the day is already full until midnight or has MAX_SLOTS.
 */
export function nextSlot(slots: Slot[]): Slot | null {
  if (slots.length >= MAX_SLOTS) return null;
  if (slots.length === 0) return { opens: '00:00', closes: '24:00' };
  const start = toMinutes(slots[slots.length - 1].closes);
  if (start >= MIDNIGHT) return null;
  return { opens: fromMinutes(start), closes: fromMinutes(Math.min(start + 120, MIDNIGHT)) };
}

/** Changing a slot's start may push its end later; never past the next slot. */
export function setStart(slots: Slot[], index: number, opens: string): Slot[] {
  return slots.map((slot, i) => {
    if (i !== index) return slot;
    const closes = toMinutes(slot.closes) > toMinutes(opens) ? slot.closes : fromMinutes(toMinutes(opens) + 30);
    return { opens, closes };
  });
}

export function setEnd(slots: Slot[], index: number, closes: string): Slot[] {
  return slots.map((slot, i) => (i === index ? { ...slot, closes } : slot));
}

export function sameWeek(a: Week, b: Week) {
  return JSON.stringify(fromWeek(a)) === JSON.stringify(fromWeek(b));
}
