import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { requestVendorOtp } from '../../api/auth';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors, radius, typography } from '../../theme';
import { Button, Card, Field } from '../../ui';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

function isValidMobile(value: string) {
  return /^[0-9]{10}$/.test(value);
}

function formatTimer(seconds: number) {
  return `00:${String(seconds).padStart(2, '0')}`;
}

export function LoginScreen() {
  const { login } = useAuth();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const otpRef = useRef<TextInput>(null);

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
      await requestVendorOtp(mobile);
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
      await requestVendorOtp(mobile);
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
              <Text style={typography.caption}>We send a login code on WhatsApp.</Text>
              <Button label="Continue" busy={busy} onPress={continueWithMobile} style={styles.action} />
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
              <Button label="Continue" busy={busy} onPress={continueWithOtp} style={styles.action} />
              <View style={styles.links}>
                <Button label="Change number" variant="quiet" size="sm" onPress={() => { setStep('mobile'); setError(''); setOtp(''); }} />
                <Button label={seconds > 0 ? `Resend in ${formatTimer(seconds)}` : 'Resend code'} variant="quiet" size="sm" disabled={seconds > 0 || busy} onPress={resend} />
              </View>
            </Card>
            <Text style={[typography.caption, styles.center]}>Didn&apos;t get it? Make sure {mobile} is on WhatsApp.</Text>
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
  center: {
    textAlign: 'center',
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
