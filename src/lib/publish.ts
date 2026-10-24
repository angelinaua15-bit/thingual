import { router } from 'expo-router';
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
