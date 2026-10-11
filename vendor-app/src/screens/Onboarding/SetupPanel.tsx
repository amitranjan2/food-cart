import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getOnboarding, submitOnboarding, type OnboardingStatus, type OnboardingStep } from '../../api/onboarding';
import { getVendorMe } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';
import { Badge, Button, Card, Icon, PageHeading } from '../../ui';
import { BasicsSheet } from './BasicsSheet';

const ACTION: Record<OnboardingStep['key'], string> = {
  BASICS: 'Name, link and colours shown on your storefront.',
  LOCATION: 'Stand at your stall and drop the pin, so customers find you.',
  HOURS: 'When you take orders. Without hours, nobody can order.',
  DISHES: 'Add a few dishes with photos. You can keep adding later.',
  BUSINESS: 'FSSAI number, PAN and where we send your money.',
};

/**
 * What a stall sees until it is approved (in place of the Orders tab): the setup checklist, then "with our team" or
 * the team's note. Steps open the screens that already edit those things.
 */
export function SetupPanel({ onOpenSettings, onOpenMenu, onOpenBusiness }: { onOpenSettings: () => void; onOpenMenu: () => void; onOpenBusiness: () => void }) {
  const { token, setVendor, logout } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [basics, setBasics] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError('');
      const next = await getOnboarding(token);
      setStatus(next);
      // Approved while the app was open: refresh the vendor so the app switches to Orders.
      if (next.review === 'APPROVED') setVendor(await getVendorMe(token));
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not load your setup');
    }
  }, [token, setVendor, logout]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function submit() {
    if (!token) return;
    try {
      setBusy(true);
      setError('');
      setStatus(await submitOnboarding(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  }

  if (!status) return error ? <ErrorState message={error} /> : <LoadingState message="Loading your setup…" />;

  const open = (key: OnboardingStep['key']) => {
    if (key === 'BASICS') setBasics(true);
    else if (key === 'LOCATION' || key === 'HOURS') onOpenSettings();
    else if (key === 'DISHES') onOpenMenu();
    else onOpenBusiness();
  };
  const doneCount = status.steps.filter(step => step.done).length;
  const waiting = status.review === 'SUBMITTED';

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={styles.body}>
        <PageHeading overline={`SETUP · ${doneCount} OF ${status.steps.length} DONE`} title="Open your stall" />
        {waiting ? (
          <Card style={styles.notice}>
            <View style={styles.row}>
              <Icon name="checkCircle" size={22} color={colors.success} />
              <Text style={typography.heading}>With our team for review</Text>
            </View>
            <Text style={typography.small}>
              We check every new stall before customers can see it, usually within one working day. We&apos;ll call this number if
              anything is unclear. Meanwhile you can keep adding dishes.
            </Text>
          </Card>
        ) : status.review === 'CHANGES_NEEDED' ? (
          <Card style={[styles.notice, styles.changes]}>
            <Text style={typography.heading}>A few changes, please</Text>
            <Text style={typography.body}>{status.reviewNote}</Text>
            <Text style={typography.caption}>Fix this, then submit again below.</Text>
          </Card>
        ) : (
          <Text style={[typography.small, styles.intro]}>
            Finish the required steps and submit. Our team checks your stall, then customers can see it and order.
          </Text>
        )}

        {status.steps.map((step, index) => (
          <Card key={step.key} style={styles.step}>
            <View style={styles.row}>
              <View style={[styles.number, step.done && styles.numberDone]}>
                {step.done ? <Icon name="check" size={16} color={colors.onPrimary} /> : <Text style={styles.numberLabel}>{index + 1}</Text>}
              </View>
              <View style={styles.copy}>
                <Text style={typography.bodyStrong}>{step.label}</Text>
                <Text style={typography.caption}>{ACTION[step.key]}</Text>
              </View>
              <Badge label={step.done ? 'Done' : step.required ? 'Required' : 'Optional'} tone={step.done ? 'success' : step.required ? 'warning' : 'neutral'} />
            </View>
            <Button
              label={step.done ? 'Edit' : 'Start'}
              variant={step.done ? 'secondary' : 'primary'}
              size="sm"
              style={styles.start}
              onPress={() => open(step.key)}
              accessibilityLabel={`${step.done ? 'Edit' : 'Start'}: ${step.label}`}
            />
          </Card>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
      {waiting ? null : (
        <View style={styles.submitBar}>
          <Button
            label={status.review === 'CHANGES_NEEDED' ? 'Submit again' : 'Submit for review'}
            busy={busy}
            disabled={!status.ready}
            onPress={submit}
          />
          {!status.ready ? <Text style={[typography.caption, styles.center]}>Finish the required steps to submit.</Text> : null}
        </View>
      )}
      {basics ? (
        <BasicsSheet
          onClose={() => setBasics(false)}
          onSaved={() => {
            setBasics(false);
            load();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  body: {
    padding: spacing.gutter,
    paddingBottom: 170,
    gap: 10,
  },
  intro: {
    marginBottom: 2,
  },
  notice: {
    gap: 6,
  },
  changes: {
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  step: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberDone: {
    backgroundColor: colors.success,
  },
  numberLabel: {
    ...typography.bodyStrong,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  start: {
    alignSelf: 'flex-end',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  submitBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 76,
    paddingHorizontal: spacing.gutter,
    paddingVertical: 10,
    gap: 4,
    backgroundColor: colors.page,
  },
  center: {
    textAlign: 'center',
  },
});
