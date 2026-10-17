'use client';

import type { MenuItem } from '../../lib/api';
import { formatRupee, type StoredConfiguration } from '../lib/customization';

/**
 * Shown when + is tapped on a dish with choices that is already in the cart: add the same again, or pick
 * different choices as a separate cart line.
 */
export function RepeatPrompt({
  item,
  last,
  onRepeat,
  onChooseAgain,
  onClose,
}: {
  item: MenuItem;
  last: StoredConfiguration;
  onRepeat: () => void;
  onChooseAgain: () => void;
  onClose: () => void;
}) {
  return (
    <div className="test-checkout" role="dialog" aria-modal="true" aria-label={'Add another ' + item.name} onClick={onClose}>
      <div className="test-checkout-sheet repeat-sheet" onClick={event => event.stopPropagation()}>
        <p className="test-checkout-kicker repeat-kicker">ADD ANOTHER {item.name.toUpperCase()}</p>
        <p className="repeat-last">
          Your last choice: <b>{last.summary || 'Regular'}</b> · {formatRupee(last.unitPrice)}
        </p>
        <button type="button" className="customizer-add" onClick={onRepeat}>Repeat last</button>
        <button type="button" className="test-checkout-fail" onClick={onChooseAgain}>Choose again</button>
        <button type="button" className="test-checkout-close" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
