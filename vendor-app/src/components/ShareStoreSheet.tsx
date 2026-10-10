import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Share, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { getStoreShare, type StoreShare } from '../api/vendor';
import { colors, radius, typography } from '../theme';
import { Button, Sheet } from '../ui';

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
    <Sheet
      title="Share your store"
      hint="Customers scan the code or open the link to see your menu and order."
      onClose={onClose}
      footer={
        share ? (
          <>
            <Button label={canCopy ? 'Copy link' : 'Share link'} grow onPress={sendLink} />
            <Button label="Print poster" variant="secondary" grow onPress={() => Linking.openURL(share.posterUrl)} />
          </>
        ) : undefined
      }
    >
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : !share ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : (
        <View style={styles.center}>
          <View style={styles.qr} accessibilityLabel={`QR code for ${share.storeUrl}`}>
            <SvgXml xml={share.qrSvg} width="100%" height="100%" />
          </View>
          <Text selectable style={typography.heading}>
            {share.storeUrl.replace(/^https?:\/\//, '')}
          </Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginVertical: 60,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  center: {
    alignItems: 'center',
    gap: 10,
  },
  qr: {
    width: 208,
    height: 208,
    padding: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  note: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
});
