import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { putVendorHours } from '../../api/vendor';
import { isAuthFailure } from '../../api/client';
import { useAuth } from '../../state/AuthContext';
import { colors } from '../../theme';
import type { OpeningHours, Weekday } from '../../types';
import { clock12 } from '../../utils/format';

const DAYS: { day: Weekday; label: string }[] = [
  { day: 'MONDAY', label: 'Mon' },
  { day: 'TUESDAY', label: 'Tue' },
  { day: 'WEDNESDAY', label: 'Wed' },
  { day: 'THURSDAY', label: 'Thu' },
  { day: 'FRIDAY', label: 'Fri' },
  { day: 'SATURDAY', label: 'Sat' },
  { day: 'SUNDAY', label: 'Sun' },
];

const HALF_HOURS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 ? 30 : 0;
  return `${String(hour).padStart(2, '0')}:${minute ? '30' : '00'}`;
});

type Row = { day: Weekday; open: boolean; opens: string; closes: string };
type Editing = { day: Weekday; field: 'opens' | 'closes' } | null;

function label(time: string) {
  const [hour, minute] = time.split(':').map(Number);
  return clock12(hour, minute);
}

function rowsFrom(hours: OpeningHours[] | undefined): Row[] {
  return DAYS.map(({ day }) => {
    const saved = hours?.find(entry => entry.day === day);
    return saved ? { day, open: true, opens: saved.opens, closes: saved.closes } : { day, open: false, opens: '10:00', closes: '22:00' };
  });
}

/** Weekly opening hours. Customers can only pick 30-minute slots inside these hours. */
export function OpeningHoursCard() {
  const { token, vendor, setVendor, logout } = useAuth();
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(vendor?.openingHours));
  const [editing, setEditing] = useState<Editing>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const noneSaved = !vendor?.openingHours?.length;

  function update(day: Weekday, change: Partial<Row>) {
    setRows(current => current.map(row => (row.day === day ? { ...row, ...change } : row)));
    setMessage('');
  }

  function copyMondayToAll() {
    const monday = rows[0];
    setRows(current => current.map(row => ({ ...row, open: monday.open, opens: monday.opens, closes: monday.closes })));
    setMessage('');
  }

  async function save() {
    if (!token) return;
    try {
      setBusy(true);
      setMessage('');
      const saved = await putVendorHours(
        token,
        rows.filter(row => row.open).map(({ day, opens, closes }) => ({ day, opens, closes })),
      );
      setVendor(saved);
      setRows(rowsFrom(saved.openingHours));
      setFailed(false);
      setMessage(saved.openingHours?.length ? 'Saved. Customers now see slots in these hours.' : 'Saved. With every day closed, customers cannot order.');
    } catch (e) {
      if (isAuthFailure(e)) await logout();
      else {
        setFailed(true);
        setMessage(e instanceof Error ? e.message : 'Could not save opening hours');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>OPENING HOURS</Text>
      {noneSaved ? (
        <Text style={styles.warning}>Not set yet: customers can’t order until you save your hours.</Text>
      ) : (
        <Text style={styles.hint}>Customers pick a 30-minute slot inside these hours, up to the end of tomorrow.</Text>
      )}
      {rows.map(row => {
        const overnight = row.open && row.closes <= row.opens;
        return (
          <View key={row.day}>
            <View style={styles.row}>
              <Text style={styles.day}>{DAYS.find(entry => entry.day === row.day)?.label}</Text>
              <Pressable
                onPress={() => update(row.day, { open: !row.open })}
                style={[styles.toggle, row.open ? styles.toggleOn : styles.toggleOff]}
                accessibilityRole="switch"
                accessibilityState={{ checked: row.open }}
              >
                <Text style={[styles.toggleLabel, row.open ? styles.toggleOnText : styles.toggleOffText]}>{row.open ? 'Open' : 'Closed'}</Text>
              </Pressable>
              {row.open ? (
                <View style={styles.times}>
                  {(['opens', 'closes'] as const).map((field, index) => (
                    <View key={field} style={styles.timeWrap}>
                      {index === 1 ? <Text style={styles.dash}>–</Text> : null}
                      <Pressable
                        onPress={() => setEditing(current => (current?.day === row.day && current.field === field ? null : { day: row.day, field }))}
                        style={[styles.time, editing?.day === row.day && editing.field === field ? styles.timeActive : null]}
                      >
                        <Text style={styles.timeLabel}>{label(row[field])}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
            {overnight ? <Text style={styles.overnight}>Closes next day at {label(row.closes)}</Text> : null}
            {row.open && editing?.day === row.day ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
                {HALF_HOURS.map(time => (
                  <Pressable
                    key={time}
                    onPress={() => {
                      update(row.day, { [editing.field]: time });
                      setEditing(null);
                    }}
                    style={[styles.chip, row[editing.field] === time ? styles.chipOn : null]}
                  >
                    <Text style={[styles.chipLabel, row[editing.field] === time ? styles.chipOnLabel : null]}>{label(time)}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        );
      })}
      <Pressable onPress={copyMondayToAll} style={styles.copy}>
        <Text style={styles.copyLabel}>Copy Monday to every day</Text>
      </Pressable>
      <Pressable disabled={busy} onPress={save} style={styles.save}>
        <Text style={styles.saveLabel}>{busy ? 'SAVING…' : 'SAVE HOURS'}</Text>
      </Pressable>
      {message ? <Text style={failed ? styles.error : styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    color: colors.ink,
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
  },
  warning: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: 8,
  },
  day: {
    width: 36,
    fontSize: 14,
    fontWeight: '700',
    color: colors.title,
  },
  toggle: {
    width: 72,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  toggleOn: {
    backgroundColor: colors.onBg,
  },
  toggleOff: {
    backgroundColor: colors.offBg,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleOnText: {
    color: colors.onText,
  },
  toggleOffText: {
    color: colors.offText,
  },
  times: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dash: {
    marginHorizontal: 4,
    color: colors.muted,
  },
  time: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  timeActive: {
    borderColor: colors.header,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.title,
  },
  overnight: {
    marginLeft: 44,
    fontSize: 12,
    color: colors.muted,
  },
  picker: {
    gap: 6,
    paddingVertical: 6,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.filterBg,
  },
  chipOn: {
    backgroundColor: colors.header,
  },
  chipLabel: {
    fontSize: 13,
    color: colors.title,
  },
  chipOnLabel: {
    color: colors.white,
    fontWeight: '700',
  },
  copy: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  copyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.statusText,
  },
  save: {
    marginTop: 4,
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
  error: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
  },
});
