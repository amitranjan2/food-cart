'use client';

import { formatRupee } from '../lib/customization';

/** Local development stand-in for a gateway's checkout. No money moves. */
export function TestCheckout({ amount, onChoose }: { amount: number; onChoose: (outcome: 'success' | 'failure' | 'closed') => void }) {
  return (
    <div className="test-checkout" role="dialog" aria-modal="true" aria-label="Test payment">
      <div className="test-checkout-sheet">
        <p className="test-checkout-kicker">TEST PAYMENT · NO MONEY MOVES</p>
        <strong>{formatRupee(amount)}</strong>
        <p>This stands in for the real payment page until a gateway is connected.</p>
        <button type="button" className="customizer-add" onClick={() => onChoose('success')}>Pay {formatRupee(amount)}</button>
        <button type="button" className="test-checkout-fail" onClick={() => onChoose('failure')}>Make payment fail</button>
        <button type="button" className="test-checkout-close" onClick={() => onChoose('closed')}>Close</button>
      </div>
    </div>
  );
}
