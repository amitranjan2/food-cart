import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { choosePlan, getBilling, type Billing, type VendorInvoice, type VendorPlan } from '../../api/billing';
import { isAuthFailure } from '../../api/client';
import { ErrorState } from '../../components/ErrorState';
import { Header } from '../../components/Header';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';
import type { OrdersStackParamList } from '../../navigation/types';
import { Badge, Card, ConfirmDialog, Icon, PageHeading, SectionHeading, Sheet } from '../../ui';
import { rupees } from '../../utils/format';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Billing'>;

const NAMES: Record<VendorPlan, string> = { DAILY: 'Daily', MONTHLY: 'Monthly', YEARLY: 'Yearly' };
const PITCH: Record<VendorPlan, string> = {
  DAILY: 'Pay only on days you sell: a day counts when at least one customer pays for an order.',
  MONTHLY: 'One price for the month, however many days you sell.',
  YEARLY: 'Best value: 12 months for the price of 10. Paid up front; you stay on it for the year.',
};

function day(iso: string) {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** The stall's plan, this month so far, and our invoices to it (tracker S4.24). */
export function BillingScreen({ navigation }: Props) {
  const { token, vendor, logout } = useAuth();
  const [billing, setBilling] = useState<Billing | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<VendorPlan | null>(null);
  const [open, setOpen] = useState<VendorInvoice | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      setBilling(await getBilling(token));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not load billing');
    }
  }, [token, logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function pick(plan: VendorPlan) {
    if (!token) return;
    try {
      setBusy(true);
      setError('');
      setBilling(await choosePlan(token, plan));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change your plan');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  if (!vendor) return null;
  const gst = billing ? `+ ${billing.gstPercent}% GST` : '';
  const upcoming = billing ? billing.next?.plan ?? billing.plan : 'DAILY';
  const priceOf = (plan: VendorPlan) => billing?.plans.find(entry => entry.plan === plan);

  return (
    <Screen>
      <StatusBar style="light" />
      <Header title={vendor.name || 'Your stall'} onBack={() => navigation.goBack()} />
      {!billing ? (
        error ? <ErrorState message={error} /> : <LoadingState message="Loading billing…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <PageHeading overline="STORE · BILLING" title="Plan and billing" />
          {!billing.billingOn ? (
            <Card style={styles.notice}>
              <Text style={typography.bodyStrong}>No charges yet</Text>
              <Text style={typography.small}>Billing starts when Supr-Mama launches. Pick the plan you want now.</Text>
            </Card>
          ) : null}
          {billing.due > 0 ? (
            <Card style={[styles.notice, styles.dueCard]}>
              <Text style={typography.heading}>{rupees(billing.due)} to pay</Text>
              <Text style={typography.small}>
                {billing.payToUpi ? `Pay by UPI to ${billing.payToUpi} and add the invoice number in the note.` : 'Our team will tell you how to pay.'} We usually
                take it from your payouts once they start.
              </Text>
            </Card>
          ) : null}

          <Card>
            <Text style={typography.overline}>YOUR PLAN</Text>
            <Text style={typography.title}>
              {NAMES[billing.plan]} · {rupees(priceOf(billing.plan)?.price ?? 0)} per {priceOf(billing.plan)?.per} <Text style={typography.caption}>{gst}</Text>
            </Text>
            {billing.plan === 'DAILY' && billing.daysThisMonth !== undefined ? (
              <Text style={typography.small}>
                This month so far: {billing.daysThisMonth} {billing.daysThisMonth === 1 ? 'day' : 'days'} · {rupees(billing.thisMonthSoFar ?? 0)} {gst}. Billed after the month ends.
              </Text>
            ) : null}
            {billing.yearlyUntil ? <Text style={typography.small}>Paid for the year up to {day(billing.yearlyUntil)}.</Text> : null}
            {billing.next ? (
              <View style={styles.inline}>
                <Icon name="checkCircle" size={16} color={colors.success} />
                <Text style={[typography.small, styles.flex]}>Switching to {NAMES[billing.next.plan]} from {day(billing.next.from)}.</Text>
              </View>
            ) : null}
          </Card>

          <SectionHeading title="Plans" />
          <Text style={[typography.small, styles.hint]}>A new plan starts on {day(billing.earliestSwitch)}. Prices {gst}.</Text>
          {billing.plans.map(entry => {
            const on = upcoming === entry.plan;
            return (
              <Pressable
                key={entry.plan}
                accessibilityRole="radio"
                accessibilityState={{ checked: on, disabled: busy }}
                accessibilityLabel={`${NAMES[entry.plan]} plan`}
                disabled={busy || on}
                onPress={() => (entry.plan === 'YEARLY' ? setConfirm('YEARLY') : pick(entry.plan))}
                style={[styles.plan, on && styles.planOn]}
              >
                <View style={styles.planHead}>
                  <Text style={typography.heading}>{NAMES[entry.plan]}</Text>
                  {on ? <Badge label={billing.next?.plan === entry.plan ? 'From ' + day(billing.next.from) : 'Current'} tone="primary" /> : null}
                </View>
                <Text style={typography.title}>
                  {rupees(entry.price)} <Text style={typography.caption}>per {entry.per}</Text>
                </Text>
                <Text style={typography.small}>{PITCH[entry.plan]}</Text>
              </Pressable>
            );
          })}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <SectionHeading title="Invoices" />
          {billing.invoices.length === 0 ? <Text style={typography.small}>No invoices yet.</Text> : null}
          {billing.invoices.map(inv => (
            <Pressable key={inv.number} accessibilityRole="button" onPress={() => setOpen(inv)} style={styles.invoice}>
              <View style={styles.flex}>
                <Text style={typography.bodyStrong}>{NAMES[inv.plan]} · {day(inv.periodStart)} – {day(inv.periodEnd)}</Text>
                <Text style={typography.caption}>{inv.number}</Text>
              </View>
              <View style={styles.right}>
                <Text style={typography.bodyStrong}>{rupees(inv.total)}</Text>
                <Badge label={inv.status === 'PAID' ? 'Paid' : `Due ${day(inv.dueOn)}`} tone={inv.status === 'PAID' ? 'success' : 'warning'} />
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {confirm === 'YEARLY' && billing ? (
        <ConfirmDialog
          title="Switch to Yearly?"
          message={`${rupees(priceOf('YEARLY')?.price ?? 0)} ${gst} is billed on ${day(billing.earliestSwitch)} for 12 months. You can't switch plans until those months end.`}
          confirmLabel="Choose Yearly"
          onCancel={() => setConfirm(null)}
          onConfirm={() => pick('YEARLY')}
          busy={busy}
        />
      ) : null}
      {open ? (
        <Sheet title={`Invoice ${open.number}`} hint={`Tax invoice from Supr-Mama for your ${NAMES[open.plan].toLowerCase()} plan.`} onClose={() => setOpen(null)}>
          {billing?.seller ? (
            <Text style={[typography.caption, styles.seller]}>
              From {billing.seller.name}, {billing.seller.address}. GSTIN {billing.seller.gstin ?? 'to be added'}
              {billing.seller.sac ? ` · SAC ${billing.seller.sac}` : ''}.
            </Text>
          ) : null}
          <Row label="Period" value={`${day(open.periodStart)} – ${day(open.periodEnd)}`} />
          {open.plan === 'DAILY' ? <Row label="Days charged" value={`${open.units} × ${rupees(open.unitPrice)}`} /> : null}
          {open.chargeDays?.length ? <Text style={typography.caption}>{open.chargeDays.map(d => day(d)).join(', ')}</Text> : null}
          <Row label="Taxable value" value={rupees(open.taxable)} />
          <Row label={`CGST ${open.gstPercent / 2}%`} value={rupees(open.cgst)} />
          <Row label={`SGST ${open.gstPercent / 2}%`} value={rupees(open.sgst)} />
          <Row label="Total" value={rupees(open.total)} strong />
          {open.vendorGstin ? <Row label="Your GSTIN" value={open.vendorGstin} /> : null}
          <Row label="Issued" value={day(open.issuedAt)} />
          <Row label={open.status === 'PAID' ? 'Paid' : 'Due by'} value={open.status === 'PAID' ? `${day(open.paidAt ?? open.issuedAt)} · ${open.paymentRef ?? ''}` : day(open.dueOn)} />
        </Sheet>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={strong ? typography.heading : typography.body}>{label}</Text>
      <Text style={strong ? typography.heading : typography.bodyStrong}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.gutter,
    paddingBottom: 60,
    gap: 10,
  },
  notice: {
    gap: 4,
  },
  dueCard: {
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  hint: {
    marginTop: -6,
  },
  plan: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    padding: 14,
    gap: 4,
  },
  planOn: {
    borderColor: colors.primary,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seller: { marginBottom: spacing.sm },
  invoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 12,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
