import { router, type Href } from 'expo-router';

/** Back that also works after a page refresh on the web (no history → go to a sensible screen). */
export function goBack(fallback: Href = '/(tabs)/path') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
