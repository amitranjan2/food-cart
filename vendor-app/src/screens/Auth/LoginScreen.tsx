import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { loginMethods, requestVendorOtp, startVendorWaLogin, type LoginMethods, type WaLoginStart } from '../../api/auth';
import { useWhatsAppLogin } from '../../hooks/useWhatsAppLogin';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { useOtpDelivery } from '../../hooks/useOtpDelivery';
import { colors, radius, typography } from '../../theme';
import { Button, Card, Field } from '../../ui';
import { POLICY_URLS } from '../../utils/policies';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function isValidMobile(value: string) {
  return /^[0-9]{10}$/.test(value);
}

function formatTimer(seconds: number) {
  return `00:${String(seconds).padStart(2, '0')}`;
}

export function LoginScreen() {
  const { login, loginWithToken } = useAuth();
  const [step, setStep] = useState<'mobile' | 'otp' | 'whatsapp'>('mobile');
  /** Codes only until the API answers (the old behaviour). */
  const [methods, setMethods] = useState<LoginMethods>({ otp: true, whatsappLogin: false });
  /** The vendor chose a 6-digit code instead of WhatsApp login (only when both are on). */
  const [useCode, setUseCode] = useState(false);
  const [waStart, setWaStart] = useState<WaLoginStart | null>(null);
  const waMode = methods.whatsappLogin && !(useCode && methods.otp);
  const waState = useWhatsAppLogin(step === 'whatsapp' ? waStart : null, token => {
    loginWithToken(token).catch(e => setError(e instanceof Error ? e.message : 'Signed in, but your stall could not be loaded.'));
  });

  useEffect(() => {
    let active = true;
    loginMethods().then(next => active && setMethods(next)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function startWhatsApp() {
    if (!isValidMobile(mobile)) {
      setError('This mobile number is invalid');
      return;
    }
    try {
      setError('');
      setBusy(true);
      const started = await startVendorWaLogin(mobile);
      setWaStart(started);
      setStep('whatsapp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const otpRef = useRef<TextInput>(null);
  /** Reference to the last code sent, to show whether WhatsApp delivered it. */
  const [codeRef, setCodeRef] = useState('');
  const delivery = useOtpDelivery(step === 'otp' ? codeRef : '');

  useEffect(() => {
    if (step !== 'otp') return;
    const id = setInterval(() => {
      setSeconds(value => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  async function continueWithMobile() {
    if (!isValidMobile(mobile)) {
      setError('This mobile number is invalid');
      return;
    }
    try {
      setError('');
      setBusy(true);
      setCodeRef('');
      const sent = await requestVendorOtp(mobile);
      setCodeRef(sent.ref ?? '');
      setOtp('');
      setSeconds(RESEND_SECONDS);
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function continueWithOtp() {
    if (otp.length !== OTP_LENGTH) {
      setError('Invalid code');
      return;
    }
    try {
      setError('');
      setBusy(true);
      await login(mobile, otp);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid code';
      setError(message === 'Invalid OTP' ? 'Invalid code' : message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (seconds > 0 || busy) return;
    try {
      setError('');
      setBusy(true);
      setCodeRef('');
      const sent = await requestVendorOtp(mobile);
      setCodeRef(sent.ref ?? '');
      setSeconds(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <StatusBar style="dark" />
      <View style={styles.page}>
        {step === 'mobile' ? (
          <>
            <Text style={typography.overline}>VENDOR APP</Text>
            <Text style={styles.brand}>Supr-Mama</Text>
            <Text style={styles.subtitle}>Built for every chef&apos;s kitchen!</Text>
            <Card style={styles.card}>
              <Text style={typography.bodyStrong}>Mobile number</Text>
              <Field
                value={mobile}
                onChangeText={value => {
                  setMobile(value.replace(/\D/g, '').slice(0, 10));
                  if (error) setError('');
                }}
                placeholder="10-digit mobile number"
                keyboardType="number-pad"
                maxLength={10}
                autoComplete="tel"
                invalid={!!error}
                accessibilityLabel="Mobile number"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Text style={typography.caption}>
                {waMode
                  ? 'You confirm your number by sending us one WhatsApp message. New here? Use your number to open your stall.'
                  : 'We send a login code on WhatsApp. New here? Use your number to open your stall.'}
              </Text>
              {waMode ? (
                <Button label="Verify on WhatsApp" busy={busy} onPress={startWhatsApp} style={styles.action} />
              ) : (
                <Button label="Continue" busy={busy} onPress={continueWithMobile} style={styles.action} />
              )}
              {methods.whatsappLogin && methods.otp ? (
                <Button
                  label={waMode ? 'Get a 6-digit code instead' : 'Verify on WhatsApp instead'}
                  variant="quiet"
                  size="sm"
                  onPress={() => { setUseCode(value => !value); setError(''); }}
                />
              ) : null}
              <Text style={[typography.caption, styles.center]}>
                By continuing you agree to our{' '}
                <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(POLICY_URLS.vendorTerms)}>Vendor Terms</Text> and{' '}
                <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(POLICY_URLS.vendorPrivacy)}>Privacy Policy</Text>.
              </Text>
            </Card>
          </>
        ) : step === 'whatsapp' && waStart ? (
          <>
            <Text style={typography.overline}>VENDOR APP</Text>
            <Text style={styles.brand}>Send one message</Text>
            <Text style={styles.subtitle}>
              Open WhatsApp on the phone with {mobile} and press Send. You&apos;re signed in as soon as it arrives.
            </Text>
            <Card style={styles.card}>
              {waState === 'EXPIRED' ? (
                <View style={styles.failed} accessibilityRole="alert">
                  <Text style={styles.failedText}>This took too long. Go back and tap Verify on WhatsApp again.</Text>
                </View>
              ) : (
                <>
                  <Button label="Open WhatsApp" onPress={() => Linking.openURL(waStart.link)} />
                  <Text style={typography.caption}>
                    The message <Text style={styles.strong}>{waStart.text}</Text> is ready to send to {waStart.number}.
                  </Text>
                  {/* On the web app (a laptop at the stall), scanning is easier than switching devices. */}
                  {Platform.OS === 'web' ? (
                    <View style={styles.qr}>
                      <SvgXml xml={waStart.qrSvg} width={112} height={112} />
                      <Text style={[typography.caption, styles.qrText]}>On a laptop? Scan this with your phone&apos;s camera.</Text>
                    </View>
                  ) : null}
                  {waState === 'WRONG_NUMBER' ? (
                    <View style={styles.failed} accessibilityRole="alert">
                      <Text style={styles.failedText}>That message came from a different number. Send it from {mobile}, or change the number.</Text>
                    </View>
                  ) : (
                    <Text style={[typography.caption, styles.center]} accessibilityLiveRegion="polite">Waiting for your message…</Text>
                  )}
                </>
              )}
              {error ? <Text style={[styles.error, styles.center]}>{error}</Text> : null}
              <View style={styles.links}>
                <Button label="Change number" variant="quiet" size="sm" onPress={() => { setStep('mobile'); setError(''); setWaStart(null); }} />
                <Button label="Start again" variant="quiet" size="sm" disabled={busy} onPress={startWhatsApp} />
              </View>
            </Card>
          </>
        ) : (
          <>
            <Text style={typography.overline}>VENDOR APP</Text>
            <Text style={styles.brand}>Enter code</Text>
            <Text style={styles.subtitle}>
              Enter the {OTP_LENGTH}-digit code sent on WhatsApp to {mobile}.
            </Text>
            <Card style={styles.card}>
              <View style={styles.otpWrap}>
                <TextInput
                  ref={otpRef}
                  value={otp}
                  onChangeText={value => {
                    setOtp(value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                    if (error) setError('');
                  }}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  autoFocus
                  caretHidden
                  accessibilityLabel="Login code"
                  style={styles.hiddenInput}
                />
                <Pressable onPress={() => otpRef.current?.focus()} style={styles.otpRow}>
                  {Array.from({ length: OTP_LENGTH }, (_, index) => (
                    <View key={index} style={[styles.otpBox, index === otp.length && styles.otpBoxActive, !!error && styles.otpBoxError]}>
                      <Text style={styles.otpDigit}>{otp[index] ?? ''}</Text>
                    </View>
                  ))}
                </Pressable>
              </View>
              {error ? <Text style={[styles.error, styles.center]}>{error}</Text> : null}
              {delivery?.state === 'FAILED' ? (
                <View style={styles.failed} accessibilityRole="alert">
                  <Text style={styles.failedText}>{delivery.message ?? 'WhatsApp couldn’t deliver the code. Tap Resend code.'}</Text>
                </View>
              ) : null}
              <Button label="Continue" busy={busy} onPress={continueWithOtp} style={styles.action} />
              <View style={styles.links}>
                <Button label="Change number" variant="quiet" size="sm" onPress={() => { setStep('mobile'); setError(''); setOtp(''); setCodeRef(''); }} />
                <Button label={seconds > 0 ? `Resend in ${formatTimer(seconds)}` : 'Resend code'} variant="quiet" size="sm" disabled={seconds > 0 || busy} onPress={resend} />
              </View>
            </Card>
            {delivery?.state === 'DELIVERED' ? (
              <Text style={[typography.caption, styles.center]} accessibilityLiveRegion="polite">Delivered on WhatsApp to {mobile}.</Text>
            ) : delivery?.state !== 'FAILED' ? (
              <Text style={[typography.caption, styles.center]}>Didn&apos;t get it? Make sure {mobile} is on WhatsApp.</Text>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brand: {
    ...typography.display,
    fontSize: 30,
    marginTop: 4,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 20,
  },
  card: {
    gap: 10,
    marginBottom: 14,
  },
  action: {
    marginTop: 4,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  strong: {
    fontWeight: '800',
    color: colors.text,
  },
  qr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.tint,
  },
  qrText: {
    flex: 1,
  },
  failed: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  failedText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  center: {
    textAlign: 'center',
  },
  link: {
    color: colors.link,
    fontWeight: '800',
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpWrap: {
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.02,
    zIndex: 2,
    color: 'transparent',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 1,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 56,
    backgroundColor: colors.tint,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: colors.primary,
  },
  otpBoxError: {
    borderColor: colors.danger,
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
});
