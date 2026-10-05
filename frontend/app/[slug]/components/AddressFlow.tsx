'use client';

import { useState } from 'react';

export type SavedAddress = { flat: string; society: string; area: string };

export type AddressStep = 'location' | 'details';

// Stands in for a places search until a maps provider is wired up.
const AREAS = [
  'Sector 67, Gurgaon, Haryana',
  'Sector 56, Gurgaon, Haryana',
  'DLF Phase 4, Gurgaon, Haryana',
  'Golf Course Road, Gurgaon, Haryana',
  'Sushant Lok 1, Gurgaon, Haryana',
];

export function addressLabel(address: SavedAddress) {
  return [address.flat, address.society].filter(Boolean).join(', ') || address.area;
}

function Locate() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="11" r="2" fill="currentColor" />
    </svg>
  );
}

export function AddressFlow({
  initial,
  startStep = 'location',
  onCancel,
  onSave,
}: {
  initial?: SavedAddress | null;
  startStep?: AddressStep;
  onCancel: () => void;
  onSave: (address: SavedAddress) => void;
}) {
  const [step, setStep] = useState<AddressStep>(startStep);
  const [area, setArea] = useState(initial?.area ?? '');
  const [query, setQuery] = useState('');
  const [picking, setPicking] = useState(false);
  const [flat, setFlat] = useState(initial?.flat ?? '');
  const [society, setSociety] = useState(initial?.society ?? '');

  const needle = query.trim().toLowerCase();
  const matches = picking ? AREAS.filter(option => !needle || option.toLowerCase().includes(needle)) : [];

  function chooseArea(option: string) {
    setArea(option);
    setQuery(option);
    setPicking(false);
  }

  return (
    <div className="cart-screen address-screen">
      <header className="cart-header">
        <div className="cart-title">
          <button
            type="button"
            className="cart-back"
            onClick={step === 'details' ? () => setStep('location') : onCancel}
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 5 8 12l7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1>{step === 'location' ? 'Select Location' : 'Address'}</h1>
        </div>
        <div className="store-scallop" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => <span key={index} />)}
        </div>
      </header>

      {step === 'location' ? (
        <div className="map-pane">
          <button type="button" className="map-locate" onClick={() => chooseArea(AREAS[0])} aria-label="Use current location">
            <Locate />
          </button>
          {matches.length > 0 && (
            <ul className="map-results">
              {matches.map(option => (
                <li key={option}>
                  <button type="button" onPointerDown={() => chooseArea(option)}>{option}</button>
                </li>
              ))}
            </ul>
          )}
          <label className="map-search">
            <input
              value={query}
              onChange={event => {
                setQuery(event.target.value);
                setPicking(true);
              }}
              onFocus={() => setPicking(true)}
              onBlur={() => setPicking(false)}
              aria-label="Search for your area"
              placeholder="Search for your area"
            />
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#30404e" strokeWidth="2.2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </label>
        </div>
      ) : (
        <>
          <div className="address-form">
            <input
              value={flat}
              onChange={event => setFlat(event.target.value)}
              aria-label="Flat or house number"
              placeholder="Flat/House Number(Add floor)"
            />
            <input
              value={society}
              onChange={event => setSociety(event.target.value)}
              aria-label="Society, colony, sector or building name"
              placeholder="Society/Colony/Sector/Building Name"
            />
            <p className="address-area">{area}</p>
          </div>
        </>
      )}

      <footer className="customizer-bar address-bar">
        {step === 'location' ? (
          <button type="button" className="customizer-add" disabled={!area.trim()} onClick={() => setStep('details')}>Next</button>
        ) : (
          <button
            type="button"
            className="customizer-add"
            disabled={!flat.trim()}
            onClick={() => onSave({ flat: flat.trim(), society: society.trim(), area })}
          >SAVE</button>
        )}
      </footer>
    </div>
  );
}
