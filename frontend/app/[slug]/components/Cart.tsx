'use client';

import { useEffect, useMemo, useState } from 'react';
import { BillRows } from '../../components/BillRows';
import type { Bill, PaymentMethod } from '../../lib/bill';
import type { MenuItem } from '../../lib/api';
import { FEATURES } from '../../lib/features';
import type { OtpDelivery } from '../../lib/otpDelivery';
import { formatRupee } from '../lib/customization';
import { AddressFlow, addressLabel, type AddressStep, type SavedAddress } from './AddressFlow';
import { MenuItemCard } from './MenuItemCard';

export type CartLine = {
  /** One dish with one set of choices; see lib/cartLines. */
  key: string;
  item: MenuItem;
  quantity: number;
  unitPrice: number;
  summary?: string;
};

type Plan = 'once' | 'weekly';
type Fulfillment = 'pickup' | 'dinein' | 'delivery';
// The server accepts only PICKUP and DINE_IN until V2, so a DELIVERY order fails loudly instead of becoming a pickup.
const ORDER_TYPES = { pickup: 'PICKUP', dinein: 'DINE_IN', delivery: 'DELIVERY' } as const;
export type OrderType = (typeof ORDER_TYPES)[Fulfillment];

/** Ids are the server's day names; a weekly order is sent as these. */
const DAYS = [
  { id: 'MONDAY', label: 'Mon' },
  { id: 'TUESDAY', label: 'Tue' },
  { id: 'WEDNESDAY', label: 'Wed' },
  { id: 'THURSDAY', label: 'Thu' },
  { id: 'FRIDAY', label: 'Fri' },
  { id: 'SATURDAY', label: 'Sat' },
  { id: 'SUNDAY', label: 'Sun' },
];

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

/** "13:30" → "1:30 PM". */
function timeLabel(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return clockLabel(new Date(2000, 0, 1, hour, minute));
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
  bill,
  methods,
  method,
  onMethod,
  slots,
  hoursSet,
  week,
  weeklyTotal,
  storeOpen = true,
  mobile,
  otp,
  otpDelivery,
  fallbackImage,
  onBack,
  onQuantity,
  onLineQuantity,
  onAdd,
  onMobileChange,
  onOtpChange,
  onSendOtp,
  onVerifyOtp,
  verified,
  customerName,
  onSaveName,
  onSignOut,
  onPay,
  onSubscribe,
  paying,
  payError,
}: {
  lines: CartLine[];
  suggestions: MenuItem[];
  quantities: Record<string, number>;
  total: number;
  /** The full bill for total (items + GST + platform charges); the Pay amount. */
  bill: Bill;
  /** The ways to pay right now (pay at the stall only, until online payment is set up). */
  methods: PaymentMethod[];
  method: PaymentMethod;
  onMethod: (method: PaymentMethod) => void;
  /** null while loading. */
  slots: string[] | null;
  hoursSet: boolean;
  /** Slot starts ("HH:mm") the stall offers on each weekday (MONDAY…), for choosing a weekly order's time. */
  week: Record<string, string[]>;
  /** What each weekly order costs at the stall (items + GST). */
  weeklyTotal: number;
  /** False while the vendor has switched the stall off. */
  storeOpen?: boolean;
  mobile: string;
  otp: string;
  /** Whether WhatsApp delivered the last code; null until known. */
  otpDelivery?: OtpDelivery | null;
  fallbackImage?: string;
  onBack: () => void;
  /** For the suggestion cards (whole dish). */
  onQuantity: (item: MenuItem, quantity: number) => void;
  /** For one cart line. */
  onLineQuantity: (key: string, quantity: number) => void;
  onAdd: (item: MenuItem) => void;
  onMobileChange: (mobile: string) => void;
  onOtpChange: (otp: string) => void;
  onSendOtp: () => Promise<void>;
  /** Checks the OTP with the server. Pay is enabled only once this succeeds. */
  onVerifyOtp: () => Promise<void>;
  verified: boolean;
  /** Saved name; empty until the customer saves one. */
  customerName: string;
  onSaveName: (name: string) => Promise<void>;
  /** Forgets the verified customer so someone else can order. */
  onSignOut: () => void;
  onPay: (type: OrderType, slot: string) => void;
  /** Starts a weekly order: on these days (MONDAY…) at this "HH:mm" time. */
  onSubscribe: (type: OrderType, days: string[], time: string) => void;
  paying?: boolean;
  payError?: string;
}) {
  const [plan, setPlan] = useState<Plan>('once');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [weekDays, setWeekDays] = useState<string[]>([]);
  const [weekTime, setWeekTime] = useState('');
  const onceOptions = useMemo(() => (slots ?? []).map(slotDate), [slots]);
  const [onceSlot, setOnceSlot] = useState<Date | null>(null);
  // A weekly order's time must be one the stall offers on every chosen day.
  const weekTimes = useMemo(() => {
    const lists = weekDays.map(day => week[day] ?? []);
    return lists.length ? lists.reduce((common, list) => common.filter(time => list.includes(time))) : [];
  }, [weekDays, week]);
  useEffect(() => {
    setWeekTime(current => (weekTimes.includes(current) ? current : ''));
  }, [weekTimes]);

  // The customer must pick a slot; keep it only while the server still offers it.
  useEffect(() => {
    setOnceSlot(current => (current && onceOptions.some(option => option.getTime() === current.getTime()) ? current : null));
  }, [onceOptions]);
  const [editing, setEditing] = useState(false);
  const [slotDay, setSlotDay] = useState('');
  const [billOpen, setBillOpen] = useState(false);
  const [address, setAddress] = useState<SavedAddress | null>(null);
  const [addressStep, setAddressStep] = useState<AddressStep | null>(null);
  const [otpSentTo, setOtpSentTo] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const otpSent = otpSentTo !== '' && otpSentTo === mobile;

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn(value => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function saveName() {
    setSavingName(true);
    setOtpError('');
    try {
      await onSaveName(nameDraft.trim());
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'Could not save your name.');
    } finally {
      setSavingName(false);
    }
  }

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
    setWeekDays(current => current.includes(id) ? current.filter(day => day !== id) : [...current, id]);
  }

  function selectPlan(next: Plan) {
    if (next === plan) return;
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
    ? onceSlot ? slotLabel(onceSlot) : slots === null ? '…' : onceOptions.length ? 'Select a time' : 'None'
    : weekTime ? timeLabel(weekTime) : weekDays.length === 0 ? 'Pick days first' : weekTimes.length ? 'Select a time' : 'No common time';
  const weeklyReady = plan === 'weekly' && weekDays.length > 0 && weekTime !== '';
  const weeklySummary = weeklyReady
    ? `Every ${DAYS.filter(day => weekDays.includes(day.id)).map(day => day.label).join(', ')} at ${timeLabel(weekTime)}`
    : '';
  const slotProblem = slots === null || onceOptions.length ? ''
    : !storeOpen ? 'This stall isn’t taking orders right now. Check back when it opens.'
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

      <div className="cart-items">
        {lines.length === 0 ? (
          <p className="menu-empty">Your cart is empty.</p>
        ) : (
          <ul className="cart-rows">
            {lines.map(line => (
              <li className="cart-row" key={line.key}>
                <LinePhoto item={line.item} fallbackImage={fallbackImage} />
                <div className="cart-row-copy">
                  <h3>{line.item.name}</h3>
                  {line.summary ? <p>{line.summary}</p> : null}
                  <b>{formatRupee(line.unitPrice * line.quantity)}</b>
                </div>
                <span className="qty">
                  <button type="button" aria-label={'Remove one ' + line.item.name + (line.summary ? ` (${line.summary})` : '')} onClick={() => onLineQuantity(line.key, line.quantity - 1)}>−</button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    aria-label={'Add one ' + line.item.name + (line.summary ? ` (${line.summary})` : '')}
                    onClick={() => onLineQuantity(line.key, line.quantity + 1)}
                    disabled={!line.item.available}
                  >+</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

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

      <section className="plan-box" aria-label="When">
        {FEATURES.subscribe && methods.includes('CASH') && (
          <div className="plan-row" role="radiogroup" aria-label="Order type">
            <button type="button" role="radio" aria-checked={plan === 'once'} className={plan === 'once' ? 'on' : undefined} onClick={() => selectPlan('once')}>Just once</button>
            <button type="button" role="radio" aria-checked={plan === 'weekly'} className={plan === 'weekly' ? 'on' : undefined} onClick={() => selectPlan('weekly')}>Every week</button>
          </div>
        )}
        {plan === 'weekly' && (
          <div className="day-line">
            <span>Days</span>
            <div className="day-picks" role="group" aria-label="Days">
              {DAYS.map(day => {
                const closed = (week[day.id] ?? []).length === 0;
                return (
                  <button
                    key={day.id}
                    type="button"
                    role="checkbox"
                    aria-checked={weekDays.includes(day.id)}
                    className={weekDays.includes(day.id) ? 'on' : undefined}
                    disabled={closed}
                    title={closed ? 'Closed' : undefined}
                    onClick={() => toggleDay(day.id)}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div className={'slot-head' + (FEATURES.subscribe && methods.includes('CASH') ? ' slot-head-spaced' : '')}>
          <div className="slot-copy">
            <span>{fulfillment === 'dinein' ? 'Dine-in time' : 'Pick-up time'}</span>
            <b>{slotPill}</b>
          </div>
          <button
            type="button"
            className="slot-change"
            disabled={plan === 'once' ? onceOptions.length === 0 : weekTimes.length === 0}
            aria-expanded={editing}
            onClick={() => {
              setSlotDay('');
              setEditing(value => !value);
            }}
          >
            {editing ? 'Done' : (plan === 'once' ? onceSlot : weekTime) ? 'Change' : 'Select'}
          </button>
        </div>
        {plan === 'weekly' && weekDays.length > 0 && weekTimes.length === 0 && (
          <p className="plan-hint">These days don’t share an opening time. Pick days with the same hours, or order them separately.</p>
        )}
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
        {editing && plan === 'weekly' && weekTimes.length > 0 && (
          <div className="slot-picker">
            <div className="slot-grid" role="radiogroup" aria-label="Weekly time">
              {weekTimes.map(time => (
                <button
                  key={time}
                  type="button"
                  role="radio"
                  aria-checked={weekTime === time}
                  className={weekTime === time ? 'on' : undefined}
                  onClick={() => {
                    setWeekTime(time);
                    setEditing(false);
                  }}
                >
                  {timeLabel(time)}
                </button>
              ))}
            </div>
          </div>
        )}
        {weeklySummary && (
          <p className="plan-summary">
            <b>{weeklySummary}</b>
            About {formatRupee(weeklyTotal)} each time, at today’s prices. We place each order 12 hours before pick-up; skip any one until then.
          </p>
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

      <section className="plan-box pay-box" aria-label="Payment">
        {methods.length > 1 && plan === 'once' ? (
          <div className="plan-row" role="radiogroup" aria-label="How you pay">
            {methods.map(id => (
              <button type="button" role="radio" key={id} aria-checked={method === id} className={method === id ? 'on' : undefined} onClick={() => onMethod(id)}>
                {id === 'ONLINE' ? 'Pay online' : 'Pay at the stall'}
              </button>
            ))}
          </div>
        ) : null}
        {plan === 'weekly' || method === 'CASH' ? (
          <div className="pay-card">
            <i aria-hidden="true">₹</i>
            <div>
              <b>Pay at the stall</b>
              <p className="pay-note">
                {plan === 'weekly'
                  ? `Pay about ${formatRupee(weeklyTotal)} each time you collect, in cash or by UPI to the stall. Weekly UPI autopay is coming later.`
                  : `Pay ${formatRupee(bill.total)} when you collect, in cash or by UPI to the stall. Show your code after paying.`}
              </p>
            </div>
          </div>
        ) : (
          <p className="pay-note">Pay now online. The stall sees your order once the payment goes through.</p>
        )}
      </section>

      {needsAddress ? (
        <footer className="customizer-bar address-bar">
          <button type="button" className="customizer-add" onClick={() => setAddressStep('location')}>Add Address</button>
        </footer>
      ) : (
      <>
      <section className="cart-auth" aria-label="Confirm mobile">
        {verified && customerName ? (
          <div className="cart-identity" aria-label="Ordering as">
            <div>
              <b>{customerName}</b>
              <span>{mobile}</span>
            </div>
            <button
              type="button"
              className="cart-identity-switch"
              onClick={() => {
                setOtpSentTo('');
                setNameDraft('');
                setOtpError('');
                onSignOut();
              }}
            >
              Not you?
            </button>
            <i aria-label="Verified">✓</i>
          </div>
        ) : (
        <>
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
                // The 30 s resend gap is per number: a corrected number can get a code straight away.
                setResendIn(0);
                setOtpError('');
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
              placeholder="6-digit code from WhatsApp"
              value={otp}
              onChange={event => {
                onOtpChange(event.target.value.replace(/\D/g, '').slice(0, 6));
                setOtpError('');
              }}
            />
          </label>
        )}
        {otpSent && !verified && (
          otpDelivery?.state === 'FAILED' ? (
            <p className="cart-otp-hint cart-otp-failed" role="alert">{otpDelivery.message ?? 'WhatsApp couldn’t deliver the code. Tap Resend.'}</p>
          ) : otpDelivery?.state === 'DELIVERED' ? (
            <p className="cart-otp-hint" aria-live="polite">Delivered on WhatsApp to {mobile}. Enter the 6-digit code.</p>
          ) : (
            <p className="cart-otp-hint" aria-live="polite">Code sent on WhatsApp to {mobile}. Didn&apos;t get it? Make sure this number is on WhatsApp.</p>
          )
        )}
        {verified && (
          <div className="cart-otp-row">
            <label className="cart-field">
              <input
                autoComplete="name"
                maxLength={60}
                placeholder="Your name"
                value={nameDraft}
                onChange={event => {
                  setNameDraft(event.target.value);
                  setOtpError('');
                }}
              />
            </label>
            <button type="button" className="cart-otp-send" disabled={savingName || nameDraft.trim() === ''} onClick={saveName}>
              {savingName ? '…' : 'Save'}
            </button>
          </div>
        )}
        </>
        )}
        {slotProblem || otpError || payError ? <p className="cart-pay-error">{slotProblem || otpError || payError}</p> : null}
      </section>
      {billOpen && <div className="bill-backdrop" aria-hidden="true" onClick={() => setBillOpen(false)} />}
      <div className={'bill-dock' + (billOpen ? ' open' : '')}>
        <section className="bill-sheet" id="cart-bill" aria-label="Bill details" aria-hidden={!billOpen}>
          <h2>Bill Details</h2>
          {lines.map(line => (
            <div className="bill-row sub" key={line.key}>
              <span>{line.item.name}{line.summary ? ` (${line.summary})` : ''} x{line.quantity}</span>
              <span>{formatRupee(line.unitPrice * line.quantity)}</span>
            </div>
          ))}
          <div className="bill-gap" />
          {/* The server charges exactly this bill (BillRules); it rejects the order if the total differs. */}
          <BillRows bill={bill} />
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
            <strong aria-live="polite">{formatRupee(plan === 'weekly' ? weeklyTotal : bill.total)}</strong>
          </button>
          <button
            type="button"
            className="customizer-add"
            disabled={paying || !verified || !customerName || (plan === 'once' ? !onceSlot : !weeklyReady)}
            onClick={() => {
              if (plan === 'weekly') onSubscribe(ORDER_TYPES[fulfillment], weekDays, weekTime);
              else if (onceSlot) onPay(ORDER_TYPES[fulfillment], slotKey(onceSlot));
            }}
          >
            {paying ? '…' : plan === 'weekly' ? 'Start weekly order' : method === 'CASH' ? 'Place order' : 'Pay'}
          </button>
        </footer>
      </div>
      </>
      )}
    </div>
  );
}
