import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import type { Weekday } from '../../types';
import { DAYS, endChoices, nextSlot, setEnd, setStart, startChoices, timeLabel, type Week } from '../../utils/hours';

type Editing = { day: Weekday; index: number; field: 'opens' | 'closes' } | null;

/**
 * Each day's opening slots in time order. A slot lies inside the day (latest close: 12:00 midnight); the next slot
 * starts at or after the previous one ends. A day with no slots is closed. "Copy to…" repeats a day's slots on others.
 */
export function HoursEditor({ week, onChange }: { week: Week; onChange: (week: Week) => void }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [copyFrom, setCopyFrom] = useState<Weekday | null>(null);
  const [copyTo, setCopyTo] = useState<Weekday[]>([]);

  function change(day: Weekday, slots: Week[Weekday]) {
    onChange({ ...week, [day]: slots });
  }

  function applyCopy() {
    if (!copyFrom) return;
    const next = { ...week };
    for (const day of copyTo) next[day] = week[copyFrom].map(slot => ({ ...slot }));
    onChange(next);
    setCopyFrom(null);
    setCopyTo([]);
  }

  return (
    <View style={styles.days}>
      {DAYS.map(({ day, label }) => {
        const slots = week[day];
        const added = nextSlot(slots);
        const copying = copyFrom === day;
        return (
          <View key={day} style={styles.day} accessibilityLabel={label}>
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>{label}</Text>
              <Text style={[styles.state, slots.length ? styles.open : styles.closed]}>{slots.length ? 'Open' : 'Closed'}</Text>
              <View style={styles.spacer} />
              {slots.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Copy ${label} to other days`}
                  onPress={() => {
                    setCopyFrom(copying ? null : day);
                    setCopyTo([]);
                    setEditing(null);
                  }}
                  style={styles.link}
                >
                  <Text style={styles.linkLabel}>⧉ Copy to…</Text>
                </Pressable>
              ) : null}
            </View>

            {slots.map((slot, index) => {
              const editingThis = editing?.day === day && editing.index === index ? editing : null;
              const choices = editingThis ? (editingThis.field === 'opens' ? startChoices(slots, index) : endChoices(slots, index)) : [];
              return (
                <View key={index}>
                  <View style={styles.slot}>
                    {(['opens', 'closes'] as const).map((field, position) => (
                      <View key={field} style={styles.timeWrap}>
                        {position === 1 ? <Text style={styles.dash}>→</Text> : null}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${label} slot ${index + 1} ${field === 'opens' ? 'opens' : 'closes'} ${timeLabel(slot[field])}`}
                          onPress={() => setEditing(editingThis?.field === field ? null : { day, index, field })}
                          style={[styles.time, editingThis?.field === field && styles.timeActive]}
                        >
                          <Text style={styles.timeLabel}>{timeLabel(slot[field])}</Text>
                        </Pressable>
                      </View>
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${label} slot ${index + 1}`}
                      onPress={() => {
                        change(day, slots.filter((_, i) => i !== index));
                        setEditing(null);
                      }}
                      hitSlop={8}
                      style={styles.remove}
                    >
                      <Text style={styles.removeLabel}>✕</Text>
                    </Pressable>
                  </View>
                  {editingThis ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
                      {choices.map(time => {
                        const on = slot[editingThis.field] === time;
                        return (
                          <Pressable
                            key={time}
                            onPress={() => {
                              change(day, editingThis.field === 'opens' ? setStart(slots, index, time) : setEnd(slots, index, time));
                              setEditing(null);
                            }}
                            style={[styles.chip, on && styles.chipOn]}
                          >
                            <Text style={[styles.chipLabel, on && styles.chipOnLabel]}>{timeLabel(time)}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </View>
              );
            })}

            {added ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add a slot on ${label}`}
                onPress={() => {
                  change(day, [...slots, added]);
                  setEditing(null);
                }}
                style={styles.link}
              >
                <Text style={styles.linkLabel}>+ {slots.length ? 'Add slot' : 'Open this day'}</Text>
              </Pressable>
            ) : slots.length ? (
              <Text style={styles.full}>Open until midnight</Text>
            ) : null}

            {copying ? (
              <View style={styles.copyBox}>
                <Text style={styles.copyTitle}>Copy {label}&apos;s hours to</Text>
                <View style={styles.copyDays}>
                  {DAYS.filter(entry => entry.day !== day).map(entry => {
                    const on = copyTo.includes(entry.day);
                    return (
                      <Pressable
                        key={entry.day}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        onPress={() => setCopyTo(current => (on ? current.filter(d => d !== entry.day) : [...current, entry.day]))}
                        style={[styles.copyDay, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipLabel, on && styles.chipOnLabel]}>{entry.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.copyActions}>
                  <Pressable
                    onPress={() => setCopyTo(current => (current.length === DAYS.length - 1 ? [] : DAYS.map(d => d.day).filter(d => d !== day)))}
                    style={styles.link}
                  >
                    <Text style={styles.linkLabel}>{copyTo.length === DAYS.length - 1 ? 'Clear' : 'All days'}</Text>
                  </Pressable>
                  <Pressable disabled={copyTo.length === 0} onPress={applyCopy} style={[styles.apply, copyTo.length === 0 && styles.disabled]}>
                    <Text style={styles.applyLabel}>Copy</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  days: {
    gap: 10,
  },
  day: {
    backgroundColor: '#E7F3FC',
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    width: 40,
    color: colors.title,
    fontSize: 15,
    fontWeight: '800',
  },
  state: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  open: {
    color: colors.onText,
    backgroundColor: colors.onBg,
  },
  closed: {
    color: colors.offText,
    backgroundColor: colors.offBg,
  },
  spacer: {
    flex: 1,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dash: {
    color: colors.muted,
    fontSize: 13,
  },
  time: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timeActive: {
    borderColor: colors.header,
  },
  timeLabel: {
    color: colors.title,
    fontSize: 13,
    fontWeight: '700',
  },
  remove: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  picker: {
    gap: 6,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  chipOn: {
    backgroundColor: colors.header,
  },
  chipLabel: {
    color: colors.title,
    fontSize: 12,
    fontWeight: '600',
  },
  chipOnLabel: {
    color: colors.white,
    fontWeight: '800',
  },
  link: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  linkLabel: {
    color: '#2F6BFF',
    fontSize: 13,
    fontWeight: '800',
  },
  full: {
    color: colors.muted,
    fontSize: 12,
  },
  copyBox: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  copyTitle: {
    color: colors.title,
    fontSize: 13,
    fontWeight: '700',
  },
  copyDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  copyDay: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.filterBg,
  },
  copyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  apply: {
    backgroundColor: colors.header,
    borderRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  applyLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  disabled: {
    opacity: 0.45,
  },
});
