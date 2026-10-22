import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useApp } from '../store/useApp';
import { usePlayer } from './player';

/**
 * Counts real learning time for crystals: the app is on screen AND the learner touched or typed in the
 * last 90 seconds (or an audiobook is playing). Idle screens don't earn anything.
 */
let lastTouch = Date.now();
export const markActivity = () => {
  lastTouch = Date.now();
};
const TICK = 10;

export function ActivityTracker() {
  useEffect(() => {
    let state = AppState.currentState;
    const sub = AppState.addEventListener('change', (s) => {
      state = s;
      if (s === 'active') lastTouch = Date.now();
    });
    const onKey = () => markActivity();
    const WEB_EVENTS = ['keydown', 'pointerdown', 'wheel'] as const;
    if (Platform.OS === 'web' && typeof window !== 'undefined') WEB_EVENTS.forEach((e) => window.addEventListener(e, onKey, { passive: true }));
    const id = setInterval(() => {
      const st = useApp.getState();
      if (!st.onboarded) return;
      const visible = Platform.OS === 'web' ? typeof document === 'undefined' || document.visibilityState === 'visible' : state === 'active';
      const listening = usePlayer.getState().playing;
      if ((visible && Date.now() - lastTouch < 90_000) || listening) st.addActiveTime(TICK);
    }, TICK * 1000);
    return () => {
      clearInterval(id);
      sub.remove();
      if (Platform.OS === 'web' && typeof window !== 'undefined') WEB_EVENTS.forEach((e) => window.removeEventListener(e, onKey));
    };
  }, []);
  return null;
}
