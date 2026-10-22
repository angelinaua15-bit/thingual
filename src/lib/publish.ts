import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../store/useApp';
import { toast } from '../components/Overlay';
import { translate } from '../i18n';

/** Age gate before any public post (spec §3). Returns true when the user may publish now. */
export function ensureCanPublish(): boolean {
  const s = useApp.getState();
  if (s.familyMode.enabled) {
    toast(translate(s.settings.uiLang, 'settings.familyBlocked'), 'default');
    return false;
  }
  const age = s.profile.ageGroup;
  // App Store guideline 1.2: people accept the community terms before posting
  if (!age || !s.profile.termsAt) {
    router.push('/age');
    return false;
  }
  if (age === 'under13') {
    toast(translate(s.settings.uiLang, 'age.kidsNote'), 'default');
    return false;
  }
  return true;
}

const round = (v: number) => Math.round(v / 0.02) * 0.02;
const GEO_URL = Platform.OS === 'web' ? '/api/geo' : 'https://thingual.vercel.app/api/geo';
const REGION = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;

/** City from the network (Vercel edge geo). No permission needed, accurate to the city. */
async function networkCity(): Promise<{ place: string; lat: number; lng: number } | null> {
  try {
    const r = await fetch(GEO_URL);
    const g = (await r.json()) as { city: string | null; country: string | null; lat: number | null; lng: number | null };
    if (g.lat == null || g.lng == null) return null;
    let country = g.country ?? '';
    try { if (country && REGION) country = REGION.of(country) ?? country; } catch {}
    return { place: [g.city, country].filter(Boolean).join(', '), lat: round(g.lat), lng: round(g.lng) };
  } catch {
    return null;
  }
}

const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

/**
 * City-level location for a post. GPS coordinates are rounded to a ~2 km grid before they leave the phone,
 * the label is the city only. Falls back to the network city when location is blocked or slow.
 */
export async function getMyCity(): Promise<{ place: string; lat: number; lng: number } | null> {
  const net = networkCity();
  try {
    const perm = await withTimeout(Location.requestForegroundPermissionsAsync(), 8000);
    if (perm?.granted) {
      const pos = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest }), 8000);
      if (pos) {
        const lat = round(pos.coords.latitude);
        const lng = round(pos.coords.longitude);
        let place = '';
        if (Platform.OS !== 'web') {
          const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => []);
          if (geo[0]) place = [geo[0].city ?? geo[0].subregion, geo[0].country].filter(Boolean).join(', ');
        }
        if (!place) place = (await net)?.place ?? '';
        return { place, lat, lng };
      }
    }
  } catch {}
  return net;
}
