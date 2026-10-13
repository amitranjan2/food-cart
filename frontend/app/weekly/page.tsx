'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { request } from '../lib/api';
import { storedSession } from '../lib/session';
import { PolicyFooter } from '../components/LegalPage';
import { formatRupee } from '../[slug]/lib/customization';

type Occurrence = {
  date: string;
  slot: string;
  state: 'UPCOMING' | 'ORDERED' | 'SKIPPED';
  orderId?: string;
  orderStatus?: string;
  canSkip: boolean;
  canUndoSkip: boolean;
};

type Weekly = {
  id: string;
  status: 'ACTIVE' | 'PAUSED';
  pauseReason: 'CUSTOMER' | 'MISSED' | null;
  type: 'PICKUP' | 'DINE_IN';
  days: string[];
  time: string;
  quotedTotal: number;
  vendor: { name?: string; slug?: string };
  lines: { name: string; quantity: number }[];
  next: Occurrence[];
};

const DAY = (day: string) => day.charAt(0) + day.slice(1, 3).toLowerCase();

function clock(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return `${hour % 12 || 12}${minute ? ':' + String(minute).padStart(2, '0') : ''} ${hour < 12 ? 'AM' : 'PM'}`;
}

function dateText(date: string) {
  return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const ORDER_STATUS: Record<string, string> = { PLACED: 'Sent to the stall', ACCEPTED: 'Accepted', PREPARING: 'Preparing', READY: 'Ready', COMPLETED: 'Collected', NO_SHOW: 'Not collected', REJECTED: 'Cancelled', CANCELLED: 'Cancelled' };

/** The customer's weekly orders across stalls: what is set up, what is coming, and pause / skip / cancel (tracker S2.21). */
export default function WeeklyOrders() {
  const [token, setToken] = useState<string | null>(null);
  const [list, setList] = useState<Weekly[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    setFresh(new URLSearchParams(window.location.search).has('new'));
    const stored = storedSession();
    setToken(stored);
    if (!stored) return;
    request<Weekly[]>('/api/subscriptions', {}, stored).then(setList).catch(next => setError(next instanceof Error ? next.message : 'Could not load your weekly orders.'));
  }, []);

  async function act(key: string, path: string, method = 'POST') {
    if (!token) return;
    setBusy(key);
    setError('');
    try {
      setList(await request<Weekly[]>('/api/subscriptions/' + path, { method }, token));
    } catch (next) {
      setError(next instanceof Error ? next.message : 'That did not work. Please try again.');
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="storefront">
      <header className="cart-header">
        <div className="cart-title">
          <Link href="/" className="cart-back" aria-label="Back to your vendors">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1>Weekly orders</h1>
        </div>
        <div className="store-scallop" aria-hidden="true">{Array.from({ length: 18 }, (_, index) => <span key={index} />)}</div>
      </header>
      <div className="status-body">
        {fresh && list && list.length > 0 ? (
          <p className="weekly-note" role="status">Your weekly order is set. We place each one 12 hours before pick-up, and you pay at the stall when you collect.</p>
        ) : null}
        {error ? <p className="cart-pay-error">{error}</p> : null}
        {token === '' ? (
          <div className="home-empty">
            <h2>Sign in to see them</h2>
            <p>Open a stall’s menu and confirm your mobile number in the cart. Your weekly orders appear here.</p>
          </div>
        ) : list === null && token ? (
          <p className="status-message">Loading…</p>
        ) : list && list.length === 0 ? (
          <div className="home-empty">
            <h2>No weekly orders yet</h2>
            <p>Add dishes to your cart at a stall and choose “Every week” to repeat them on the days you pick.</p>
          </div>
        ) : (
          list?.map(sub => (
            <article className="weekly-card" key={sub.id}>
              <header>
                <div>
                  <Link href={'/' + sub.vendor.slug}><b>{sub.vendor.name}</b></Link>
                  <span>{sub.days.map(DAY).join(', ')} · {clock(sub.time)} · {sub.type === 'DINE_IN' ? 'Dine in' : 'Pick up'}</span>
                </div>
                <em className={'weekly-chip ' + sub.status.toLowerCase()}>{sub.status === 'ACTIVE' ? 'Active' : 'Paused'}</em>
              </header>
              <p className="weekly-lines">{sub.lines.map(line => `${line.quantity} × ${line.name}`).join(', ')}</p>
              <p className="weekly-price">About {formatRupee(Number(sub.quotedTotal))} each time, at today’s prices · pay at the stall</p>
              {sub.status === 'PAUSED' && (
                <p className="weekly-pause">
                  {sub.pauseReason === 'MISSED' ? 'Paused because the last order wasn’t collected. Resume when you’re ready.' : 'Paused. No orders are placed until you resume.'}
                </p>
              )}
              {sub.next.length > 0 && (
                <ul className="weekly-next" aria-label="Coming up">
                  {sub.next.map(occurrence => {
                    const key = sub.id + occurrence.date;
                    return (
                      <li key={occurrence.date} className={occurrence.state.toLowerCase()}>
                        <span>{dateText(occurrence.date)} · {clock(occurrence.slot.split('T')[1])}</span>
                        {occurrence.state === 'ORDERED' && occurrence.orderId ? (
                          <Link href={`/${sub.vendor.slug}/order/${occurrence.orderId}`}>{ORDER_STATUS[occurrence.orderStatus ?? ''] ?? 'Order placed'} ›</Link>
                        ) : occurrence.state === 'SKIPPED' ? (
                          <>
                            <i>Skipped</i>
                            {occurrence.canUndoSkip && <button type="button" disabled={busy === key} onClick={() => act(key, `${sub.id}/skip/${occurrence.date}`, 'DELETE')}>Undo</button>}
                          </>
                        ) : (
                          <>
                            <i>{occurrence.canSkip ? 'Will be ordered' : 'Ordering soon'}</i>
                            {occurrence.canSkip && <button type="button" disabled={busy === key} onClick={() => act(key, `${sub.id}/skip/${occurrence.date}`)}>Skip</button>}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              <footer>
                {sub.status === 'ACTIVE' ? (
                  <button type="button" disabled={busy === sub.id} onClick={() => act(sub.id, sub.id + '/pause')}>Pause</button>
                ) : (
                  <button type="button" disabled={busy === sub.id} onClick={() => act(sub.id, sub.id + '/resume')}>Resume</button>
                )}
                <button
                  type="button"
                  className="danger"
                  disabled={busy === sub.id}
                  onClick={() => window.confirm('Cancel this weekly order? Orders already placed stay as they are.') && act(sub.id, sub.id + '/cancel')}
                >
                  Cancel
                </button>
              </footer>
            </article>
          ))
        )}
        <PolicyFooter />
      </div>
    </main>
  );
}
