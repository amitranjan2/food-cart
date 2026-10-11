import type { Metadata } from 'next';
import Link from 'next/link';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export const metadata: Metadata = { title: 'Privacy Policy · ' + LEGAL.brand };

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what personal data {LEGAL.brand} collects, why, and your choices. <Fill field="company" /> (&quot;we&quot;) is
        responsible for this data under the Digital Personal Data Protection Act, 2023.
      </p>
      <p>
        It covers customers who order and vendors who sell on {LEGAL.brand}. The sections up to &quot;How long we keep it&quot; are
        about customers; <a href="#vendors">vendors have their own section</a>. People who write to us through our website&apos;s
        contact form are covered by <a href="#contact-form">their own section</a>. Rights, security and contact apply to all.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Mobile number</b>: to sign you in with a one-time code sent on WhatsApp, and to let the vendor call you about your order.</li>
        <li><b>Name</b>: shown to the vendor so they can hand your order to you.</li>
        <li><b>Orders</b>: the vendor, dishes and options, Pick Up or Dine In, time slot, amount, how you paid (online or at the stall), status and handover details.</li>
        <li><b>Orders not collected</b>: how many of your pay-at-the-stall orders a vendor marked as not collected, so we can turn pay at the stall off after 2.</li>
        <li><b>Payment details from our payment partner</b>: payment status, reference and amount. We do not receive card numbers, UPI PINs or bank passwords.</li>
        <li><b>Vendors you open</b>: stalls whose page you opened or ordered from, so they appear under &quot;Your vendors&quot;.</li>
        <li><b>Technical data</b>: IP address, device and browser information and server logs, used to keep the service secure.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To sign you in and keep you signed in.</li>
        <li>To send your order to the vendor and show you its progress.</li>
        <li>To take payments and make refunds.</li>
        <li>To show your vendors and the dishes you ordered before (&quot;Order again&quot;).</li>
        <li>To prevent fraud and abuse, for example by limiting how often codes can be requested, and how many pay-at-the-stall orders can wait at once.</li>
        <li>To answer your questions and complaints, and to keep records the law requires (such as tax and accounting records).</li>
      </ul>
      <p>We use your data only for these purposes. We do not sell it, and we do not use it for advertising by others.</p>

      <h2>Who we share it with</h2>
      <ul>
        <li><b>The vendor you order from</b>: your name, mobile number and order, to prepare and hand it over.</li>
        <li><b>Our payment partner</b>: the amount, an order reference and the contact details needed to take the payment.</li>
        <li><b>WhatsApp (Meta Platforms)</b>: your mobile number and the sign-in code, to deliver the code to you on WhatsApp.</li>
        <li><b>Our hosting and infrastructure providers</b>, who store data for us under contract.</li>
        <li><b>Authorities</b>, when the law requires it.</li>
      </ul>

      <h2>On your device</h2>
      <p>
        We use your browser&apos;s storage to keep you signed in and to remember the vendors you opened. We do not use advertising
        cookies or tracking tools. Signing out with &quot;Not you?&quot; removes the sign-in from your device.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Sign-in codes expire within minutes and sign-ins after 30 days. Your account details are kept while you use{' '}
        {LEGAL.brand}. Order and payment records are kept as long as tax and accounting laws require, then deleted.
      </p>

      <h2 id="contact-form">If you write to us through our website</h2>
      <p>
        The contact form on {LEGAL.domain} asks for your name, email address, phone number and message, and nothing else. We
        use them only to reply to you and to deal with what you asked about (for example, a stall that wants to join). The form
        sends your message to our support inbox, <Fill field="email" />; our website host (Hostinger) stores the submission and
        our email provider stores the email, for us. We keep them for up to 12 months after we have answered, then delete them,
        unless they become part of an order complaint or a vendor&apos;s records, which we keep as those sections say. We don&apos;t add
        you to any mailing list.
      </p>

      <h2 id="vendors">If you sell on {LEGAL.brand} (vendors)</h2>
      <p>This section covers the people who run stalls on {LEGAL.brand} and sign in to the vendor app.</p>

      <h3>What we collect from vendors</h3>
      <ul>
        <li><b>Mobile number</b>: to sign you in with a one-time code on WhatsApp. One number belongs to one stall.</li>
        <li><b>Your storefront</b>: business name, store link, description, colours, menu, prices, dish photos and opening hours.</li>
        <li><b>Stall location</b>: the map point you set at your stall and the written address (shop number, landmark, area).</li>
        <li><b>Food licence</b>: your FSSAI registration or licence number.</li>
        <li><b>PAN</b>: yours, or your business&apos;s.</li>
        <li><b>Payout details</b>: a UPI ID, or a bank account (account holder name, account number and IFSC).</li>
        <li><b>Orders and records</b>: the orders you receive, accept, reject or hand over, and what our team noted while reviewing your stall or handling a support case.</li>
        <li><b>Technical data</b>: as for customers, IP address, device information and server logs.</li>
      </ul>

      <h3>Why we use it</h3>
      <ul>
        <li>To check your stall before customers can see it: we may call your number and check your FSSAI number with the Food Safety and Standards Authority of India.</li>
        <li>To show your storefront to customers and send you their orders.</li>
        <li>To pay you for your orders, and to make refunds to your customers.</li>
        <li>To meet legal duties, such as food-safety rules for online food sales and tax reporting.</li>
        <li>To prevent fraud and abuse, and to help you when you contact support.</li>
      </ul>

      <h3>What customers and others see</h3>
      <ul>
        <li><b>Anyone with your store link or QR code</b>: your storefront, address and map point, menu and opening hours.</li>
        <li><b>Customers who have paid for an order</b>: your mobile number as well, so they can call you about it.</li>
        <li><b>Your FSSAI number</b> is shown on your storefront, as food-safety rules for online food sales require.</li>
        <li><b>Not shown to customers</b>: your PAN and payout details. In the vendor app they are shown masked (for example AB•••••34F), and only our team can see them in full.</li>
      </ul>

      <h3>Who we share vendor data with</h3>
      <ul>
        <li><b>Our payment partner</b>: your PAN and payout details, to set you up for payouts and send you your money.</li>
        <li><b>WhatsApp (Meta Platforms)</b>: your mobile number and the sign-in code.</li>
        <li><b>Our hosting providers</b>, who store data for us under contract.</li>
        <li><b>Authorities</b>, when the law requires it, for example food-safety or tax authorities.</li>
      </ul>
      <p>We do not sell vendor data or use it for advertising by others.</p>

      <h3>Customer details you receive</h3>
      <p>
        You see each customer&apos;s name and mobile number so that you can prepare and hand over their order. Use them only for that
        order: don&apos;t save them for marketing, share them, or contact customers for anything else.
      </p>

      <h3>How long we keep vendor data</h3>
      <p>
        We keep your details while your stall is on {LEGAL.brand}. If you ask us to close your stall, we stop showing it straight
        away and delete your licence, PAN and payout details within <Fill field="vendorDeletionDays" /> days, except the order,
        payout and tax records that the law requires us to keep, which we delete when that period ends.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to see the personal data we hold about you, correct it, have it erased (except records the law makes us
        keep), withdraw your consent, or nominate someone to act for you. Write to our grievance officer,{' '}
        <Fill field="grievanceOfficer" />, at <Fill field="grievanceEmail" />. We aim to reply within 7 days. If you are not
        satisfied, you can complain to the Data Protection Board of India.
      </p>

      <h2>Security</h2>
      <p>
        Data is sent over encrypted connections, sign-in uses one-time codes with limits on retries, and access to stored data
        is restricted to the people who need it. Vendors&apos; licence, PAN and payout details are stored apart from their storefront
        and are never sent to customers.
      </p>

      <h2>Children</h2>
      <p>{LEGAL.brand} is not meant for children under 18 without a parent&apos;s or guardian&apos;s permission.</p>

      <h2>Changes and contact</h2>
      <p>
        We will update the date at the top when this policy changes. Questions: <Fill field="email" />, or see{' '}
        <Link href="/contact">Contact us</Link>.
      </p>
    </LegalPage>
  );
}
