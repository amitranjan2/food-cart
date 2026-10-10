import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { reverseGeocode, searchPlaces, type Place } from '../../api/vendor';
import { colors } from '../../theme';
import type { VendorLocation } from '../../types';
import { FrameModal } from '../../components/FrameModal';

type Point = { lat: number; lng: number; accuracy?: number; fromSearch?: boolean };

/**
 * Two steps, like the storefront's delivery address: 1) find the stall on the map (GPS at the stall, or search the
 * area); 2) add shop number and landmark. The point is what customers' "Directions" opens.
 */
export function LocationSheet({
  token,
  initial,
  onDone,
  onClose,
}: {
  token: string;
  initial?: VendorLocation | null;
  onDone: (location: VendorLocation) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<'find' | 'details'>('find');
  const [point, setPoint] = useState<Point | null>(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [area, setArea] = useState(initial?.area ?? '');
  const [shop, setShop] = useState(initial?.shop ?? '');
  const [landmark, setLandmark] = useState(initial?.landmark ?? '');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      searchPlaces(token, text)
        .then(found => active && setResults(found))
        .catch(e => active && setNote(e instanceof Error ? e.message : 'Search failed'));
    }, 600);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, token]);

  async function useCurrentLocation() {
    setBusy(true);
    setNote('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setNote('Location permission is off. Allow it in settings, or search for your area below.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const found = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy ?? undefined };
      setPoint(found);
      try {
        setArea((await reverseGeocode(token, found.lat, found.lng)).area);
      } catch (e) {
        setNote(e instanceof Error ? e.message : 'Could not name this place. Type the area on the next step.');
      }
    } catch {
      setNote('Could not get your location. Search for your area below.');
    } finally {
      setBusy(false);
    }
  }

  function pick(place: Place) {
    setPoint({ lat: place.lat, lng: place.lng, fromSearch: true });
    setArea(place.area);
    setQuery('');
    setResults([]);
    setNote('');
  }

  const mapUrl = point ? `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}` : '';

  return (
    <FrameModal onRequestClose={onClose}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          {step === 'details' ? (
            <Pressable onPress={() => setStep('find')} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
              <Text style={styles.back}>←</Text>
            </Pressable>
          ) : null}
          <Text style={styles.title}>{step === 'find' ? 'Stall location' : 'Stall address'}</Text>
        </View>

        {step === 'find' ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <Text style={styles.hint}>Stand at your stall and use your current location, so customers&apos; directions lead to the right spot.</Text>
            <Pressable disabled={busy} onPress={useCurrentLocation} style={[styles.primary, busy && styles.disabled]} accessibilityRole="button">
              {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryLabel}>📍 Use current location</Text>}
            </Pressable>
            <Text style={styles.or}>or search your area</Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. Sector 29 market, Gurugram"
              placeholderTextColor="#8aa0b2"
              style={styles.input}
              accessibilityLabel="Search area"
            />
            {results.map((place, index) => (
              <Pressable key={index} onPress={() => pick(place)} style={styles.result} accessibilityRole="button">
                <Text style={styles.resultLabel}>{place.area}</Text>
              </Pressable>
            ))}
            {point ? (
              <View style={styles.found}>
                <Text style={styles.foundArea}>{area || 'Location set'}</Text>
                <Text style={styles.foundMeta}>
                  {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
                  {point.accuracy ? ` · accurate to about ${Math.round(point.accuracy)} m` : ''}
                </Text>
                {point.fromSearch ? <Text style={styles.warn}>This is the area&apos;s centre, not your stall. Use current location at the stall for the exact spot.</Text> : null}
                <Pressable onPress={() => Linking.openURL(mapUrl)} accessibilityRole="link">
                  <Text style={styles.link}>Check on map ↗</Text>
                </Pressable>
              </View>
            ) : null}
            {note ? <Text style={styles.note}>{note}</Text> : null}
            <Pressable disabled={!point} onPress={() => setStep('details')} style={[styles.primary, !point && styles.disabled]} accessibilityRole="button">
              <Text style={styles.primaryLabel}>Next</Text>
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            <TextInput value={shop} onChangeText={setShop} placeholder="Shop / stall number (optional)" placeholderTextColor="#8aa0b2" maxLength={60} style={styles.input} />
            <TextInput value={landmark} onChangeText={setLandmark} placeholder="Landmark, e.g. Near City Mall gate 2 (optional)" placeholderTextColor="#8aa0b2" maxLength={80} style={styles.input} />
            <TextInput value={area} onChangeText={setArea} placeholder="Street, area and city" placeholderTextColor="#8aa0b2" maxLength={160} style={styles.input} multiline />
            <Text style={styles.hint}>Customers see: {[shop, landmark, area].map(part => part.trim()).filter(Boolean).join(', ') || '…'}</Text>
            <Pressable
              disabled={!point || !area.trim()}
              onPress={() => point && onDone({ lat: point.lat, lng: point.lng, shop: shop.trim(), landmark: landmark.trim(), area: area.trim() })}
              style={[styles.primary, (!point || !area.trim()) && styles.disabled]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryLabel}>Use this address</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </FrameModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88%',
    backgroundColor: colors.page,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 18,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
  },
  back: {
    color: colors.title,
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    color: colors.title,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    padding: 18,
    gap: 10,
  },
  hint: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  primary: {
    backgroundColor: colors.header,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
  or: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.title,
  },
  result: {
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultLabel: {
    color: colors.title,
    fontSize: 13,
  },
  found: {
    backgroundColor: '#E7F3FC',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  foundArea: {
    color: colors.title,
    fontSize: 15,
    fontWeight: '800',
  },
  foundMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  warn: {
    color: '#b54708',
    fontSize: 12,
    fontWeight: '600',
  },
  link: {
    color: '#2F6BFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  note: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
