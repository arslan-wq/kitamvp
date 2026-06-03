'use client';

import { useState } from 'react';

type Kind = 'phone' | 'emergency' | 'email' | 'address';

// T12: klickbare Kontaktangaben — Telefon ruft an (tel:), E-Mail wird kopiert
// (mit Meldung), Adresse öffnet Karten.
export default function ContactLink({ kind, value, className = '' }: { kind: Kind; value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  if (kind === 'phone' || kind === 'emergency') {
    const tel = value.replace(/[^+0-9]/g, '');
    const cls = kind === 'emergency'
      ? 'inline-flex items-center gap-1.5 bg-red-50 text-red-700 font-semibold rounded-xl px-3 py-1.5 hover:bg-red-100 transition'
      : 'text-secondary-600 hover:text-primary-700 underline-offset-2 hover:underline';
    return (
      <a href={`tel:${tel}`} className={`${cls} ${className}`}>
        {kind === 'emergency' ? `🚨 Notfall: ${value}` : <>📞 {value}</>}
      </a>
    );
  }

  if (kind === 'email') {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Fallback: temporäres Textfeld
        const ta = document.createElement('textarea');
        ta.value = value; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch { /* ignore */ }
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    return (
      <button type="button" onClick={copy} className={`inline-flex items-center gap-1.5 text-secondary-600 hover:text-primary-700 ${className}`} title="E-Mail in Zwischenablage kopieren">
        ✉️ <span className="break-all">{value}</span>
        {copied && <span className="ml-1 text-xs font-semibold text-primary-700">✓ kopiert</span>}
      </button>
    );
  }

  // address
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
  return (
    <a href={maps} target="_blank" rel="noopener noreferrer" className={`text-secondary-600 hover:text-primary-700 underline-offset-2 hover:underline ${className}`}>
      📍 {value}
    </a>
  );
}
