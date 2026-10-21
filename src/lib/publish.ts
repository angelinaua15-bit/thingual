import { router } from 'expo-router';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { useApp } from '../store/useApp';
import { toast } from '../components/Overlay';
import { translate } from '../i18n';

/** Age gate before any public post (spec §3). Returns true when the user may publish now. */
export function ensureCanPublish(): boolean {
  const s = useApp.getState();
  if (s.familyMode.enabled) return false;
  const age = s.profile.ageGroup;
  if (!age) {
    router.push('/age');
    return false;
  }
  if (age === 'under13') {
    toast(translate(s.settings.uiLang, 'age.kidsNote'), 'default');
    return false;
  }
  return true;
}

/**
 * City-level location for a post. Coordinates are rounded to a ~2 km grid before they leave the phone,
 * the label is the city only. Returns null when the user doesn't allow location.
 */
export async function getMyCity(): Promise<{ place: string; lat: number; lng: number } | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    const round = (v: number) => Math.round(v / 0.02) * 0.02;
    const lat = round(pos.coords.latitude);
    const lng = round(pos.coords.longitude);
    let place = '';
    if (Platform.OS !== 'web') {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => []);
      if (geo[0]) place = [geo[0].city ?? geo[0].subregion, geo[0].country].filter(Boolean).join(', ');
    }
    if (!place) {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
      place = (tz.split('/')[1] ?? '').replace(/_/g, ' ').replace('Kiev', 'Kyiv');
    }
    return { place, lat, lng };
  } catch {
    return null;
  }
}
