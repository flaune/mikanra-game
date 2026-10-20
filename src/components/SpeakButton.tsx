import { useEffect, useRef, useState } from 'react';
import { pronounce } from '@/game/pronunciation';
import type { Playback } from '@/game/pronunciation';

export default function SpeakButton({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const [status, setStatus] = useState('');
  const playback = useRef<Playback | null>(null);
  const play = (slow: boolean) => {
    const next = pronounce(text, slow);
    playback.current = next;
    setStatus(slow ? 'Playing slowly…' : 'Playing…');
    void next.finished.then(() => {
      if (playback.current === next) setStatus('');
    }, (error: Error) => {
      if (playback.current === next) setStatus(error.message);
    });
  };
  useEffect(() => {
    if (autoPlay) {
      const next = pronounce(text);
      playback.current = next;
      void next.finished.catch(() => { /* Replay stays available if autoplay is blocked. */ });
    }
    return () => { playback.current?.cancel(); playback.current = null; };
  }, [text, autoPlay]);
  return <span className="speak-control">
    <span className="speak-buttons"><button type="button" aria-label={`Listen to ${text}`} onClick={() => play(false)}>♪ Listen</button><button type="button" aria-label={`Listen slowly to ${text}`} onClick={() => play(true)}>Slow</button></span>
    <small role="status">{status}</small>
  </span>;
}
