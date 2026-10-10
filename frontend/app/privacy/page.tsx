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

      <h2>What we collect</h2>
      <ul>
        <li><b>Mobile number</b>: to sign you in with a one-time code sent on WhatsApp, and to let the vendor call you about your order.</li>
        <li><b>Name</b>: shown to the vendor so they can hand your order to you.</li>
        <li><b>Orders</b>: the vendor, dishes and options, Pick Up or Dine In, time slot, amount, status and handover details.</li>
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
        <li>To prevent fraud and abuse, for example by limiting how often codes can be requested.</li>
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
        is restricted to the people who need it.
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
