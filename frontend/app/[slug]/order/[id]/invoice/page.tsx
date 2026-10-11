'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { request } from '../../../../lib/api';
import { LEGAL } from '../../../../lib/legal';
import { storedSession } from '../../../../lib/session';
import { Fill } from '../../../../components/LegalPage';
import { formatRupee } from '../../../lib/customization';

type Money = number | string;
type InvoiceView = {
  orderNumber: number;
  issuedAt: string;
  foodNumber: string;
  /** null when there were no platform charges (paid at the stall). */
  platformNumber: string | null;
  paidAtStall?: boolean;
  customer: { name: string; mobile: string };
  vendor?: { name: string; address?: string | null; fssai?: string | null };
  items: { name: string; quantity: number; price: Money; lineTotal: Money }[];
  bill: { itemTotal: Money; foodGst: Money; platformFee: Money; platformFeeGst: Money; total: Money; foodGstPercent: Money; platformFeePercent: Money; platformFeeGstPercent: Money };
  taxSplit: { foodCgst: Money; foodSgst: Money; platformCgst: Money; platformSgst: Money };
};

const rupee = (value: Money) => formatRupee(Number(value));
const half = (percent: Money) => `${Number(percent) / 2}%`;

/**
 * The customer's two tax invoices for a handed-over order: the food (supplied by the stall through us; GST paid by us
 * as e-commerce operator under s.9(5)) and our platform charges. Printable.
 */
export default function Invoice({ params }: { params: { slug: string; id: string } }) {
  const [invoice, setInvoice] = useState<InvoiceView>();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = storedSession();
    if (!token) {
      setError('Sign in on this phone to see your invoice.');
      return;
    }
    request<InvoiceView>(`/api/orders/${encodeURIComponent(params.id)}/invoice`, {}, token)
      .then(setInvoice)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load the invoice'));
  }, [params.id]);

  const date = invoice ? new Date(invoice.issuedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const operator = (
    <>
      <b><Fill field="company" /></b> ({LEGAL.brand}), <Fill field="address" />. GSTIN <Fill field="gstin" />.
    </>
  );

  return (
    <main className="invoice-page">
      <div className="invoice-tools">
        <Link href={`/${params.slug}/order/${params.id}`}>← Back to order</Link>
        {invoice ? <button type="button" onClick={() => window.print()}>Print or save as PDF</button> : null}
      </div>
      {error ? <p className="invoice-error">{error}</p> : !invoice ? <p className="invoice-error">Loading…</p> : (
        <>
          <article className="invoice" aria-label="Tax invoice for food">
            <header>
              <h1>Tax invoice</h1>
              <p>Restaurant service supplied through an e-commerce operator</p>
            </header>
            <dl className="invoice-meta">
              <dt>Invoice no.</dt><dd>{invoice.foodNumber}</dd>
              <dt>Date</dt><dd>{date}</dd>
              <dt>Order</dt><dd>#{invoice.orderNumber}</dd>
              <dt>Place of supply</dt><dd><Fill field="gstState" /></dd>
            </dl>
            <section className="invoice-parties">
              <div>
                <h2>Supplier</h2>
                <p><b>{invoice.vendor?.name}</b>{invoice.vendor?.address ? `, ${invoice.vendor.address}` : ''}</p>
                {invoice.vendor?.fssai ? <p>FSSAI {invoice.vendor.fssai}</p> : null}
              </div>
              <div>
                <h2>Billed to</h2>
                <p><b>{invoice.customer.name || 'Customer'}</b>, {invoice.customer.mobile}</p>
              </div>
            </section>
            <p className="invoice-note">E-commerce operator: {operator} GST on this supply is paid by the e-commerce operator under section 9(5) of the CGST Act, 2017.</p>
            <table>
              <thead><tr><th>Item (SAC 996331)</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index}><td>{item.name}</td><td>{item.quantity}</td><td>{rupee(item.price)}</td><td>{rupee(item.lineTotal)}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Taxable value</td><td>{rupee(invoice.bill.itemTotal)}</td></tr>
                <tr><td colSpan={3}>CGST {half(invoice.bill.foodGstPercent)}</td><td>{rupee(invoice.taxSplit.foodCgst)}</td></tr>
                <tr><td colSpan={3}>SGST {half(invoice.bill.foodGstPercent)}</td><td>{rupee(invoice.taxSplit.foodSgst)}</td></tr>
                <tr className="grand"><td colSpan={3}>Total</td><td>{rupee(Number(invoice.bill.itemTotal) + Number(invoice.bill.foodGst))}</td></tr>
              </tfoot>
            </table>
          </article>

          {invoice.platformNumber ? (
          <article className="invoice" aria-label="Tax invoice for platform charges">
            <header>
              <h1>Tax invoice</h1>
              <p>Platform charges</p>
            </header>
            <dl className="invoice-meta">
              <dt>Invoice no.</dt><dd>{invoice.platformNumber}</dd>
              <dt>Date</dt><dd>{date}</dd>
              <dt>Order</dt><dd>#{invoice.orderNumber}</dd>
              <dt>Place of supply</dt><dd><Fill field="gstState" /></dd>
            </dl>
            <section className="invoice-parties">
              <div><h2>Supplier</h2><p>{operator}</p></div>
              <div><h2>Billed to</h2><p><b>{invoice.customer.name || 'Customer'}</b>, {invoice.customer.mobile}</p></div>
            </section>
            <table>
              <thead><tr><th>Service (SAC <Fill field="platformChargesSac" />)</th><th /><th /><th>Amount</th></tr></thead>
              <tbody>
                <tr><td colSpan={3}>Platform charges: online payment ({Number(invoice.bill.platformFeePercent)}% of {rupee(Number(invoice.bill.itemTotal) + Number(invoice.bill.foodGst))})</td><td>{rupee(invoice.bill.platformFee)}</td></tr>
              </tbody>
              <tfoot>
                <tr><td colSpan={3}>Taxable value</td><td>{rupee(invoice.bill.platformFee)}</td></tr>
                <tr><td colSpan={3}>CGST {half(invoice.bill.platformFeeGstPercent)}</td><td>{rupee(invoice.taxSplit.platformCgst)}</td></tr>
                <tr><td colSpan={3}>SGST {half(invoice.bill.platformFeeGstPercent)}</td><td>{rupee(invoice.taxSplit.platformSgst)}</td></tr>
                <tr className="grand"><td colSpan={3}>Total</td><td>{rupee(Number(invoice.bill.platformFee) + Number(invoice.bill.platformFeeGst))}</td></tr>
              </tfoot>
            </table>
          </article>
          ) : null}

          <p className="invoice-paid">{invoice.paidAtStall ? 'Paid at the stall' : 'Paid online'}: <b>{rupee(invoice.bill.total)}</b> for order #{invoice.orderNumber}. This is a computer-generated invoice.</p>
        </>
      )}
    </main>
  );
}
