'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { MenuItem } from '../../lib/api';
import {
  configurationFrom,
  customizationFor,
  formatRupee,
  initialSelection,
  selectionReady,
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
  inset,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  inset: number;
  onClose: () => void;
  onAdd: (configuration: StoredConfiguration) => void;
}) {
  const spec = useMemo(() => customizationFor(item), [item]);
  const [selected, setSelected] = useState(() => initialSelection(spec));
  const [broken, setBroken] = useState(false);
  const [pinHeight, setPinHeight] = useState(48);
  const [stacked, setStacked] = useState(false);
  const resolved = configurationFrom(item, spec, selected);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setSelected(initialSelection(spec));
    setBroken(false);
    setStacked(false);
    scrollRef.current?.scrollTo(0, 0);
  }, [item.id, spec]);

  useEffect(() => {
    const node = pinRef.current;
    if (!node) return;
    const update = () => setPinHeight(node.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [item.id, stacked]);

  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    const update = () => {
      const pin = pinRef.current;
      setStacked(!!pin && pin.getBoundingClientRect().top <= 1);
    };
    update();
    scroll.addEventListener('scroll', update, { passive: true });
    return () => scroll.removeEventListener('scroll', update);
  }, [item.id, inset]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  function toggle(group: CustomizationGroup, choiceId: string) {
    setSelected(current => {
      const picked = current[group.id] ?? [];
      if (group.selection === 'single') {
        if (!group.required && picked.length === 1 && picked[0] === choiceId) {
          return { ...current, [group.id]: [] };
        }
        return { ...current, [group.id]: [choiceId] };
      }
      return {
        ...current,
        [group.id]: picked.includes(choiceId) ? picked.filter(id => id !== choiceId) : [...picked, choiceId],
      };
    });
  }

  function choiceLabel(group: CustomizationGroup, choice: CustomizationGroup['choices'][number]) {
    if (group.kind === 'portion') return choice.name;
    if (group.kind === 'size' || choice.price > 0) return `${choice.name} [+${formatRupee(choice.price)}]`;
    return choice.name;
  }

  return (
    <div
      className="customizer"
      style={{
        '--customizer-inset': `${inset}px`,
        '--customizer-pin-h': `${pinHeight}px`,
      } as CSSProperties}
    >
      <div className="customizer-scroll" ref={scrollRef}>
        <div className="customizer-rise">
          <button type="button" className="customizer-close" onClick={onClose} aria-label="Close customization">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M3 3l8 8M11 3 3 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="customizer-sheet">
          <header className="customizer-heading customizer-pin" ref={pinRef}>
            {stacked && (
              <button type="button" className="customizer-back" onClick={onClose} aria-label="Back">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div className="customizer-title">
              <Mark type={item.foodType} />
              <h2>{item.name}</h2>
            </div>
          </header>
          <div className="customizer-photo-wrap">
            <div className="customizer-photo">
              {item.imageUrl && !broken ? (
                <img src={item.imageUrl} alt="" onError={() => setBroken(true)} />
              ) : (
                <span className="media-fallback" />
              )}
            </div>
          </div>
          <div className="customizer-options">
          {spec.groups.map(group => {
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
                        {choice.foodType && <Mark type={choice.foodType} />}
                        {choiceLabel(group, choice)}
                      </span>
                      <Check on={on} />
                    </button>
                  );
                })}
              </section>
            );
          })}
          </div>
        </div>
      </div>
      <footer className="customizer-bar">
        <div className="customizer-summary">
          <p>{resolved.barLabel}</p>
          <strong aria-live="polite">{formatRupee(resolved.unitPrice)}</strong>
        </div>
        <button type="button" className="customizer-add" disabled={!selectionReady(spec, selected)} onClick={() => onAdd(resolved)}>ADD</button>
      </footer>
    </div>
  );
}
