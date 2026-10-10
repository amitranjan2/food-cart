import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, Chip, IconButton, Panel } from '../../ui';
import { AddIcon, CopyDishIcon, EditDishIcon } from '../../components/icons/MenuActionIcons';
import { colors, radius, typography } from '../../theme';
import type { Weekday } from '../../types';
import { DAYS, endChoices, nextSlot, setEnd, setStart, startChoices, timeLabel, type Week } from '../../utils/hours';

type Editing = { day: Weekday; index: number; field: 'opens' | 'closes' } | null;

/**
 * Each day's opening slots in time order, in 24-hour time. A slot lies inside the day (00:00 → 24:00); the next slot
 * starts at or after the previous one ends. A day with no slots is closed. Days show their slots read-only; the edit
 * icon opens one day for changing times, removing slots and adding one below the last. The copy icon repeats a day's
 * slots on other days.
 */
export function HoursEditor({ week, onChange }: { week: Week; onChange: (week: Week) => void }) {
  const [editing, setEditing] = useState<Editing>(null);
  const [copyFrom, setCopyFrom] = useState<Weekday | null>(null);
  /** The day open for editing (one at a time). */
  const [editDay, setEditDay] = useState<Weekday | null>(null);
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
        const open = editDay === day;
        return (
          <Card key={day} style={styles.day}>
            <View accessibilityLabel={label} style={styles.dayInner}>
            <View style={styles.dayHead}>
              <Text style={[typography.heading, styles.dayName]}>{label}</Text>
              <Badge label={slots.length ? 'Open' : 'Closed'} tone={slots.length ? 'success' : 'danger'} />
              <View style={styles.spacer} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={open ? `Done editing ${label}` : `Edit ${label}`}
                accessibilityState={{ expanded: open }}
                onPress={() => {
                  setEditDay(open ? null : day);
                  setEditing(null);
                  setCopyFrom(null);
                }}
                hitSlop={8}
                style={[styles.copyIcon, open && styles.copyIconOn]}
              >
                <EditDishIcon size={18} />
              </Pressable>
              {slots.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Copy ${label} to other days`}
                  onPress={() => {
                    setCopyFrom(copying ? null : day);
                    setCopyTo([]);
                    setEditing(null);
                    setEditDay(null);
                  }}
                  hitSlop={8}
                  style={[styles.copyIcon, copying && styles.copyIconOn]}
                >
                  <CopyDishIcon size={18} />
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
                          disabled={!open}
                          onPress={() => setEditing(editingThis?.field === field ? null : { day, index, field })}
                          style={[styles.time, editingThis?.field === field && styles.timeActive]}
                        >
                          <Text style={styles.timeLabel}>{timeLabel(slot[field])}</Text>
                        </Pressable>
                      </View>
                    ))}
                    {open ? (
                      <View style={styles.remove}>
                        <IconButton
                          icon="close"
                          label={`Remove ${label} slot ${index + 1}`}
                          tone="none"
                          size={32}
                          color={colors.muted}
                          onPress={() => {
                            change(day, slots.filter((_, i) => i !== index));
                            setEditing(null);
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                  {editingThis ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.picker}>
                      {choices.map(time => {
                        const on = slot[editingThis.field] === time;
                        return (
                          <Chip
                            key={time}
                            label={timeLabel(time)}
                            selected={on}
                            onPress={() => {
                              change(day, editingThis.field === 'opens' ? setStart(slots, index, time) : setEnd(slots, index, time));
                              setEditing(null);
                            }}
                          />
                        );
                      })}
                    </ScrollView>
                  ) : null}
                </View>
              );
            })}

            {open && added ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Add a slot on ${label}`}
                onPress={() => {
                  change(day, [...slots, added]);
                  setEditing(null);
                }}
                hitSlop={8}
                style={[styles.copyIcon, styles.addIcon]}
              >
                <AddIcon size={18} />
              </Pressable>
            ) : open && slots.length ? (
              <Text style={typography.caption}>Open until 24:00, no more slots fit</Text>
            ) : null}

            {copying ? (
              <Panel>
                <Text style={typography.bodyStrong}>Copy {label}&apos;s hours to</Text>
                <View style={styles.copyDays}>
                  {DAYS.filter(entry => entry.day !== day).map(entry => {
                    const on = copyTo.includes(entry.day);
                    return (
                      <Chip
                        key={entry.day}
                        label={entry.label}
                        selected={on}
                        accessibilityRole="checkbox"
                        onPress={() => setCopyTo(current => (on ? current.filter(d => d !== entry.day) : [...current, entry.day]))}
                      />
                    );
                  })}
                </View>
                <View style={styles.copyActions}>
                  <Button
                    label={copyTo.length === DAYS.length - 1 ? 'Clear' : 'All days'}
                    variant="quiet"
                    size="sm"
                    onPress={() => setCopyTo(current => (current.length === DAYS.length - 1 ? [] : DAYS.map(d => d.day).filter(d => d !== day)))}
                  />
                  <Button label="Copy" size="sm" disabled={copyTo.length === 0} onPress={applyCopy} />
                </View>
              </Panel>
            ) : null}
            </View>
          </Card>
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
    padding: 12,
  },
  dayInner: {
    gap: 8,
  },
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayName: {
    width: 40,
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
    backgroundColor: colors.tint,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  timeActive: {
    borderColor: colors.primary,
  },
  timeLabel: {
    ...typography.bodyStrong,
    fontVariant: ['tabular-nums'],
  },
  remove: {
    marginLeft: 'auto',
  },
  picker: {
    gap: 6,
    paddingVertical: 4,
  },
  copyIcon: {
    marginLeft: 4,
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  addIcon: {
    marginLeft: 0,
    alignSelf: 'flex-start',
  },
  copyIconOn: {
    borderColor: colors.primary,
  },
  copyDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  copyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
