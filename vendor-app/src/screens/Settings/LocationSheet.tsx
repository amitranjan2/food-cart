import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import * as Location from 'expo-location';
import { reverseGeocode, searchPlaces, type Place } from '../../api/vendor';
import { colors, radius, typography } from '../../theme';
import type { VendorLocation } from '../../types';
import { Button, Field, Icon, Panel, Sheet } from '../../ui';

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

  const address = [shop, landmark, area].map(part => part.trim()).filter(Boolean).join(', ');

  if (step === 'find') {
    return (
      <Sheet
        title="Stall location"
        hint="Stand at your stall and use your current location, so customers' directions lead to the right spot."
        onClose={onClose}
        footer={<Button label="Next" grow disabled={!point} onPress={() => setStep('details')} />}
      >
        <Button label="Use current location" icon="pin" busy={busy} onPress={useCurrentLocation} />
        <Text style={styles.or}>or search your area</Text>
        <Field value={query} onChangeText={setQuery} placeholder="e.g. Sector 29 market, Gurugram" accessibilityLabel="Search area" />
        {results.map((place, index) => (
          <Pressable key={index} onPress={() => pick(place)} style={styles.result} accessibilityRole="button">
            <Icon name="pin" size={16} color={colors.muted} />
            <Text style={[typography.body, styles.resultLabel]}>{place.area}</Text>
          </Pressable>
        ))}
        {point ? (
          <Panel>
            <Text style={typography.heading}>{area || 'Location set'}</Text>
            <Text style={typography.caption}>
              {point.lat.toFixed(5)}, {point.lng.toFixed(5)}
              {point.accuracy ? ` · accurate to about ${Math.round(point.accuracy)} m` : ''}
            </Text>
            {point.fromSearch ? <Text style={styles.warn}>This is the area&apos;s centre, not your stall. Use current location at the stall for the exact spot.</Text> : null}
            <Pressable onPress={() => Linking.openURL(mapUrl)} accessibilityRole="link" style={styles.linkRow}>
              <Text style={styles.link}>Check on map</Text>
              <Icon name="external" size={14} color={colors.link} />
            </Pressable>
          </Panel>
        ) : null}
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </Sheet>
    );
  }

  return (
    <Sheet
      title="Stall address"
      hint={`Customers see: ${address || '…'}`}
      onClose={onClose}
      onBack={() => setStep('find')}
      footer={
        <Button
          label="Use this address"
          grow
          disabled={!point || !area.trim()}
          onPress={() => point && onDone({ lat: point.lat, lng: point.lng, shop: shop.trim(), landmark: landmark.trim(), area: area.trim() })}
        />
      }
    >
      <Field value={shop} onChangeText={setShop} placeholder="Shop / stall number (optional)" maxLength={60} />
      <Field value={landmark} onChangeText={setLandmark} placeholder="Landmark, e.g. Near City Mall gate 2 (optional)" maxLength={80} />
      <Field value={area} onChangeText={setArea} placeholder="Street, area and city" maxLength={160} multiline />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  or: {
    ...typography.caption,
    textAlign: 'center',
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  resultLabel: {
    flex: 1,
  },
  warn: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: '600',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  link: {
    color: colors.link,
    fontSize: 13,
    fontWeight: '800',
  },
  note: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
