import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';
import { LAUNCH_RATES, percent } from '../lib/bill';

export const metadata: Metadata = { title: 'Terms of Use · ' + LEGAL.brand };

export default function Terms() {
  return (
    <LegalPage title="Terms of Use">
      <h2>1. Who we are</h2>
      <p>
        {LEGAL.brand} is run by <Fill field="company" />, <Fill field="address" /> (&quot;we&quot;, &quot;us&quot;). {LEGAL.brand} lets you
        order food online from independent food stalls and carts (&quot;vendors&quot;) and collect it at the stall (pick up) or eat
        there (dine in).
      </p>
      <p>
        Vendors are independent businesses. Each vendor sets its own menu and prices, prepares and sells the food, and is
        responsible for its quality, hygiene, allergen information and food-safety licences (such as FSSAI registration). We
        provide the ordering and payment service; we are not the seller of the food.
      </p>

      <h2>2. Your account</h2>
      <p>
        You sign in with your mobile number and a one-time code (OTP) sent to it on WhatsApp, so the number must be on WhatsApp. Use your own number and your real name: the
        vendor sees both so they can hand your order to you. You must be 18 or older, or use {LEGAL.brand} with a parent&apos;s or
        guardian&apos;s permission. Keep your phone secure; orders placed from your signed-in phone are treated as yours.
      </p>

      <h2>3. Placing an order</h2>
      <ul>
        <li>You choose dishes and their options, Pick Up or Dine In, and a 30-minute time slot from the ones the vendor offers.</li>
        <li>
          Prices are in Indian rupees, set by the vendor, and don&apos;t include GST. Your bill adds GST on food (
          {percent(LAUNCH_RATES.foodGstBp)}). When you pay online, it also adds platform charges ({percent(LAUNCH_RATES.platformFeeBp)} of
          the item total and GST, covering online payment charges) and GST on them ({percent(LAUNCH_RATES.platformFeeGstBp)}); paying at
          the stall has no platform charges. The total in the cart is the full amount you pay.
        </li>
        <li>
          {LEGAL.brand} collects and pays the GST on food as the e-commerce operator (section 9(5) of the CGST Act, 2017). After
          you collect your order, its tax invoices are on your order page.
        </li>
        <li>
          <b>Pay at the stall.</b> Your order goes to the vendor straight away and you pay the vendor the full bill when you
          collect it, in cash or by UPI to the vendor. Pay before you give your handover code: the code confirms you have paid and
          received your order.
        </li>
        <li>
          <b>Pay online</b> (where offered). You pay before the order is sent to the vendor; it is confirmed only when our payment
          partner confirms the payment. An order not paid within 15 minutes is cancelled and nothing is charged.
        </li>
        <li>
          The vendor may accept or reject your order (for example, if a dish has run out). If they reject an order paid online, you get
          a full refund, as set out in our <Link href="/refunds">Refund &amp; Cancellation Policy</Link>.
        </li>
        <li>
          Pay at the stall is for orders you will collect. You can have up to 2 such orders waiting at a time. If 2 of your orders
          are marked as not collected, pay at the stall is turned off for your number; write to <Fill field="email" /> to ask for it back.
        </li>
      </ul>

      <h2>4. Payments</h2>
      <p>
        Online payments are processed by our payment partner. We never see or store your card number, UPI PIN or banking passwords;
        we only receive the payment&apos;s status, reference and amount. When you pay at the stall, you pay the vendor directly
        and we record that the order was paid when the vendor enters your handover code.
      </p>

      <h2>5. Collecting your order</h2>
      <p>
        Your order page shows its progress. When the vendor marks it ready, the page shows a 4-digit handover code. Give the
        code to the vendor only when you receive your food: entering it marks the order as handed over. Please arrive within
        your time slot.
      </p>

      <h2>6. Fair use</h2>
      <p>
        Don&apos;t misuse {LEGAL.brand}: no false orders, payment fraud, automated or bulk access, attempts to break its security, or
        abuse of vendors or our staff. We may suspend accounts that do.
      </p>

      <h2>7. Our responsibility</h2>
      <p>
        We work to keep {LEGAL.brand} available and accurate, but it is provided as it is. As far as the law allows, our liability
        for any order is limited to the amount you paid for that order. Questions about the food itself are the vendor&apos;s
        responsibility, and we will help you reach them. Nothing in these terms limits your rights under the Consumer Protection
        Act, 2019.
      </p>

      <h2>8. Changes</h2>
      <p>We may update these terms. The date at the top shows the latest version; using {LEGAL.brand} after a change means you accept it.</p>

      <h2>9. Law and disputes</h2>
      <p>These terms are governed by the laws of India. Courts in <Fill field="jurisdiction" /> have jurisdiction.</p>

      <h2>10. Contact</h2>
      <p>
        Questions or complaints: <Fill field="email" />. See <Link href="/contact">Contact us</Link> for phone, address and our
        grievance officer.
      </p>
    </LegalPage>
  );
}
