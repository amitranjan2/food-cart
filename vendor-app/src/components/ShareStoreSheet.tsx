import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getStoreShare, type StoreShare } from '../api/vendor';
import { colors } from '../theme';
import { FrameModal } from './FrameModal';

/** The store link and QR code, to send to regulars or print for the counter. */
export function ShareStoreSheet({ token, name, onClose }: { token: string; name: string; onClose: () => void }) {
  const [share, setShare] = useState<StoreShare | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    getStoreShare(token)
      .then(setShare)
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load your store link'));
  }, [token]);

  const canCopy = Platform.OS === 'web' && typeof navigator !== 'undefined' && !!navigator.clipboard;

  async function sendLink() {
    if (!share) return;
    const message = `Order from ${name} on Supr-Mama: ${share.storeUrl}`;
    try {
      if (canCopy) {
        await navigator.clipboard.writeText(share.storeUrl);
        setNote('Link copied.');
      } else {
        await Share.share({ message, url: share.storeUrl });
      }
    } catch {
      setNote('Could not share. Long-press the link to copy it.');
    }
  }

  return (
    <FrameModal onRequestClose={onClose}>
      <View style={styles.sheet}>
        <Text style={styles.title}>Share your store</Text>
        <Text style={styles.hint}>Customers scan the code or open the link to see your menu and order.</Text>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : !share ? (
          <ActivityIndicator color={colors.header} style={styles.loading} />
        ) : (
          <>
            <View style={styles.qr} accessibilityLabel={`QR code for ${share.storeUrl}`}>
              <SvgXml xml={share.qrSvg} width="100%" height="100%" />
            </View>
            <Text selectable style={styles.link}>{share.storeUrl.replace(/^https?:\/\//, '')}</Text>
            <View style={styles.actions}>
              <Pressable onPress={sendLink} style={styles.primary} accessibilityRole="button">
                <Text style={styles.primaryLabel}>{canCopy ? 'Copy link' : 'Share link'}</Text>
              </Pressable>
              <Pressable onPress={() => Linking.openURL(share.posterUrl)} style={styles.secondary} accessibilityRole="button">
                <Text style={styles.secondaryLabel}>Print poster</Text>
              </Pressable>
            </View>
            {note ? <Text style={styles.note}>{note}</Text> : null}
          </>
        )}
        <Pressable onPress={onClose} style={styles.close} accessibilityRole="button">
          <Text style={styles.closeLabel}>Close</Text>
        </Pressable>
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
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 10,
    alignItems: 'stretch',
  },
  title: {
    color: colors.title,
    fontSize: 18,
    fontWeight: '800',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  loading: {
    marginVertical: 60,
  },
  error: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '700',
  },
  qr: {
    alignSelf: 'center',
    width: 200,
    height: 200,
    marginVertical: 6,
  },
  link: {
    alignSelf: 'center',
    color: colors.header,
    fontSize: 15,
    fontWeight: '800',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.header,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  primaryLabel: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  secondary: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.header,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryLabel: {
    color: colors.header,
    fontSize: 14,
    fontWeight: '800',
  },
  note: {
    alignSelf: 'center',
    color: colors.onText,
    fontSize: 12,
    fontWeight: '700',
  },
  close: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
