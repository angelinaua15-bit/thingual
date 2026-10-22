import { Platform } from 'react-native';
import { reportError } from './api';

let sent = 0;
const seen = new Set<string>();
function send(message: string, stack?: string) {
  if (sent >= 10 || seen.has(message)) return;
  seen.add(message);
  sent++;
  reportError(message, stack).catch(() => {});
}

/** Catch crashes on people's devices (web + native) and report them. */
export function initErrorLog() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('error', (e) => send(String(e.message || e.error), e.error?.stack));
    window.addEventListener('unhandledrejection', (e) => {
      const r = (e as PromiseRejectionEvent).reason;
      // network hiccups are expected offline — not bugs
      const msg = String(r?.message ?? r);
      if (/fetch|network|Load failed|AbortError/i.test(msg)) return;
      send(msg, r?.stack);
    });
  } else {
    const g = globalThis as unknown as { ErrorUtils?: { getGlobalHandler: () => (e: Error, f?: boolean) => void; setGlobalHandler: (h: (e: Error, f?: boolean) => void) => void } };
    const prev = g.ErrorUtils?.getGlobalHandler();
    g.ErrorUtils?.setGlobalHandler((e, fatal) => { send(e.message, e.stack); prev?.(e, fatal); });
  }
}

export { send as logError };
