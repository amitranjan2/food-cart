'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MenuItem } from '../../lib/api';
import { FEATURES } from '../../lib/features';
import { formatRupee } from '../lib/customization';
import { AddressFlow, addressLabel, type AddressStep, type SavedAddress } from './AddressFlow';
import { MenuItemCard } from './MenuItemCard';

export type CartLine = {
  item: MenuItem;
  quantity: number;
  unitPrice: number;
  summary?: string;
};

type Plan = 'once' | 'subscribe';
type Fulfillment = 'pickup' | 'dinein' | 'delivery';
// The server accepts only PICKUP and DINE_IN until V2, so a DELIVERY order fails loudly instead of becoming a pickup.
const ORDER_TYPES = { pickup: 'PICKUP', dinein: 'DINE_IN', delivery: 'DELIVERY' } as const;
export type OrderType = (typeof ORDER_TYPES)[Fulfillment];
type Frequency = 'weekly' | 'monthly';

const DAYS = [
  { id: 'mon', label: 'M' },
  { id: 'tue', label: 'T' },
  { id: 'wed', label: 'W' },
  { id: 'thu', label: 'TH' },
  { id: 'fri', label: 'F' },
  { id: 'sat', label: 'S' },
  { id: 'sun', label: 'SU' },
];

function nextHalfHour(from = new Date()) {
  const next = new Date(from);
  next.setSeconds(0, 0);
  const minutes = next.getMinutes();
  if (minutes === 0 || minutes === 30) return next;
  if (minutes < 30) next.setMinutes(30);
  else next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

/** Server slots are India wall-clock times ("2026-10-09T14:30"); they are shown as written, whatever the phone's time zone. */
function slotDate(slot: string) {
  const [day, time] = slot.split('T');
  const [year, month, date] = day.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, date, hour, minute);
}

function slotKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function clockLabel(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Today's date in India ("2026-10-09"), plus offsetDays. Slots are India time, so "today" must be too. */
function indiaDay(offsetDays = 0) {
  return new Date(Date.now() + 330 * 60_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function dayName(date: Date) {
  const day = slotKey(date).slice(0, 10);
  if (day === indiaDay()) return 'Today';
  if (day === indiaDay(1)) return 'Tomorrow';
  return dayHeading(date);
}

function slotLabel(date: Date) {
  return `${dayName(date)}, ${clockLabel(date)}`;
}

function dayHeading(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const DAILY_HALF_HOURS = Array.from({ length: 48 }, (_, index) => index * 30);

function minutesFromDate(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

function dateAtMinutes(minutes: number) {
  const date = new Date();
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function firstOnceSlotWithTime(options: Date[], minutes: number) {
  return options.find(slot => minutesFromDate(slot) === minutes);
}

function LinePhoto({ item, fallbackImage }: { item: MenuItem; fallbackImage?: string }) {
  const [broken, setBroken] = useState(false);
  const photo = item.imageUrl || fallbackImage;
  return (
    <div className="cart-line-photo">
      {photo && !broken ? (
        <img src={photo} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="media-fallback" />
      )}
    </div>
  );
}

export function Cart({
  lines,
  suggestions,
  quantities,
  total,
  slots,
  hoursSet,
  mobile,
  otp,
  fallbackImage,
  onBack,
  onQuantity,
  onAdd,
  onMobileChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  verified,
  onPay,
  paying,
  payError,
}: {
  lines: CartLine[];
  suggestions: MenuItem[];
  quantities: Record<string, number>;
  total: number;
  /** null while loading. */
  slots: string[] | null;
  hoursSet: boolean;
  mobile: string;
  otp: string;
  fallbackImage?: string;
  onBack: () => void;
  onQuantity: (item: MenuItem, quantity: number) => void;
  onAdd: (item: MenuItem) => void;
  onMobileChange: (mobile: string) => void;
  onOtpChange: (otp: string) => void;
  onSendOtp: () => Promise<void>;
  /** Checks the OTP with the server. Pay is enabled only once this succeeds. */
  onVerifyOtp: () => Promise<void>;
  verified: boolean;
  onPay: (type: OrderType, slot: string) => void;
  paying?: boolean;
  payError?: string;
}) {
  const [plan, setPlan] = useState<Plan>('once');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const onceOptions = useMemo(() => (slots ?? []).map(slotDate), [slots]);
  const [onceSlot, setOnceSlot] = useState<Date | null>(null);
  const [subscribeMinutes, setSubscribeMinutes] = useState(() => minutesFromDate(nextHalfHour()));

  // Keep the chosen slot only while the server still offers it; otherwise fall back to the earliest one.
  useEffect(() => {
    setOnceSlot(current => (current && onceOptions.some(option => option.getTime() === current.getTime()) ? current : onceOptions[0] ?? null));
  }, [onceOptions]);
  const [editing, setEditing] = useState(false);
  const [slotDay, setSlotDay] = useState('');
  const [billOpen, setBillOpen] = useState(false);
  const [address, setAddress] = useState<SavedAddress | null>(null);
  const [addressStep, setAddressStep] = useState<AddressStep | null>(null);
  const [otpSentTo, setOtpSentTo] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpSent = otpSentTo !== '' && otpSentTo === mobile;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function verifyOtp() {
    setVerifying(true);
    setOtpError('');
    try {
      await onVerifyOtp();
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Could not verify the OTP.');
    } finally {
      setVerifying(false);
    }
  }

  async function sendOtp() {
    setSendingOtp(true);
    setOtpError('');
    try {
      await onSendOtp();
      setOtpSentTo(mobile);
      onOtpChange('');
      setResendIn(30);
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Could not send the OTP.');
    } finally {
      setSendingOtp(false);
    }
  }

  // The expanded bill freezes the cart behind it, like the menu and customizer do.
  useEffect(() => {
    if (!billOpen) return;
    const store = document.querySelector('.storefront');
    document.documentElement.classList.add('scroll-locked');
    store?.classList.add('scroll-locked');
    return () => {
      document.documentElement.classList.remove('scroll-locked');
      store?.classList.remove('scroll-locked');
    };
  }, [billOpen]);

  function selectMode(next: Fulfillment) {
    setFulfillment(next);
    if (next === 'delivery' && !address) setBillOpen(false);
  }

  function toggleDay(id: string) {
    setWeekdays(current => current.includes(id) ? current.filter(day => day !== id) : [...current, id]);
  }

  function selectPlan(next: Plan) {
    if (next === plan) return;
    if (next === 'subscribe') setSubscribeMinutes(minutesFromDate(onceSlot ?? nextHalfHour()));
    else setOnceSlot(firstOnceSlotWithTime(onceOptions, subscribeMinutes) ?? onceOptions[0] ?? null);
    setEditing(false);
    setPlan(next);
  }

  const onceGroups = onceOptions.reduce<{ key: string; label: string; times: Date[] }[]>((list, time) => {
    const key = slotKey(time).slice(0, 10);
    const last = list[list.length - 1];
    if (!last || last.key !== key) list.push({ key, label: dayName(time), times: [time] });
    else last.times.push(time);
    return list;
  }, []);

  const shownDay = onceGroups.find(group => group.key === slotDay) ?? onceGroups.find(group => onceSlot && group.key === slotKey(onceSlot).slice(0, 10)) ?? onceGroups[0];
  const slotPill = plan === 'once'
    ? onceSlot ? slotLabel(onceSlot) : slots === null ? '…' : 'None'
    : clockLabel(dateAtMinutes(subscribeMinutes));
  const slotProblem = slots === null || onceSlot ? ''
    : hoursSet ? 'No time slots left today or tomorrow.' : 'This vendor hasn’t set opening hours yet, so orders can’t be placed.';
  const needsAddress = fulfillment === 'delivery' && !address;

  if (addressStep) {
    return (
      <AddressFlow
        initial={address}
        startStep={addressStep}
        onCancel={() => setAddressStep(null)}
        onSave={saved => {
          setAddress(saved);
          setAddressStep(null);
        }}
      />
    );
  }

  return (
    <div className="cart-screen">
      <header className="cart-header">
        <div className="cart-title">
          <button type="button" className="cart-back" onClick={onBack} aria-label="Back to menu">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1>Cart</h1>
        </div>
        <div className="store-scallop" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
        </div>
      </header>

      {lines.length === 0 ? (
        <p className="menu-empty">Your cart is empty.</p>
      ) : (
        <ul className="cart-rows">
          {lines.map(line => (
            <li className="cart-row" key={line.item.id}>
              <LinePhoto item={line.item} fallbackImage={fallbackImage} />
              <div className="cart-row-copy">
                <h3>{line.item.name}</h3>
                {line.summary ? <p>{line.summary}</p> : null}
                <b>{formatRupee(line.unitPrice * line.quantity)}</b>
              </div>
              <span className="qty">
                <button type="button" aria-label={'Remove one ' + line.item.name} onClick={() => onQuantity(line.item, line.quantity - 1)}>−</button>
                <span>{line.quantity}</span>
                <button
                  type="button"
                  aria-label={'Add one ' + line.item.name}
                  onClick={() => onQuantity(line.item, line.quantity + 1)}
                  disabled={!line.item.available}
                >+</button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <section className="menu-section cart-also" aria-label="You may also like">
          <h2>You may also like...</h2>
          <div className="card-row">
            {suggestions.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                variant="compact"
                fallbackImage={fallbackImage}
                quantity={quantities[item.id] || 0}
                onAdd={() => onAdd(item)}
                onQuantity={next => onQuantity(item, next)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="plan-box">
        {FEATURES.subscribe && (
          <>
            <div className="plan-row" role="radiogroup" aria-label="Order type">
              <button type="button" role="radio" aria-checked={plan === 'once'} className={plan === 'once' ? 'on' : undefined} onClick={() => selectPlan('once')}>One-Time</button>
              <button type="button" role="radio" aria-checked={plan === 'subscribe'} className={plan === 'subscribe' ? 'on' : undefined} onClick={() => selectPlan('subscribe')}>Subscribe</button>
            </div>
            <div className="plan-rule" />
          </>
        )}
        {plan === 'subscribe' && (
          <>
            <div className="day-line">
              <span>Day(s)</span>
              <div className="day-picks" role="group" aria-label="Days">
                {DAYS.map(day => (
                  <button
                    key={day.id}
                    type="button"
                    role="checkbox"
                    aria-checked={weekdays.includes(day.id)}
                    className={weekdays.includes(day.id) ? 'on' : undefined}
                    onClick={() => toggleDay(day.id)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="slot-head">
          <div className="slot-copy">
            <span>{fulfillment === 'dinein' ? 'Dine-in time' : 'Pick-up time'}</span>
            <b>{slotPill}</b>
          </div>
          <button
            type="button"
            className="slot-change"
            disabled={plan === 'once' && onceOptions.length === 0}
            aria-expanded={editing}
            onClick={() => {
              setSlotDay('');
              setEditing(value => !value);
            }}
          >
            {editing ? 'Done' : 'Change'}
          </button>
        </div>
        {editing && plan === 'once' && shownDay && (
          <div className="slot-picker">
            {onceGroups.length > 1 && (
              <div className="slot-days" role="tablist" aria-label="Day">
                {onceGroups.map(group => (
                  <button
                    key={group.key}
                    type="button"
                    role="tab"
                    aria-selected={group.key === shownDay.key}
                    className={group.key === shownDay.key ? 'on' : undefined}
                    onClick={() => setSlotDay(group.key)}
                  >
                    {group.label}
                  </button>
                ))}
              </div>
            )}
            <div className="slot-grid" role="radiogroup" aria-label={'Times for ' + shownDay.label}>
              {shownDay.times.map(time => (
                <button
                  key={time.getTime()}
                  type="button"
                  role="radio"
                  aria-checked={onceSlot?.getTime() === time.getTime()}
                  className={onceSlot?.getTime() === time.getTime() ? 'on' : undefined}
                  onClick={() => {
                    setOnceSlot(time);
                    setEditing(false);
                  }}
                >
                  {clockLabel(time)}
                </button>
              ))}
            </div>
          </div>
        )}
        {editing && plan === 'subscribe' && (
          <div className="slot-picker">
            <div className="slot-grid slot-grid-day">
              {DAILY_HALF_HOURS.map(minutes => (
                <button
                  key={minutes}
                  type="button"
                  className={subscribeMinutes === minutes ? 'on' : undefined}
                  onClick={() => {
                    setSubscribeMinutes(minutes);
                    setEditing(false);
                  }}
                >
                  {clockLabel(dateAtMinutes(minutes))}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mode-stack" role="radiogroup" aria-label="Mode">
        {([
          ['pickup', 'Pick Up'],
          ['dinein', 'Dine In'],
          ['delivery', 'Delivery'],
        ] as const).filter(([id]) => id !== 'delivery' || FEATURES.delivery).map(([id, label]) => (
          <div className="mode-option" key={id}>
            <button
              type="button"
              role="radio"
              aria-checked={fulfillment === id}
              className={fulfillment === id ? 'on' : undefined}
              onClick={() => selectMode(id)}
            >
              {label}
            </button>
            {id === 'delivery' && fulfillment === 'delivery' && address && (
              <button type="button" className="mode-address" onClick={() => setAddressStep('details')} aria-label={'Edit delivery address: ' + addressLabel(address)}>
                <i>{addressLabel(address)}</i>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20h4L18.5 9.5a1.4 1.4 0 0 0 0-2L16.5 5.5a1.4 1.4 0 0 0-2 0L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      {plan === 'subscribe' && (
        <section className="plan-box freq-box">
          <div className="plan-row" role="radiogroup" aria-label="Payment frequency">
            <button type="button" role="radio" aria-checked={frequency === 'weekly'} className={frequency === 'weekly' ? 'on' : undefined} onClick={() => setFrequency('weekly')}>Weekly</button>
            <button type="button" role="radio" aria-checked={frequency === 'monthly'} className={frequency === 'monthly' ? 'on' : undefined} onClick={() => setFrequency('monthly')}>Monthly</button>
          </div>
        </section>
      )}

      {needsAddress ? (
        <footer className="customizer-bar address-bar">
          <button type="button" className="customizer-add" onClick={() => setAddressStep('location')}>Add Address</button>
        </footer>
      ) : (
      <>
      <section className="cart-auth" aria-label="Confirm mobile">
        <div className="cart-otp-row">
          <label className="cart-field">
            <input
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              placeholder="Mobile number"
              value={mobile}
              onChange={event => {
                onMobileChange(event.target.value.replace(/\D/g, '').slice(0, 10));
                setOtpSentTo('');
              }}
            />
          </label>
          {verified ? (
            <span className="cart-otp-verified" aria-live="polite">✓ Verified</span>
          ) : otpSent && otp.length === 6 ? (
            <button type="button" className="cart-otp-send" disabled={verifying} onClick={verifyOtp}>
              {verifying ? '…' : 'Submit'}
            </button>
          ) : (
            <button
              type="button"
              className="cart-otp-send"
              disabled={sendingOtp || resendIn > 0 || !/^[6-9]\d{9}$/.test(mobile)}
              onClick={sendOtp}
            >
              {sendingOtp ? '…' : resendIn > 0 ? `Resend ${resendIn}s` : otpSent ? 'Resend' : 'Send OTP'}
            </button>
          )}
        </div>
        {otpSent && !verified && (
          <label className="cart-field">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit OTP"
              value={otp}
              onChange={event => {
                onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6));
                setOtpError('');
              }}
            />
          </label>
        )}
        {slotProblem || otpError || payError ? <p className="cart-pay-error">{slotProblem || otpError || payError}</p> : null}
      </section>
      {billOpen && <div className="bill-backdrop" aria-hidden="true" onClick={() => setBillOpen(false)} />}
      <div className={'bill-dock' + (billOpen ? ' open' : '')}>
        <section className="bill-sheet" id="cart-bill" aria-label="Bill details" aria-hidden={!billOpen}>
          <h2>Bill Details</h2>
          {lines.map(line => (
            <div className="bill-row sub" key={line.item.id}>
              <span>{line.item.name} x{line.quantity}</span>
              <span>{formatRupee(line.unitPrice * line.quantity)}</span>
            </div>
          ))}
          <div className="bill-gap" />
          {/* The server charges exactly the item total; it rejects the order if this number differs. */}
          <div className="bill-row grand"><span>Total</span><span>{formatRupee(total)}</span></div>
        </section>
        <footer className="customizer-bar cart-paybar">
          <button
            type="button"
            className="bill-toggle"
            aria-expanded={billOpen}
            aria-controls="cart-bill"
            aria-label={billOpen ? 'Hide bill details' : 'Show bill details'}
            onClick={() => setBillOpen(current => !current)}
          >
            <svg className={'bill-chevron' + (billOpen ? ' flipped' : '')} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 15l6-6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <strong aria-live="polite">{formatRupee(total)}</strong>
          </button>
          <button type="button" className="customizer-add" disabled={paying || !verified || !onceSlot} onClick={() => onceSlot && onPay(ORDER_TYPES[fulfillment], slotKey(onceSlot))}>{paying ? '…' : 'Pay'}</button>
        </footer>
      </div>
      </>
      )}
    </div>
  );
}
