import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt, PressableScale } from '../src/components/ui';
import { Check } from '../src/components/icons';
import { toast } from '../src/components/Overlay';
import { useTheme, radius } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp, AgeGroup } from '../src/store/useApp';
import { updateProfile } from '../src/lib/api';

/** Age gate before the first public post: only an age group is stored (spec §3). */
export default function AgeGate() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const setAge = useApp((x) => x.setAgeGroup);
  const accepted = useApp((x) => !!x.profile.termsAt);
  const [agree, setAgree] = useState(accepted);
  const pick = (a: AgeGroup) => {
    if (!agree) return toast(t('age.needTerms'));
    useApp.getState().setLocalProfile({ termsAt: Date.now() });
    setAge(a);
    updateProfile({ age_group: a }).catch(() => {});
    if (a === 'under13') toast(t('age.kidsNote'), 'default');
    goBack();
  };
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={FadeIn} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={() => goBack()} />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(20)} style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 24, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Txt v="title">{t('age.title')}</Txt>
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 8, marginBottom: 20 }}>{t('age.sub')}</Txt>
        <Pressable onPress={() => setAgree(!agree)} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16 }}>
          <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: agree ? c.accent : c.textTertiary, backgroundColor: agree ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
            {agree ? <Check size={15} color={c.onAccent} /> : null}
          </View>
          <Txt v="caption" color={c.textSecondary} style={{ flex: 1 }}>
            {t('age.terms')}{' '}
            <Txt v="captionMedium" color={c.accent} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })}>{t('legal.terms')}</Txt>
          </Txt>
        </Pressable>
        <View style={{ gap: 10, opacity: agree ? 1 : 0.5 }}>
          {(['under13', 'teen', 'adult'] as AgeGroup[]).map((a) => (
            <PressableScale key={a} onPress={() => pick(a)} style={{ height: 56, borderRadius: radius.m, backgroundColor: c.surfaceAlt, justifyContent: 'center', paddingHorizontal: 18 }}>
              <Txt v="bodyMedium">{t(`age.${a}`)}</Txt>
            </PressableScale>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
