import { Platform } from 'react-native';

/** Web Speech API recognition (Chrome, Edge, Safari). Native builds plug in a speech module here. */
export const speechRecognitionAvailable = () =>
  Platform.OS === 'web' && typeof window !== 'undefined' && !!((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);

export function listenOnce(locale: string, onResult: (text: string) => void, onEnd: () => void) {
  const W = window as unknown as Record<string, new () => {
    lang: string; interimResults: boolean; maxAlternatives: number; start: () => void; stop: () => void;
    onresult: (e: { results: { 0: { transcript: string } }[] }) => void; onend: () => void; onerror: () => void;
  }>;
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  if (!Ctor) return () => {};
  const rec = new Ctor();
  rec.lang = locale;
  rec.interimResults = false;
  rec.maxAlternatives = 3;
  rec.onresult = (e) => onResult(e.results[0][0].transcript);
  rec.onend = onEnd;
  rec.onerror = onEnd;
  rec.start();
  return () => rec.stop();
}

export { similarity } from './similarity';
