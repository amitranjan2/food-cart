import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export const metadata: Metadata = { title: 'Refund & Cancellation Policy · ' + LEGAL.brand };

export default function Refunds() {
  return (
    <LegalPage title="Refund & Cancellation">
      <p>
        You pay for a {LEGAL.brand} order either at the stall when you collect it, or online before it is sent to the vendor (where
        online payment is offered). This policy explains what happens when an order is cancelled, and when you get your money back.
      </p>

      <h2>Orders paid at the stall</h2>
      <p>
        You pay only when you collect your order, so if the vendor rejects it or our support cancels it, nothing has been paid and
        there is nothing to refund. To cancel before the vendor accepts it, call the stall using the number on your order page.
        If something you paid for at the stall is missing or wrong, tell the vendor straight away; they return the money for it.
        If they don&apos;t, contact us (see below) and we will follow it up with the vendor.
      </p>

      <h2>Automatic full refunds (online payments)</h2>
      <p>For orders paid online, you get the full amount back, including GST and platform charges, without asking, when:</p>
      <ul>
        <li>the vendor rejects your order (for example, a dish has run out or the stall is closing);</li>
        <li>the vendor accepted your order but can&apos;t make it, and our support cancels it;</li>
        <li>your payment reaches us after the order has expired (orders not paid within 15 minutes are cancelled); or</li>
        <li>the amount paid does not match the order total.</li>
      </ul>
      <p>If a payment fails, nothing is charged. If money leaves your account for a failed payment, your bank returns it.</p>

      <h2>Cancelling an order paid online</h2>
      <p>
        Once paid, your order goes straight to the vendor. To cancel before the vendor accepts it, call the stall using the
        number on your order page; if they reject it, you get a full refund. After the vendor accepts, the food is prepared
        for your time slot, so you can no longer cancel it. If the stall then can&apos;t make it, our support cancels it and you
        get a full refund.
      </p>

      <h2>Problems with your food</h2>
      <p>
        If items are missing or wrong, tell the vendor when you collect your order, or contact us at <Fill field="email" />{' '}
        within 24 hours with your order number. We will check with the vendor and refund the affected items, or the whole
        order, where the problem is confirmed.
      </p>

      <h2>Orders not collected</h2>
      <p>
        Please collect your order during your time slot. If you can&apos;t, call the stall. An order paid online that is ready but not
        collected by the end of the day, without contacting the stall, is not refunded, because the food has been made for you. A
        pay-at-the-stall order not collected within 30 minutes of your slot may be marked as not collected; after 2 such orders,
        pay at the stall is turned off for your number.
      </p>

      <h2>Weekly orders</h2>
      <p>
        A weekly order is placed 12 hours before each pick-up and is paid at the stall, so there is nothing to refund when you skip,
        pause or cancel it. Skip a week before the order is placed, or call the stall after. Once an order is placed it follows the
        rules above.
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
