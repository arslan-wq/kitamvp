'use client';

// KitaLuna-Ladeanimation: schwebender Heissluftballon + sanfter Text.
export default function Loader({ label = 'Lädt …', full = false }: { label?: string; full?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${full ? 'min-h-[60vh]' : 'py-12'}`}>
      <div className="kl-balloon text-5xl" role="status" aria-label="Lädt">🎈</div>
      <div className="kl-dots flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary-500" />
        <span className="w-2 h-2 rounded-full bg-primary-500" />
        <span className="w-2 h-2 rounded-full bg-primary-500" />
      </div>
      <p className="text-sm text-secondary-500">{label}</p>
    </div>
  );
}
