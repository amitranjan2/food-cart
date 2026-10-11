import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export const metadata: Metadata = { title: 'Vendor Terms · ' + LEGAL.brand };

/** Terms for stalls that sell on the platform (tracker S4.22). Customers have their own Terms (/terms). */
export default function VendorTerms() {
  return (
    <LegalPage title="Vendor Terms">
      <p>
        These terms apply when you sell food on {LEGAL.brand} as a vendor. They are an agreement between you and{' '}
        <Fill field="company" />, <Fill field="address" /> (&quot;we&quot;, &quot;us&quot;). By signing in to the vendor app and opening a
        stall, you accept them. Customers have their own <Link href="/terms">Terms of Use</Link>; how we handle your data is in
        our <Link href="/privacy#vendors">Privacy Policy</Link>.
      </p>

      <h2>1. Who can sell</h2>
      <ul>
        <li>You are 18 or older, run a food business in India, and can enter into this agreement for it.</li>
        <li>
          You hold a valid FSSAI registration or licence for your stall and keep it valid while you sell on {LEGAL.brand}. Tell
          us at once if it is suspended or cancelled.
        </li>
        <li>You sign in with your own mobile number, which must be on WhatsApp. One number is one stall.</li>
        <li>Everything you give us (name, address, licence, PAN, payout details) is true and kept up to date.</li>
      </ul>

      <h2>2. Opening your stall</h2>
      <p>
        After you sign up and complete the setup steps, our team reviews your stall. We may call you and check your FSSAI
        number. Customers can see your stall only after we approve it. We may ask for changes, or decline a stall, for example
        if we cannot verify its details. Your store link (suprmama.in/your-stall) is fixed once your stall is live, because it is
        printed on your QR posters.
      </p>

      <h2>3. Your storefront and menu</h2>
      <ul>
        <li>You set your menu, prices, options and opening hours, and keep them accurate.</li>
        <li>
          The price you set is the price the customer pays, including any taxes you charge. Don&apos;t charge customers more at the
          counter for an order paid on {LEGAL.brand}.
        </li>
        <li>Mark each dish correctly as veg, non-veg, egg or vegan, and describe it honestly.</li>
        <li>
          Use only photos and text you own or may use. You let us show them on {LEGAL.brand} and in its promotion while your stall
          is with us.
        </li>
        <li>
          Switch your stall off in the app, or pause dishes, when you can&apos;t take orders. A stall that is on and has open hours is
          telling customers it will prepare their order.
        </li>
        <li>We may hide a dish, photo or description that breaks these terms or the law.</li>
      </ul>

      <h2>4. Orders</h2>
      <ul>
        <li>Every order is paid online before it reaches you. You see the customer&apos;s name, mobile number, dishes and time slot.</li>
        <li>
          <b>Accept or reject</b> each new order promptly. Rejecting refunds the customer in full and you are not paid for that
          order.
        </li>
        <li>
          <b>Once you accept an order, you must prepare it</b> for the customer&apos;s time slot. Orders can&apos;t be cancelled in
          the app after you accept them.
        </li>
        <li>
          If something goes wrong after accepting (a dish runs out, the stall must close), call {LEGAL.brand} support at once,
          and call the customer. Support may cancel the order and refund the customer in full; you are not paid for it.
        </li>
        <li>
          Hand an order over only when the customer gives you their 4-digit handover code, and enter it in the app. Never hand
          over without the code: an order handed over without it is treated as not delivered.
        </li>
        <li>Repeatedly accepting orders you then can&apos;t make may lead to suspension (section 9).</li>
      </ul>

      <h2>5. Food safety</h2>
      <p>
        You are the seller of the food and fully responsible for it: its quality, hygiene, ingredients, allergen information,
        packaging and freshness, and for following the Food Safety and Standards Act, 2006 and its rules. {LEGAL.brand} doesn&apos;t
        prepare, inspect or handle food. If a customer complains about food safety, we may pause your stall while we look into
        it.
      </p>

      <h2>6. Fees and payouts</h2>
      <ul>
        <li>Our fee: <Fill field="vendorFee" />.</li>
        <li>
          Customers pay through our payment partner. Your earnings for each completed order (the amount the customer paid, less
          our fee and any taxes we must deduct) are paid to the payout account you gave us: <Fill field="payoutSchedule" />.
        </li>
        <li>You are not paid for orders that are rejected, cancelled by support or refunded.</li>
        <li>
          We may hold a payout while we look into a complaint, a chargeback or suspected fraud on an order, and take back
          amounts paid out for orders later refunded.
        </li>
        <li>
          Payouts need complete and correct payout details. We are not responsible for money sent to a wrong account you gave us.
        </li>
        <li>We will tell you at least 30 days before we change our fee.</li>
      </ul>

      <h2>7. Taxes</h2>
      <p>
        You are responsible for the taxes on your sales, including GST if you are registered for it. Where the law requires us,
        as an e-commerce operator, to deduct or collect tax on your sales (for example TDS under the Income-tax Act or TCS under
        GST) or to report them, we will do so from your payouts and give you the details.
      </p>

      <h2>8. Customer details</h2>
      <p>
        Use each customer&apos;s name and mobile number only to prepare and hand over their order and to contact them about it.
        Don&apos;t save them for marketing, share or sell them, or contact customers for anything else. Be polite to customers and
        to our staff.
      </p>

      <h2>9. Suspending or closing a stall</h2>
      <ul>
        <li>You can close your stall at any time by writing to us. Orders already accepted must still be prepared.</li>
        <li>
          We may pause or close a stall, with notice where we can, if it breaks these terms or the law, gives false details,
          loses its FSSAI registration, gets serious or repeated food-safety complaints, or often fails orders it accepted.
        </li>
        <li>
          After closing, we pay out what you are owed for completed orders, less refunds and our fee. What happens to your data
          is in the <Link href="/privacy#vendors">Privacy Policy</Link>.
        </li>
      </ul>

      <h2>10. Responsibility</h2>
      <p>
        {LEGAL.brand} provides the ordering and payment service; we are not the seller of your food. We work to keep the service
        running but can&apos;t promise it is never interrupted. As far as the law allows, our liability to you is limited to the
        fees we earned from your stall in the three months before the claim. You will compensate us for claims, fines and costs
        that arise from your food, your breach of these terms or of the law.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these terms. We will tell you in the vendor app or on WhatsApp before a change that affects you takes
        effect; selling on {LEGAL.brand} after that means you accept it.
      </p>

      <h2>12. Law and disputes</h2>
      <p>These terms are governed by the laws of India. Courts in <Fill field="jurisdiction" /> have jurisdiction.</p>

      <h2>13. Contact</h2>
      <p>
        Questions, complaints and closing a stall: <Fill field="email" />. Our grievance officer is <Fill field="grievanceOfficer" />,{' '}
        <Fill field="grievanceEmail" />.
      </p>
    </LegalPage>
  );
}
