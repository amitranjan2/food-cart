import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getThemes, putVendorHours, putVendorProfile } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';
import { Button, Card, Field, Icon, PageHeading, SectionHeading } from '../../ui';
import type { StoreTheme, VendorLocation } from '../../types';
import { fromWeek, sameWeek, toWeek } from '../../utils/hours';
import type { OrdersStackParamList } from '../../navigation/types';
import { HoursEditor } from './HoursEditor';
import { LocationSheet } from './LocationSheet';
import { ThemePicker } from './ThemePicker';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Settings'>;

function addressOf(location: VendorLocation | null | undefined) {
  if (!location) return '';
  return [location.shop, location.landmark, location.area].map(part => part?.trim()).filter(Boolean).join(', ');
}

/** The vendor's profile: business name, stall location, storefront colours, description and opening hours. */
export function SettingsScreen({ navigation }: Props) {
  const { token, vendor, setVendor, logout } = useAuth();
  const [themes, setThemes] = useState<StoreTheme[]>([]);
  const [name, setName] = useState(vendor?.name ?? '');
  const [description, setDescription] = useState(vendor?.description ?? '');
  const [theme, setTheme] = useState(vendor?.theme ?? 'SKY');
  const [location, setLocation] = useState<VendorLocation | null>(vendor?.location ?? null);
  const savedWeek = useMemo(() => toWeek(vendor?.openingHours), [vendor?.openingHours]);
  const [week, setWeek] = useState(savedWeek);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; failed: boolean } | null>(null);

  useEffect(() => {
    if (!token) return;
    getThemes(token).then(setThemes).catch(() => setThemes([]));
  }, [token]);

  if (!vendor || !token) return null;

  const profileChanged =
    name.trim() !== vendor.name ||
    description.trim() !== (vendor.description ?? '') ||
    theme !== (vendor.theme ?? 'SKY') ||
    JSON.stringify(location) !== JSON.stringify(vendor.location ?? null);
  const hoursChanged = !sameWeek(week, savedWeek);
  const chosen = themes.find(entry => entry.key === theme) ?? themes[0];
  const noHours = fromWeek(week).length === 0;

  async function save() {
    if (!token) return;
    setBusy(true);
    setMessage(null);
    try {
      let saved = vendor;
      if (profileChanged) saved = await putVendorProfile(token, { name: name.trim(), description: description.trim(), theme, location });
      if (hoursChanged) saved = await putVendorHours(token, fromWeek(week));
      if (saved) {
        setVendor(saved);
        // Take back what the server stored (tidied name, rounded coordinates) so the form shows no unsaved changes.
        setName(saved.name);
        setDescription(saved.description ?? '');
        setTheme(saved.theme ?? 'SKY');
        setLocation(saved.location ?? null);
        setWeek(toWeek(saved.openingHours));
      }
      setMessage({ text: 'Saved. Your storefront shows the changes now.', failed: false });
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setMessage({ text: e instanceof Error ? e.message : 'Could not save', failed: true });
    } finally {
      setBusy(false);
    }
  }

  const dirty = profileChanged || hoursChanged;

  return (
    <Screen>
      <StatusBar style="light" />
      <Header title={name.trim() || vendor.name} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <PageHeading overline="STORE · PROFILE" title="Your storefront" />

        <SectionHeading title="Business name" />
        <Card>
          <Field value={name} onChangeText={setName} maxLength={60} placeholder="Business name" accessibilityLabel="Business name" />
          <Text style={typography.caption}>Shown at the top of your storefront and on customers&apos; orders.</Text>
        </Card>

        <SectionHeading title="Location" />
        <Card>
          {location ? (
            <>
              <Text style={typography.bodyStrong}>{addressOf(location)}</Text>
              <View style={styles.inline}>
                <Icon name="pin" size={14} color={colors.success} />
                <Text style={typography.caption}>
                  Directions point set ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                </Text>
              </View>
            </>
          ) : (
            <>
              {vendor.address ? <Text style={typography.bodyStrong}>{vendor.address}</Text> : null}
              <Text style={styles.warning}>No map location yet: customers can&apos;t get directions to your stall.</Text>
            </>
          )}
          <Button label={location ? 'Change location' : 'Set location'} icon="pin" variant="secondary" size="sm" style={styles.start} onPress={() => setLocating(true)} />
        </Card>

        <SectionHeading title="Colours" />
        <Card>
          <ThemePicker themes={themes} value={theme} onChange={setTheme} />
          {chosen ? (
            <View style={[styles.preview, { backgroundColor: chosen.light }]} accessibilityLabel="Storefront preview">
              <Text style={[styles.previewName, { color: chosen.dark }]} numberOfLines={1}>{name.trim() || 'Your business'}</Text>
              <View style={styles.previewRow}>
                <View style={styles.previewCard}>
                  <View style={[styles.previewPhoto, { backgroundColor: chosen.light }]} />
                  <View style={[styles.previewAdd, { backgroundColor: chosen.dark }]}>
                    <Text style={styles.previewAddLabel}>ADD</Text>
                  </View>
                </View>
                <View style={[styles.previewCart, { backgroundColor: chosen.dark }]}>
                  <Text style={styles.previewAddLabel}>View cart</Text>
                </View>
              </View>
            </View>
          ) : null}
        </Card>

        <SectionHeading title="Description" />
        <Card>
          <Field
            value={description}
            onChangeText={setDescription}
            maxLength={160}
            multiline
            placeholder="e.g. Hand-folded momos and street-food favourites"
            style={styles.multiline}
            accessibilityLabel="Description"
          />
        </Card>

        <SectionHeading title="Opening hours" />
        <Text style={[typography.small, styles.sectionHint]}>
          Tap the pencil to change a day: set times, remove slots or add one below the last, between 00:00 and 24:00. To stay open past
          midnight, add a slot from 00:00 on the next day. The copy button repeats a day&apos;s hours on other days. Customers pick
          30-minute pickup times inside these slots.
        </Text>
        {noHours ? <Text style={[styles.warning, styles.sectionHint]}>Not set yet: customers can&apos;t order until you add and save your hours.</Text> : null}
        <HoursEditor week={week} onChange={setWeek} />
      </ScrollView>

      <View style={styles.saveBar}>
        {message ? <Text style={message.failed ? styles.saveError : styles.saveOk}>{message.text}</Text> : null}
        <Button label={busy ? 'Saving…' : dirty ? 'Save changes' : 'All changes saved'} busy={busy} disabled={!dirty} onPress={save} />
      </View>

      {locating ? (
        <LocationSheet
          token={token}
          initial={location}
          onClose={() => setLocating(false)}
          onDone={next => {
            setLocation(next);
            setLocating(false);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.gutter,
    paddingBottom: 120,
  },
  sectionHint: {
    marginBottom: 8,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  start: {
    alignSelf: 'flex-start',
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  warning: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  preview: {
    borderRadius: radius.md,
    padding: 12,
    gap: 10,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '800',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  previewCard: {
    width: 90,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 6,
    gap: 6,
  },
  previewPhoto: {
    height: 36,
    borderRadius: 6,
  },
  previewAdd: {
    alignSelf: 'flex-end',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  previewAddLabel: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  previewCart: {
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
