'use client';

import { useRef, useState, useEffect, useCallback } from 'react';

// T15: Kreis-/1:1-Crop-Modal. Bild positionieren (ziehen) + zoomen, dann speichern.
// Gibt eine quadratische JPEG-Data-URL zurück.
export default function ImageCropper({
  src, onCancel, onCrop, out = 320,
}: { src: string; onCancel: () => void; onCrop: (dataUrl: string) => void; out?: number }) {
  const C = 280; // Anzeigegröße des Crop-Fensters
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  // Bild laden → Naturmaße
  useEffect(() => {
    const im = new Image();
    im.onload = () => { imgRef.current = im; setNat({ w: im.naturalWidth, h: im.naturalHeight }); setZoom(1); setPan({ x: 0, y: 0 }); };
    im.src = src;
  }, [src]);

  const baseScale = nat ? Math.max(C / nat.w, C / nat.h) : 1;
  const scale = baseScale * zoom;

  // Pan so begrenzen, dass das Bild das Fenster immer füllt
  const clampPan = useCallback((p: { x: number; y: number }) => {
    if (!nat) return p;
    const dw = nat.w * scale, dh = nat.h * scale;
    const maxX = Math.max(0, (dw - C) / 2), maxY = Math.max(0, (dh - C) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, p.x)), y: Math.max(-maxY, Math.min(maxY, p.y)) };
  }, [nat, scale]);

  useEffect(() => { setPan(p => clampPan(p)); }, [zoom, clampPan]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const nx = drag.current.px + (e.clientX - drag.current.x);
    const ny = drag.current.py + (e.clientY - drag.current.y);
    setPan(clampPan({ x: nx, y: ny }));
  };
  const onPointerUp = () => { drag.current = null; };

  const doCrop = () => {
    if (!nat || !imgRef.current) return;
    const dw = nat.w * scale, dh = nat.h * scale;
    const imgLeft = (C - dw) / 2 + pan.x;
    const imgTop = (C - dh) / 2 + pan.y;
    const sx = -imgLeft / scale, sy = -imgTop / scale, s = C / scale;
    const canvas = document.createElement('canvas');
    canvas.width = out; canvas.height = out;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, s, s, 0, 0, out, out);
    onCrop(canvas.toDataURL('image/jpeg', 0.88));
  };

  const dw = nat ? nat.w * scale : 0;
  const dh = nat ? nat.h * scale : 0;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-elevated">
        <h2 className="text-lg font-bold text-secondary-900 mb-1">Foto zuschneiden</h2>
        <p className="text-sm text-secondary-500 mb-4">Ziehen zum Positionieren, Schieberegler zum Zoomen.</p>

        <div className="mx-auto relative overflow-hidden bg-secondary-100 touch-none select-none"
          style={{ width: C, height: C, borderRadius: '50%' }}
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {nat && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} className="absolute max-w-none cursor-move"
              style={{ width: dw, height: dh, left: (C - dw) / 2 + pan.x, top: (C - dh) / 2 + pan.y }} />
          )}
          {/* Kreis-Rahmen */}
          <div className="absolute inset-0 rounded-full ring-2 ring-white/80 pointer-events-none" />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-secondary-400 text-sm">−</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="flex-1 accent-primary-600" />
          <span className="text-secondary-400 text-sm">+</span>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="btn btn-secondary">Abbrechen</button>
          <button type="button" onClick={doCrop} className="btn btn-primary px-6">Speichern</button>
        </div>
      </div>
    </div>
  );
}
