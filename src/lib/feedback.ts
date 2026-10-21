import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { useApp } from '../store/useApp';
import { LangCode, lang } from '../data/languages';

export const haptic = {
  light: () => {
    if (Platform.OS === 'web' || !useApp.getState().settings.haptics) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success: () => {
    if (Platform.OS === 'web' || !useApp.getState().settings.haptics) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error: () => {
    if (Platform.OS === 'web' || !useApp.getState().settings.haptics) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};

/** Neural TTS of the platform. In production audio is pre-generated and cached in the CDN. */
export async function speak(text: string, code: LangCode, opts?: { slow?: boolean; onDone?: () => void }) {
  const s = useApp.getState().settings;
  const voices = await Speech.getAvailableVoicesAsync().catch(() => []);
  const locale = lang(code).voice;
  const candidates = voices.filter((v) => v.language?.toLowerCase().startsWith(locale.slice(0, 2).toLowerCase()));
  const wantMale = s.voice === 'male';
  const pick =
    candidates.find((v) => (wantMale ? /male|daniel|thomas|jorge|diego|yuri/i : /female|samantha|anna|monica|amelie|kyoko/i).test(`${v.name} ${v.identifier}`)) ??
    candidates[0];
  Speech.stop();
  Speech.speak(text, {
    language: locale,
    voice: pick?.identifier,
    rate: opts?.slow || s.slowVoice ? 0.7 : 0.95,
    onDone: opts?.onDone,
    onStopped: opts?.onDone,
  });
}

export const stopSpeaking = () => Speech.stop();

export function timeAgo(ts: number, t: (k: string, v?: Record<string, string | number>) => string) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('time.now');
  if (m < 60) return t('time.ago', { t: t('time.min', { n: m }) });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.ago', { t: t('time.hour', { n: h }) });
  return t('time.ago', { t: t('time.day', { n: Math.floor(h / 24) }) });
}

export const formatLate = (minutes: number, t: (k: string, v?: Record<string, string | number>) => string) =>
  minutes < 60 ? t('time.min', { n: minutes }) : t('time.hour', { n: Math.round(minutes / 60) });
