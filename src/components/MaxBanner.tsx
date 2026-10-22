import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Crown } from './icons';
import { Txt } from './ui';
import { fonts, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { useIsMax } from '../lib/premium';

const GOLD = '#FFD66B';
const soon = { backgroundColor: GOLD, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 };

/** Compact entry point used on Profile, Learn, Settings and Shop. */
export function MaxBanner({ style }: { style?: object }) {
  const { t, code } = useT();
  const max = useIsMax();
  const trialUsed = useApp((s) => s.trialUsed);
  const until = useApp((s) => s.maxUntil);
  const chip = max ? t('max.active') : trialUsed ? t('premium.soon') : t('max.trialChip');
  const sub = max && until ? t('max.activeUntil', { date: new Date(until).toLocaleDateString(code, { day: 'numeric', month: 'long' }) }) : t('premium.banner');
  return (
    <Pressable onPress={() => router.push('/premium')} style={[{ borderRadius: radius.l, overflow: 'hidden' }, style]}>
      <LinearGradient colors={['#1F1B3A', '#4B2F86']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <Crown size={26} color={GOLD} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 8, rowGap: 4 }}>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 24, lineHeight: 28, color: '#fff' }}>{t('premium.title')}</Txt>
            <View style={soon}><Txt v="caption" color="#1F1B3A" style={{ fontFamily: fonts.semibold, fontSize: 11 }}>{chip}</Txt></View>
          </View>
          <Txt v="caption" color="rgba(255,255,255,.72)">{sub}</Txt>
        </View>
        <ChevronRight size={20} color={GOLD} />
      </LinearGradient>
    </Pressable>
  );
}

