import { voiceClips } from './voiceClips';

export const pronunciationKey = (text: string) => text.replace(/[\s。！!？?、，,.「」“”]/g, '');
export interface Playback { finished: Promise<void>; cancel: () => void }
let active: Playback | null = null;

/** One voice at a time. Fixed game phrases work without an installed system voice. */
export function pronounce(text: string, slow = false): Playback {
  active?.cancel();
  const clip = voiceClips[pronunciationKey(text)];
  let audio: HTMLAudioElement | undefined;
  let utterance: SpeechSynthesisUtterance | undefined;
  let finish: () => void = () => {};
  let fail: (reason: Error) => void = () => {};
  const playback: Playback = {
    finished: new Promise<void>((resolve, reject) => { finish = resolve; fail = reject; }),
    cancel: () => {
      audio?.pause();
      if (utterance && active === playback) window.speechSynthesis.cancel();
      finish();
      if (active === playback) active = null;
    },
  };
  active = playback;
  const complete = () => { finish(); if (active === playback) active = null; };
  const fallback = () => {
    if (active !== playback) return;
    const voice = window.speechSynthesis?.getVoices().find(item => item.lang.startsWith('ja'));
    if (!voice) { fail(new Error('Couldn’t play audio. Try Listen again.')); if (active === playback) active = null; return; }
    utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; utterance.voice = voice; utterance.rate = slow ? .65 : .9;
    utterance.onend = complete;
    utterance.onerror = () => { fail(new Error('Couldn’t play audio. Try Listen again.')); if (active === playback) active = null; };
    window.speechSynthesis.speak(utterance);
  };
  if (clip) {
    const base = typeof document === 'undefined' ? '/' : new URL('.', document.baseURI).pathname;
    audio = new Audio(base + clip.replace(/^\//, ''));
    audio.playbackRate = slow ? .72 : 1;
    audio.preservesPitch = true;
    audio.onended = complete;
    audio.onerror = fallback;
    void audio.play().catch(error => {
      if (active !== playback) return;
      // Autoplay can require a click, even with a downloaded clip.
      if (error.name === 'NotAllowedError') { fail(new Error('Tap Listen to hear this phrase.')); active = null; }
      else fallback();
    });
  } else fallback();
  return playback;
}
