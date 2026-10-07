'use client';

import { useEffect, useState } from 'react';
import type { MenuItem } from '../../lib/api';
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
type Frequency = 'weekly' | 'monthly';

// Placeholder charges until the vendor API exposes tax and delivery settings.
const TAX_RATE = 0.05;
const DELIVERY_FEE = 20;

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

function slotsThroughTomorrow(from = new Date()) {
  const start = nextHalfHour(from);
  const end = new Date(from);
  end.setDate(end.getDate() + 1);
  end.setHours(23, 30, 0, 0);
  const slots: Date[] = [];
  const cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    slots.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 30);
  }
  return slots;
}

function clockLabel(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function slotLabel(date: Date, now = new Date()) {
  const time = clockLabel(date);
  if (date.toDateString() === now.toDateString()) return time;
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  return `${weekday} ${time}`;
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

function firstOnceSlotWithTime(minutes: number, from = new Date()) {
  return slotsThroughTomorrow(from).find(slot => minutesFromDate(slot) === minutes);
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
  mobile,
  otp,
  fallbackImage,
  onBack,
  onQuantity,
  onAdd,
  onMobileChange,
  onOtpChange,
  onPay,
  paying,
  payError,
}: {
  lines: CartLine[];
  suggestions: MenuItem[];
  quantities: Record<string, number>;
  total: number;
  mobile: string;
  otp: string;
  fallbackImage?: string;
  onBack: () => void;
  onQuantity: (item: MenuItem, quantity: number) => void;
  onAdd: (item: MenuItem) => void;
  onMobileChange: (mobile: string) => void;
  onOtpChange: (otp: string) => void;
  onPay: () => void;
  paying?: boolean;
  payError?: string;
}) {
  const [plan, setPlan] = useState<Plan>('once');
  const [fulfillment, setFulfillment] = useState<Fulfillment>('pickup');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [onceOptions] = useState(() => slotsThroughTomorrow());
  const [onceSlot, setOnceSlot] = useState(() => onceOptions[0] ?? nextHalfHour());
  const [subscribeMinutes, setSubscribeMinutes] = useState(() => minutesFromDate(onceOptions[0] ?? nextHalfHour()));
  const [editing, setEditing] = useState(false);
  const [billOpen, setBillOpen] = useState(false);
  const [address, setAddress] = useState<SavedAddress | null>(null);
  const [addressStep, setAddressStep] = useState<AddressStep | null>(null);

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
    if (next === 'subscribe') setSubscribeMinutes(minutesFromDate(onceSlot));
    else {
      const match = firstOnceSlotWithTime(subscribeMinutes);
      setOnceSlot(match ?? nextHalfHour());
    }
    setEditing(false);
    setPlan(next);
  }

  const onceGroups = onceOptions.reduce<{ key: string; label: string; times: Date[] }[]>((list, time) => {
    const key = time.toDateString();
    const last = list[list.length - 1];
    if (!last || last.key !== key) list.push({ key, label: dayHeading(time), times: [time] });
    else last.times.push(time);
    return list;
  }, []);

  const slotPill = plan === 'once' ? slotLabel(onceSlot) : clockLabel(dateAtMinutes(subscribeMinutes));
  const tax = Math.round(total * TAX_RATE);
  const delivery = fulfillment === 'delivery' && lines.length > 0 ? DELIVERY_FEE : 0;
  const grandTotal = total + tax + delivery;
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
        <div className="plan-row" role="radiogroup" aria-label="Order type">
          <button type="button" role="radio" aria-checked={plan === 'once'} className={plan === 'once' ? 'on' : undefined} onClick={() => selectPlan('once')}>One-Time</button>
          <button type="button" role="radio" aria-checked={plan === 'subscribe'} className={plan === 'subscribe' ? 'on' : undefined} onClick={() => selectPlan('subscribe')}>Subscribe</button>
        </div>
        <div className="plan-rule" />
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
        <div className="slot-line">
          <span>Slot</span>
          <b>{slotPill}</b>
          <button type="button" className="slot-edit" aria-expanded={editing} aria-label="Edit time slot" onClick={() => setEditing(value => !value)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 20h4L18.5 9.5a1.4 1.4 0 0 0 0-2L16.5 5.5a1.4 1.4 0 0 0-2 0L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M13.5 6.5l4 4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
        </div>
        {editing && plan === 'once' && (
          <div className="slot-picker">
            {onceGroups.map(group => (
              <div key={group.key}>
                <p>{group.label}</p>
                <div className="slot-grid">
                  {group.times.map(time => (
                    <button
                      key={time.getTime()}
                      type="button"
                      className={onceSlot.getTime() === time.getTime() ? 'on' : undefined}
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
            ))}
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
        ] as const).map(([id, label]) => (
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
        <label className="cart-field">
          <input inputMode="numeric" autoComplete="tel" placeholder="Mobile number" value={mobile} onChange={event => onMobileChange(event.target.value)} />
        </label>
        <label className="cart-field">
          <input inputMode="numeric" autoComplete="one-time-code" placeholder="OTP" value={otp} onChange={event => onOtpChange(event.target.value)} />
        </label>
        {payError ? <p className="cart-pay-error">{payError}</p> : null}
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
          <div className="bill-row"><span>Item Total</span><span>{formatRupee(total)}</span></div>
          <div className="bill-row"><span>Tax</span><span>{formatRupee(tax)}</span></div>
          {delivery > 0 && <div className="bill-row"><span>Delivery</span><span>{formatRupee(delivery)}</span></div>}
          <div className="bill-row grand"><span>Total</span><span>{formatRupee(grandTotal)}</span></div>
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
            <strong aria-live="polite">{formatRupee(grandTotal)}</strong>
          </button>
          <button type="button" className="customizer-add" disabled={paying || !mobile.trim() || !otp.trim()} onClick={onPay}>{paying ? '…' : 'Pay'}</button>
        </footer>
      </div>
      </>
      )}
    </div>
  );
}
