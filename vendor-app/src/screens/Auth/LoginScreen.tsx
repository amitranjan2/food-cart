import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { requestVendorOtp } from '../../api/auth';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Screen } from '../../components/Screen';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';

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
    <Screen style={styles.page}>
      <StatusBar style="dark" />
      {step === 'mobile' ? (
        <View style={styles.block}>
          <Text style={styles.title}>Supr-Mama</Text>
          <Text style={styles.subtitle}>Built for every chef's kitchen!</Text>
          <TextInput
            value={mobile}
            onChangeText={value => {
              setMobile(value.replace(/\D/g, '').slice(0, 10));
              if (error) setError('');
            }}
            placeholder="Enter Mobile Number"
            placeholderTextColor="#8b969f"
            keyboardType="number-pad"
            maxLength={10}
            autoComplete="tel"
            style={styles.input}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Continue"
            disabled={busy}
            style={styles.button}
            onPress={continueWithMobile}
          />
        </View>
      ) : (
        <View style={styles.block}>
          <Text style={styles.title}>Enter OTP!</Text>
          <Text style={styles.subtitle}>Enter the {OTP_LENGTH} digit code received on SMS.</Text>
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
              style={styles.hiddenInput}
            />
            <Pressable onPress={() => otpRef.current?.focus()} style={styles.otpRow}>
              {Array.from({ length: OTP_LENGTH }, (_, index) => (
                <View key={index} style={styles.otpBox}>
                  <Text style={styles.otpDigit}>{otp[index] ?? ''}</Text>
                </View>
              ))}
            </Pressable>
          </View>
          <Pressable onPress={resend} disabled={seconds > 0 || busy} style={styles.resend}>
            <Text style={styles.resendLabel}>
              Resend{seconds > 0 ? ` ${formatTimer(seconds)}` : ''}
            </Text>
          </Pressable>
          <PrimaryButton
            label="Continue"
            disabled={busy}
            style={styles.button}
            onPress={continueWithOtp}
          />
          {error ? <Text style={[styles.error, styles.otpError]}>{error}</Text> : null}
          <Pressable onPress={() => { setStep('mobile'); setError(''); setOtp(''); }}>
            <Text style={styles.changeNumber}>Change number</Text>
          </Pressable>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.login,
    paddingHorizontal: 36,
    justifyContent: 'center',
  },
  block: {
    marginTop: -40,
  },
  title: {
    color: colors.header,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 36,
    color: colors.header,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  input: {
    height: 48,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
    color: colors.header,
  },
  error: {
    marginTop: 10,
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
  otpError: {
    textAlign: 'center',
  },
  button: {
    marginTop: 28,
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
    backgroundColor: colors.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpDigit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.header,
  },
  resend: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.header,
  },
  resendWait: {
    opacity: 0.85,
  },
  timer: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.header,
  },
  changeNumber: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: colors.muted,
  },
});
