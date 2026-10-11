import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';
import { LAUNCH_RATES, percent } from '../lib/bill';

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
          The price you set is the price before GST. Customers&apos; bills add GST on food, and our platform charges when they pay
          online (section 6); don&apos;t add GST of your own, and never charge more than the amount the app shows for the order.
        </li>
        <li>Your FSSAI licence or registration number is shown on your storefront, as food-safety rules for online food sales require.</li>
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
        <li>
          An order is either <b>paid at the stall</b> (the customer pays you when collecting) or <b>paid online</b> before it reaches
          you, where online payment is offered. The app shows which. You see the customer&apos;s name, mobile number, dishes and time slot.
        </li>
        <li>
          <b>Accept or reject</b> each new order promptly. Rejecting an order paid online refunds the customer in full and you are
          not paid for that order.
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
        <li>
          <b>Pay at the stall</b>: take the full amount the app shows (your prices plus GST on food), in cash or by UPI to you,
          <b> before</b> you enter the code. Entering the code records the order as paid. If the customer doesn&apos;t come, you may mark
          the order as not collected from 30 minutes after their slot; only do so when they really didn&apos;t come.
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

      <h2>6. What customers pay, and what you get</h2>
      <ul>
        <li>
          For each order the customer pays your prices, plus GST on food ({percent(LAUNCH_RATES.foodGstBp)}). Orders paid online also
          carry our platform charges ({percent(LAUNCH_RATES.platformFeeBp)} of your prices and the GST, covering online payment
          charges) and GST on those charges ({percent(LAUNCH_RATES.platformFeeGstBp)}).
        </li>
        <li>
          <b>Pay at the stall</b>: you keep your prices. The GST on food you take from the customer is ours to pay to the government
          (section 7), so you hold it for us and pass it on: after each month we send a statement listing your collected pay-at-stall
          orders and their GST, which you pay within 7 days, by UPI as shown in the app (or we take it from payouts once they
          start). We may pause a stall with a statement more than 15 days overdue.
        </li>
        <li>
          <b>We don&apos;t take a cut of your orders.</b> For every completed order you get the full total of your prices. The GST on
          food is ours to pay to the government (section 7) and the platform charges are ours.
        </li>
        <li>
          For orders paid online, your earnings are paid to the payout account you gave us, by our payment partner:{' '}
          <Fill field="payoutSchedule" />. Taxes we must deduct (section 7) are taken off and shown to you.
        </li>
        <li>You are not paid for orders that are rejected, cancelled by support or refunded.</li>
        <li>
          We may hold a payout while we look into a complaint, a chargeback or suspected fraud on an order, and take back amounts
          paid out for orders later refunded.
        </li>
        <li>Payouts need complete and correct payout details. We are not responsible for money sent to a wrong account you gave us.</li>
      </ul>

      <h2>7. Your plan, and taxes</h2>
      <p>You pay us for using {LEGAL.brand} on one of three plans, each plus GST at 18%:</p>
      <ul>
        <li>
          <b>Daily</b>: {LEGAL.vendorPlans.daily} for each day you sell. A day counts when at least one customer paid for an order
          from your stall that day (India time) and it wasn&apos;t rejected, cancelled or refunded. A pay-at-stall order counts on
          the day it was placed, once you handed it over; one not collected doesn&apos;t count. Billed after each calendar month,
          for the days counted; a month without such days costs nothing. Every stall starts on Daily.
        </li>
        <li><b>Monthly</b>: {LEGAL.vendorPlans.monthly} per calendar month, whatever days you sell. Billed at the start of the month.</li>
        <li>
          <b>Yearly</b>: {LEGAL.vendorPlans.yearly} for 12 calendar months, billed at the start. You stay on Yearly until those 12
          months end; it then continues for another year unless you have picked another plan.
        </li>
        <li>
          You choose your plan in the vendor app (Plan and billing). A new plan starts on the 1st of the next month, or after a
          running yearly term. Charges start only once your stall is approved.
        </li>
        <li>
          We send a tax invoice for every charge. Pay it within 7 days of the invoice: once payouts start we take it from them;
          until then, pay by UPI as shown in the app. We may pause a stall with invoices more than 15 days overdue.
        </li>
        <li>
          We may later add a fee per order. We will tell you at least 30 days before any new fee, or any change to plan prices,
          starts.
        </li>
        <li>
          <b>GST on food sold through {LEGAL.brand}</b> is collected and paid by us as the e-commerce operator, under section 9(5) of
          the CGST Act, 2017, whether or not you are registered for GST, and however the customer pays. You don&apos;t charge or pay
          GST on these sales; on pay-at-stall orders you collect it for us (section 6). If you are
          GST-registered, tell your accountant they are taxed through us.
        </li>
        <li>
          If you are GST-registered, give us your GSTIN so that it appears on our invoices for your plan, and you can claim
          the GST on it as input tax credit.
        </li>
        <li>
          <b>Income tax</b>: as an e-commerce operator we must deduct TDS under section 194-O of the Income-tax Act (currently
          0.1% of your sales) unless you are an individual or HUF whose sales through us stay within ₹5 lakh in the year and you
          have given us your PAN. This applies to pay-at-stall sales too: where it applies, we add it to your monthly statement.
          Deducted tax is shown in your Form 26AS. Your own income tax on your earnings is yours.
        </li>
      </ul>

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
          After closing, we pay out what you are owed for completed orders, less refunds and any unpaid plan invoices. What happens to your data
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
