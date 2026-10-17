import type { Metadata } from 'next';
import { Fill, LegalPage } from '../components/LegalPage';
import { LEGAL } from '../lib/legal';

export const metadata: Metadata = { title: 'Contact us · ' + LEGAL.brand };

export default function Contact() {
  return (
    <LegalPage title="Contact us">
      <h2>About an order</h2>
      <p>
        For anything about food you are collecting now, call the stall: its number is on your order page. For payments,
        refunds or anything else, contact us and include your order number and the stall&apos;s name.
      </p>

      <h2>Support</h2>
      <dl className="legal-contact">
        <dt>Email</dt><dd><Fill field="email" /></dd>
        <dt>Phone</dt><dd><Fill field="phone" /></dd>
        <dt>Hours</dt><dd><Fill field="hours" /></dd>
      </dl>

      <h2>Company</h2>
      <dl className="legal-contact">
        <dt>Name</dt><dd><Fill field="company" /></dd>
        <dt>Address</dt><dd><Fill field="address" /></dd>
      </dl>

      <h2>Grievance officer</h2>
      <p>For complaints you could not resolve with support, or about your personal data:</p>
      <dl className="legal-contact">
        <dt>Name</dt><dd><Fill field="grievanceOfficer" /></dd>
        <dt>Email</dt><dd><Fill field="grievanceEmail" /></dd>
      </dl>
      <p>We acknowledge complaints within 48 hours and aim to resolve them within 15 days.</p>
    </LegalPage>
  );
}
