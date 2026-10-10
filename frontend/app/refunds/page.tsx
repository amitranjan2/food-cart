import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export const metadata: Metadata = { title: 'Refund & Cancellation Policy · ' + LEGAL.brand };

export default function Refunds() {
  return (
    <LegalPage title="Refund & Cancellation">
      <p>
        You pay for every {LEGAL.brand} order online before it is sent to the vendor. This policy explains when you get your money
        back and how long it takes.
      </p>

      <h2>Automatic full refunds</h2>
      <p>You get the full amount back, without asking, when:</p>
      <ul>
        <li>the vendor rejects your order (for example, a dish has run out or the stall is closing);</li>
        <li>your payment reaches us after the order has expired (orders not paid within 15 minutes are cancelled); or</li>
        <li>the amount paid does not match the order total.</li>
      </ul>
      <p>If a payment fails, nothing is charged. If money leaves your account for a failed payment, your bank returns it.</p>

      <h2>Cancelling an order</h2>
      <p>
        Once paid, your order goes straight to the vendor. To cancel before the vendor accepts it, call the stall using the
        number on your order page; if they reject it, you get a full refund. After the vendor accepts, the food is prepared
        for your time slot, so the order can no longer be cancelled.
      </p>

      <h2>Problems with your food</h2>
      <p>
        If items are missing or wrong, tell the vendor when you collect your order, or contact us at <Fill field="email" />{' '}
        within 24 hours with your order number. We will check with the vendor and refund the affected items, or the whole
        order, where the problem is confirmed.
      </p>

      <h2>Orders not collected</h2>
      <p>
        Please collect your order during your time slot. If you can&apos;t, call the stall. An order that is ready but not collected
        by the end of the day, without contacting the stall, is not refunded, because the food has been made for you.
      </p>

      <h2>How long refunds take</h2>
      <p>
        We start refunds straight away. The money goes back to the account or card you paid with, usually within 5–7 working
        days depending on your bank; UPI refunds are often quicker. Your order page shows when a refund has started.
      </p>

      <h2>Questions</h2>
      <p>
        Write to <Fill field="email" /> or call <Fill field="phone" />. See <Link href="/contact">Contact us</Link> for more.
      </p>
    </LegalPage>
  );
}
