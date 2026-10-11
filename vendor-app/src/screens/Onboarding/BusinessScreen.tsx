import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getBusiness, putBusiness, type Business, type BusinessInput } from '../../api/onboarding';
import { isAuthFailure } from '../../api/client';
import { Header } from '../../components/Header';
import { LoadingState } from '../../components/LoadingState';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors, spacing, typography } from '../../theme';
import type { OrdersStackParamList } from '../../navigation/types';
import { Button, Card, Chip, Field, Icon, PageHeading, SectionHeading } from '../../ui';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Business'>;

/**
 * Licence and payout details. Saved PAN and account numbers come back masked, so they show as "saved" hints and a
 * field left empty keeps what is saved.
 */
export function BusinessScreen({ navigation }: Props) {
  const { token, vendor, logout } = useAuth();
  const [saved, setSaved] = useState<Business | null>(null);
  const [form, setForm] = useState<BusinessInput>({});
  const [method, setMethod] = useState<'UPI' | 'BANK' | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  useEffect(() => {
    if (!token) return;
    getBusiness(token)
      .then(found => {
        setSaved(found);
        setMethod(found.payoutMethod);
      })
      .catch(async e => {
        if (isAuthFailure(e)) await logout();
        else setMessage({ text: e instanceof Error ? e.message : 'Could not load', failed: true });
      });
  }, [token, logout]);

  const set = (key: keyof BusinessInput) => (value: string) => {
    setForm(current => ({ ...current, [key]: value }));
    setMessage(null);
  };
  const changed = Object.values(form).some(value => value && value.trim()) || (method !== null && method !== saved?.payoutMethod);

  async function save() {
    if (!token) return;
    try {
      setBusy(true);
      setMessage(null);
      const next = await putBusiness(token, { ...form, ...(method ? { payoutMethod: method } : {}) });
      setSaved(next);
      setForm({});
      setMessage({ text: next.complete ? 'Saved. Everything we need for payouts is here.' : 'Saved. Add the rest when you have it.', failed: false });
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setMessage({ text: e instanceof Error ? e.message : 'Could not save', failed: true });
    } finally {
      setBusy(false);
    }
  }

  if (!vendor) return null;
  const hint = (value: string | null | undefined, fallback: string) => (value ? `Saved: ${value}` : fallback);

  return (
    <Screen>
      <StatusBar style="light" />
      <Header title={vendor.name || 'Your stall'} onBack={() => navigation.goBack()} />
      {!saved ? (
        <LoadingState message="Loading…" />
      ) : (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <PageHeading overline="STORE · BUSINESS" title="Licence and payouts" />
          <View style={styles.privacy}>
            <Icon name="checkCircle" size={16} color={colors.success} />
            <Text style={[typography.caption, styles.flex]}>Only you and the Supr-Mama team see these. We use them to verify your stall and pay you.</Text>
          </View>

          <SectionHeading title="Food licence" />
          <Card>
            <Text style={typography.bodyStrong}>FSSAI registration or licence number</Text>
            <Field value={form.fssai ?? ''} onChangeText={set('fssai')} placeholder={hint(saved.fssai, '14 digits')} keyboardType="number-pad" maxLength={17} accessibilityLabel="FSSAI number" />
            <Text style={typography.caption}>Every food business in India needs one. Street vendors can get a basic registration at foscos.fssai.gov.in.</Text>
          </Card>

          <SectionHeading title="PAN" />
          <Card>
            <Field value={form.pan ?? ''} onChangeText={set('pan')} placeholder={hint(saved.pan, 'ABCDE1234F')} autoCapitalize="characters" maxLength={10} accessibilityLabel="PAN" />
            <Text style={typography.caption}>Yours, or the business&apos;s if it has one.</Text>
          </Card>

          <SectionHeading title="Where we pay you" />
          <Card>
            <View style={styles.methods}>
              <Chip label="UPI ID" selected={method === 'UPI'} accessibilityRole="radio" onPress={() => setMethod('UPI')} />
              <Chip label="Bank account" selected={method === 'BANK'} accessibilityRole="radio" onPress={() => setMethod('BANK')} />
            </View>
            {method === 'UPI' ? (
              <Field
                value={form.upiId ?? ''}
                onChangeText={set('upiId')}
                placeholder={hint(saved.payoutMethod === 'UPI' ? saved.upiId : null, 'name@bank')}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="UPI ID"
              />
            ) : method === 'BANK' ? (
              <>
                <Field value={form.accountName ?? ''} onChangeText={set('accountName')} placeholder={hint(saved.accountName, 'Account holder name')} accessibilityLabel="Account holder name" />
                <Field value={form.accountNumber ?? ''} onChangeText={set('accountNumber')} placeholder={hint(saved.accountNumber, 'Account number')} keyboardType="number-pad" maxLength={18} accessibilityLabel="Account number" />
                <Field value={form.ifsc ?? ''} onChangeText={set('ifsc')} placeholder={hint(saved.ifsc, 'IFSC, e.g. SBIN0001234')} autoCapitalize="characters" maxLength={11} accessibilityLabel="IFSC" />
              </>
            ) : (
              <Text style={typography.caption}>Pick how you want to receive your money.</Text>
            )}
            {method && saved.payoutMethod && method !== saved.payoutMethod ? (
              <Text style={styles.warning}>Saving replaces your {saved.payoutMethod === 'UPI' ? 'UPI ID' : 'bank account'}.</Text>
            ) : null}
          </Card>
        </ScrollView>
      )}
      <View style={styles.saveBar}>
        {message ? <Text style={message.failed ? styles.saveError : styles.saveOk}>{message.text}</Text> : null}
        <Button label={changed ? 'Save' : 'Nothing to save'} busy={busy} disabled={!changed} onPress={save} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.gutter,
    paddingBottom: 120,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flex: {
    flex: 1,
  },
  methods: {
    flexDirection: 'row',
    gap: 8,
  },
  warning: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 12,
    paddingBottom: 16,
    gap: 6,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  saveOk: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
  saveError: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
});
