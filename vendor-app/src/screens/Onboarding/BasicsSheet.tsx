import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getThemes } from '../../api/vendor';
import { putBasics } from '../../api/onboarding';
import { isAuthFailure } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, typography } from '../../theme';
import type { StoreTheme } from '../../types';
import { Button, Field, Sheet } from '../../ui';
import { isPlaceholderLink, linkFromName } from '../../utils/storeLink';
import { ThemePicker } from '../Settings/ThemePicker';

/** Step 1 of onboarding: business name, store link (suprmama.in/…) and colour pair. */
export function BasicsSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { token, vendor, setVendor, logout } = useAuth();
  const live = vendor?.review === 'APPROVED';
  const [name, setName] = useState(vendor?.name ?? '');
  const [link, setLink] = useState(isPlaceholderLink(vendor?.slug) ? '' : vendor?.slug ?? '');
  // Until the vendor edits the link, it follows the name.
  const [linkEdited, setLinkEdited] = useState(!isPlaceholderLink(vendor?.slug));
  const [theme, setTheme] = useState(vendor?.theme ?? 'SKY');
  const [themes, setThemes] = useState<StoreTheme[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) getThemes(token).then(setThemes).catch(() => setThemes([]));
  }, [token]);

  async function save() {
    if (!token) return;
    try {
      setBusy(true);
      setError('');
      setVendor(await putBasics(token, { name: name.trim(), slug: link.trim(), theme }));
      onSaved();
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Your stall"
      hint="Customers see this name and colours, and open your menu at this link."
      onClose={onClose}
      footer={<Button label="Save" grow busy={busy} disabled={name.trim().length < 2 || link.length < 3} onPress={save} />}
    >
      <Text style={typography.bodyStrong}>Business name</Text>
      <Field
        value={name}
        onChangeText={value => {
          setName(value);
          if (!linkEdited) setLink(linkFromName(value));
        }}
        placeholder="e.g. Chotu's Chai & Bun"
        maxLength={60}
        accessibilityLabel="Business name"
      />
      <Text style={typography.bodyStrong}>Store link</Text>
      <View style={[styles.link, live && styles.locked]}>
        <Text style={styles.prefix}>suprmama.in/</Text>
        <Field
          value={link}
          editable={!live}
          onChangeText={value => {
            setLinkEdited(true);
            setLink(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
          }}
          placeholder="your-stall"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          style={styles.linkField}
          accessibilityLabel="Store link"
        />
      </View>
      <Text style={typography.caption}>
        {live ? 'Your link is fixed now that your stall is live: it is on your QR posters.' : 'Letters, numbers and hyphens. It goes on your QR poster, so pick it carefully.'}
      </Text>
      <Text style={typography.bodyStrong}>Colours</Text>
      <ThemePicker themes={themes} value={theme} onChange={setTheme} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    paddingLeft: 13,
  },
  locked: {
    opacity: 0.6,
  },
  prefix: {
    ...typography.body,
    color: colors.muted,
  },
  linkField: {
    flex: 1,
    paddingLeft: 2,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
