import { Platform, Share } from 'react-native';
import { toast } from '../components/Overlay';
import { translate } from '../i18n';
import { useApp } from '../store/useApp';

const tr = (k: string) => translate(useApp.getState().settings.uiLang, k);

/**
 * Share text everywhere: the native share sheet on phones, navigator.share on mobile browsers,
 * and a clipboard copy on desktop browsers (react-native-web's Share just rejects there).
 */
export async function shareText(message: string) {
  if (Platform.OS !== 'web') {
    await Share.share({ message }).catch(() => {});
    return;
  }
  const nav = navigator as Navigator;
  if (nav.share) {
    try {
      await nav.share({ text: message });
      return;
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
    }
  }
  try {
    await nav.clipboard.writeText(message);
    toast(tr('common.copied'), 'success');
  } catch {
    toast(tr('social.offline'));
  }
}

/** Data exports: a real file download on the web, the share sheet on phones. */
export async function shareFile(content: string, filename: string, mime: string) {
  if (Platform.OS !== 'web') return shareText(content);
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  toast(tr('common.downloaded'), 'success');
}
