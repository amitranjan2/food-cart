'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MenuItem } from '../../lib/api';
import {
  configurationFrom,
  customizationFor,
  formatRupee,
  initialSelection,
  sizeDeltaLabel,
  type CustomizationGroup,
  type StoredConfiguration,
} from '../lib/customization';
import { foodMark } from '../lib/foodMark';

function Mark({ type }: { type?: MenuItem['foodType'] }) {
  const mark = foodMark(type);
  if (!mark) return null;
  return (
    <span className="food-mark inline" style={{ color: mark.color }}>
      <i />
      <span className="sr-only">{mark.label}</span>
    </span>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span className={'opt-check' + (on ? ' on' : '')} aria-hidden="true">
      {on && (
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M2.2 6.2 4.7 8.8 9.8 3.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export function ItemCustomizer({
  item,
  fallbackImage,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  fallbackImage?: string;
  onClose: () => void;
  onAdd: (configuration: StoredConfiguration) => void;
}) {
  const spec = useMemo(() => customizationFor(item), [item]);
  const [selected, setSelected] = useState(() => initialSelection(spec));
  const [broken, setBroken] = useState(false);
  const photo = item.imageUrl || fallbackImage;
  const resolved = configurationFrom(item, spec, selected);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [item.id]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(group: CustomizationGroup, choiceId: string) {
    setSelected(current => {
      const next = { ...current, [group.id]: [...(current[group.id] ?? [])] };
      if (group.selection === 'single') {
        next[group.id] = [choiceId];
        return next;
      }
      next[group.id] = next[group.id].includes(choiceId)
        ? next[group.id].filter(id => id !== choiceId)
        : [...next[group.id], choiceId];
      return next;
    });
  }

  function choiceLabel(group: CustomizationGroup, choice: CustomizationGroup['choices'][number], baseline: number) {
    if (group.id === 'size') return sizeDeltaLabel(choice, baseline);
    if (group.selection === 'single' && choice.price > 0) return `${choice.name} [+${formatRupee(choice.price)}]`;
    return choice.name;
  }

  return (
    <div className="customizer">
      <div className="customizer-hero">
        <div className="customizer-photo">
          {photo && !broken ? (
            <img src={photo} alt="" onError={() => setBroken(true)} />
          ) : (
            <span className="media-fallback" />
          )}
        </div>
        <div className="customizer-heading">
          <Mark type={item.foodType} />
          <h2>{item.name}</h2>
        </div>
        {item.description && <p className="customizer-copy">{item.description}</p>}
      </div>
      <div className="customizer-scroll" ref={scrollRef}>
      {spec.groups.map(group => {
        const baseline = Math.min(...group.choices.map(choice => choice.price));
        const picked = selected[group.id] ?? [];
        return (
          <section
            key={group.id}
            className={'option-card' + (group.selection === 'single' ? ' single' : '')}
            role={group.selection === 'single' ? 'radiogroup' : 'group'}
            aria-label={group.name}
          >
            <h3>{group.name}</h3>
            {group.choices.map(choice => {
              const on = picked.includes(choice.id);
              return (
                <button
                  key={choice.id}
                  type="button"
                  role={group.selection === 'single' ? 'radio' : 'checkbox'}
                  aria-checked={on}
                  className="option-row"
                  onClick={() => toggle(group, choice.id)}
                >
                  <span className="option-name">
                    {group.selection === 'multiple' && <Mark type={choice.foodType} />}
                    {choiceLabel(group, choice, baseline)}
                  </span>
                  <Check on={on} />
                </button>
              );
            })}
          </section>
        );
      })}
      </div>
      <footer className="customizer-bar">
        <div className="customizer-summary">
          <p>{resolved.barLabel}</p>
          <strong aria-live="polite">{formatRupee(resolved.unitPrice)}</strong>
        </div>
        <button type="button" className="customizer-add" onClick={() => onAdd(resolved)}>ADD</button>
      </footer>
    </div>
  );
}
