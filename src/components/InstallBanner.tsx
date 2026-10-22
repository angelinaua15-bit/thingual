import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Download, X } from './icons';
import { Txt } from './ui';
import { toast } from './Overlay';
import { LogoMark } from './Logo';
import { useTheme, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { isIOSWeb, promptInstall, useInstallable } from '../lib/pwa';

const KEY = 'thingual-install-dismissed';
const dismissed = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };

/** "Install Thingual" card: native prompt on Android/desktop, instructions on iPhone. */
export function InstallBanner({ always = false }: { always?: boolean }) {
  const { c } = useTheme();
  const { t } = useT();
  const installable = useInstallable();
  const [hidden, setHidden] = useState(() => !always && dismissed());
  if (!installable || hidden) return null;
  const install = async () => {
    if (isIOSWeb()) return toast(t('pwa.iosHint'));
    await promptInstall();
  };
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOut} style={{ marginTop: 12 }}>
      <Pressable onPress={install} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, backgroundColor: c.accentSoft }}>
        <LogoMark size={42} />
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium">{t('pwa.title')}</Txt>
          <Txt v="caption" color={c.textSecondary}>{isIOSWeb() ? t('pwa.iosHint') : t('pwa.sub')}</Txt>
        </View>
        {!isIOSWeb() && <Download size={20} color={c.accent} />}
        {!always && (
          <Pressable hitSlop={10} onPress={() => { try { localStorage.setItem(KEY, '1'); } catch {} setHidden(true); }}>
            <X size={16} color={c.textTertiary} />
          </Pressable>
        )}
      </Pressable>
    </Animated.View>
  );
}
