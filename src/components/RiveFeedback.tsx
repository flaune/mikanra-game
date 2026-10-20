import { useEffect, useRef, useState } from 'react';
import type { Rive } from '@rive-app/canvas-lite';

/** Cosmetic only: missing WASM or artwork never interrupts café service. */
export default function RiveFeedback({ fraction }: { fraction: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const instance = useRef<Rive | null>(null);
  const latest = useRef(fraction); latest.current = fraction;
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false; let resize: ResizeObserver | undefined;
    void import('@rive-app/canvas-lite').then(({ Rive, RuntimeLoader }) => {
      if (cancelled || !canvas.current) return;
      RuntimeLoader.setWasmUrl(`${import.meta.env.BASE_URL}rive/rive.wasm`);
      const r = new Rive({ src: `${import.meta.env.BASE_URL}rive/cafe-feedback.riv`, canvas: canvas.current, stateMachine: 'Service', autoplay: true, autoBind: true,
        onLoad: () => { if (cancelled) return; r.resizeDrawingSurfaceToCanvas(); const value = r.viewModelInstance?.number('progress'); if (value) value.value = latest.current; setLoaded(true); },
        onLoadError: () => setLoaded(false) });
      instance.current = r;
      resize = new ResizeObserver(() => r.resizeDrawingSurfaceToCanvas()); resize.observe(canvas.current);
    }).catch(() => { if (!cancelled) setLoaded(false); });
    return () => { cancelled = true; resize?.disconnect(); instance.current?.cleanup(); instance.current = null; };
  }, []);
  useEffect(() => { const value = instance.current?.viewModelInstance?.number('progress'); if (value) value.value = fraction; }, [fraction]);
  return <div className="rive-feedback" aria-hidden="true" data-rive-loaded={loaded}><canvas ref={canvas} style={{ opacity: loaded ? 1 : 0 }} />{!loaded && <span className="rive-fallback">{fraction >= 1 ? '✓ Cup ready' : '☕'}</span>}</div>;
}
