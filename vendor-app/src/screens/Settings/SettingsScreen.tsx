import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getThemes, putVendorHours, putVendorProfile } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { Header } from '../../components/Header';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
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

  return (
    <Screen>
      <StatusBar style="light" />
      <Header
        title={name.trim() || vendor.name}
        left={
          <Pressable onPress={() => navigation.goBack()} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.backLabel}>←</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>STORE · PROFILE</Text>
        <Text style={styles.title}>Your storefront</Text>

        <Text style={styles.section}>Business name</Text>
        <View style={styles.card}>
          <TextInput value={name} onChangeText={setName} maxLength={60} placeholder="Business name" placeholderTextColor="#8aa0b2" style={styles.input} accessibilityLabel="Business name" />
          <Text style={styles.hint}>Shown at the top of your storefront and on customers&apos; orders.</Text>
        </View>

        <Text style={styles.section}>Location</Text>
        <View style={styles.card}>
          {location ? (
            <>
              <Text style={styles.address}>{addressOf(location)}</Text>
              <Text style={styles.hint}>📍 Directions point set ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</Text>
            </>
          ) : (
            <>
              {vendor.address ? <Text style={styles.address}>{vendor.address}</Text> : null}
              <Text style={styles.warning}>No map location yet: customers can&apos;t get directions to your stall.</Text>
            </>
          )}
          <Pressable onPress={() => setLocating(true)} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryLabel}>{location ? 'Change location' : 'Set location'}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>Colours</Text>
        <View style={styles.card}>
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
        </View>

        <Text style={styles.section}>Description</Text>
        <View style={styles.card}>
          <TextInput
            value={description}
            onChangeText={setDescription}
            maxLength={160}
            multiline
            placeholder="e.g. Hand-folded momos and street-food favourites"
            placeholderTextColor="#8aa0b2"
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Description"
          />
        </View>

        <Text style={styles.section}>Opening hours</Text>
        <Text style={[styles.hint, styles.sectionHint]}>
          Tap the pencil to change a day: set times, remove slots or add one below the last, between 00:00 and 24:00. To stay open past
          midnight, add a slot from 00:00 on the next day. The copy button repeats a day&apos;s hours on other days. Customers pick
          30-minute pickup times inside these slots.
        </Text>
        {noHours ? <Text style={[styles.warning, styles.sectionHint]}>Not set yet: customers can&apos;t order until you add and save your hours.</Text> : null}
        <HoursEditor week={week} onChange={setWeek} />
      </ScrollView>

      <View style={styles.saveBar}>
        {message ? <Text style={message.failed ? styles.saveError : styles.saveOk}>{message.text}</Text> : null}
        <Pressable
          disabled={busy || (!profileChanged && !hoursChanged)}
          onPress={save}
          style={[styles.save, (busy || (!profileChanged && !hoursChanged)) && styles.disabled]}
          accessibilityRole="button"
        >
          <Text style={styles.saveLabel}>{busy ? 'Saving…' : profileChanged || hoursChanged ? 'Save changes' : 'All changes saved'}</Text>
        </Pressable>
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
  back: {
    minWidth: 36,
  },
  backLabel: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    padding: 13,
    paddingBottom: 120,
  },
  kicker: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.muted,
  },
  title: {
    marginTop: 4,
    marginBottom: 6,
    fontSize: 24,
    fontWeight: '700',
    color: colors.title,
    letterSpacing: -1,
  },
  section: {
    marginTop: 16,
    marginBottom: 8,
    color: colors.title,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionHint: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  input: {
    backgroundColor: '#F4F8FB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.title,
  },
  multiline: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  warning: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  address: {
    color: colors.title,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  secondary: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.header,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryLabel: {
    color: colors.header,
    fontSize: 12,
    fontWeight: '700',
  },
  preview: {
    borderRadius: 14,
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
    backgroundColor: colors.white,
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
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  previewCart: {
    borderRadius: 999,
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
    backgroundColor: colors.page,
    borderTopWidth: 1,
    borderTopColor: '#c9dcee',
  },
  save: {
    backgroundColor: colors.header,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  saveLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  saveOk: {
    color: colors.onText,
    fontSize: 12,
    fontWeight: '700',
  },
  saveError: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
});
