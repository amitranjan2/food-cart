import { createElement, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { putVendorProfile } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { Header } from '../../components/Header';
import { OpeningHoursCard } from './OpeningHoursCard';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
import type { OrdersStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OrdersStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const { token, vendor, setVendor, logout } = useAuth();
  const [name, setName] = useState(vendor?.name ?? '');
  const [address, setAddress] = useState(vendor?.address ?? '');
  const [description, setDescription] = useState(vendor?.description ?? '');
  const [themeColor, setThemeColor] = useState(vendor?.themeColor || '#102820');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!token || !vendor) return;
    try {
      setBusy(true);
      setMessage('');
      const saved = await putVendorProfile(token, {
        ...vendor,
        name: name.trim(),
        address: address.trim(),
        description: description.trim(),
        themeColor,
      });
      setVendor(saved);
      setMessage('Saved. Your ordering page updates immediately.');
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setMessage(e instanceof Error ? e.message : 'Could not save storefront');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <StatusBar style="light" />
      <Header
        title="Your storefront"
        left={
          <Pressable onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backLabel}>←</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.kicker}>CUSTOMISE YOUR PUBLIC PAGE</Text>
        <View style={styles.card}>
          <Text style={styles.label}>BUSINESS NAME</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
          <Text style={styles.label}>ADDRESS</Text>
          <TextInput value={address} onChangeText={setAddress} style={styles.input} />
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            style={[styles.input, styles.area]}
          />
          <Text style={styles.label}>BRAND COLOUR</Text>
          {Platform.OS === 'web' ? (
            createElement('input', {
              type: 'color',
              value: themeColor,
              onChange: (event: { target: { value: string } }) => setThemeColor(event.target.value),
              style: { width: '100%', height: 48, border: 'none', borderRadius: 8, background: '#fff' },
            })
          ) : (
            <TextInput
              value={themeColor}
              onChangeText={setThemeColor}
              autoCapitalize="none"
              style={styles.input}
            />
          )}
          <View style={[styles.preview, { backgroundColor: themeColor }]}>
            <Text style={styles.previewKicker}>LIVE PREVIEW</Text>
            <Text style={styles.previewName}>{name || 'Store name'}</Text>
            <Text style={styles.previewCopy}>{description}</Text>
          </View>
          <Pressable disabled={busy} onPress={save} style={styles.save}>
            <Text style={styles.saveLabel}>{busy ? 'SAVING…' : 'SAVE STOREFRONT'}</Text>
          </Pressable>
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>
        <OpeningHoursCard />
      </ScrollView>
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
    padding: 16,
    paddingBottom: 40,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.muted,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: colors.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.title,
  },
  area: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  preview: {
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
  },
  previewKicker: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  previewName: {
    marginTop: 8,
    color: colors.white,
    fontSize: 22,
    fontWeight: '700',
  },
  previewCopy: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  save: {
    marginTop: 8,
    backgroundColor: '#b6e34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveLabel: {
    color: '#1f2a16',
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '600',
  },
});
