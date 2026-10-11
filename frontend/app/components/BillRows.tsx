'use client';

import { useState } from 'react';
import { type Bill, percent } from '../lib/bill';
import { formatRupee as rupee } from '../[slug]/lib/customization';

/** The bill's tax and charges lines (cart and order page), under the dish lines; ends with "To pay". */
export function BillRows({ bill, totalLabel = 'To pay' }: { bill: Bill; totalLabel?: string }) {
  const [info, setInfo] = useState(false);
  return (
    <>
      <div className="bill-row"><span>Item total</span><span>{rupee(bill.itemTotal)}</span></div>
      <div className="bill-row sub"><span>GST on food ({percent(bill.rates.foodGstBp)})</span><span>{rupee(bill.foodGst)}</span></div>
      <div className="bill-row sub">
        <span>
          Platform charges
          <button type="button" className="bill-info" aria-expanded={info} aria-label="What are platform charges?" onClick={() => setInfo(open => !open)}>i</button>
        </span>
        <span>{rupee(bill.platformFee)}</span>
      </div>
      {info ? (
        <p className="bill-note" role="note">
          Covers online payment charges: {percent(bill.rates.platformFeeBp)} of the item total and GST on food. Refunded in full if your order is
          cancelled.
        </p>
      ) : null}
      <div className="bill-row sub"><span>GST on platform charges ({percent(bill.rates.platformFeeGstBp)})</span><span>{rupee(bill.platformFeeGst)}</span></div>
      <div className="bill-row grand"><span>{totalLabel}</span><span>{rupee(bill.total)}</span></div>
    </>
  );
}
