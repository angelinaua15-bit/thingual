import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt, PressableScale } from '../src/components/ui';
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
  const pick = (a: AgeGroup) => {
    setAge(a);
    updateProfile({ age_group: a }).catch(() => {});
    if (a === 'under13') toast(t('age.kidsNote'), 'default');
    router.back();
  };
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={FadeIn} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: c.overlay }]} onPress={() => router.back()} />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(20)} style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: insets.bottom + 24, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Txt v="title">{t('age.title')}</Txt>
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 8, marginBottom: 20 }}>{t('age.sub')}</Txt>
        <View style={{ gap: 10 }}>
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
