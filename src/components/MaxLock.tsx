import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown, Lock } from './icons';
import { Txt } from './ui';
import { radius } from '../theme/tokens';
import { router } from 'expo-router';
import { requireMax, useIsMax, type MaxReason } from '../lib/premium';
import { useT } from '../i18n';

/** Card shown where Free ends: "N more in Max". */
export function MaxLockCard({ reason, title, sub }: { reason: MaxReason; title: string; sub?: string }) {
  return (
    <Pressable onPress={() => requireMax(reason)} style={{ borderRadius: radius.l, overflow: 'hidden', marginVertical: 10 }}>
      <LinearGradient colors={['#1F1B3A', '#4B2F86']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,214,107,.18)', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={18} color="#FFD66B" />
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium" color="#fff">{title}</Txt>
          {sub ? <Txt v="caption" color="rgba(255,255,255,.7)">{sub}</Txt> : null}
        </View>
        <Crown size={20} color="#FFD66B" />
      </LinearGradient>
    </Pressable>
  );
}

/** Small gold lock badge for tiles and chips. */
export function MaxBadge({ size = 18 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFD66B', alignItems: 'center', justifyContent: 'center' }}>
      <Lock size={size * 0.6} color="#1F1B3A" />
    </View>
  );
}

/** Always-visible entry to Max: a crown pill. Gold "MAX" when active, purple "Max" with a crown otherwise. */
export function MaxPill({ compact }: { dark?: boolean; compact?: boolean }) {
  const max = useIsMax();
  const { t } = useT();
  return (
    <Pressable onPress={() => router.push('/premium')} accessibilityLabel="Thingual Max" hitSlop={6}
      style={{ borderRadius: 999, overflow: 'hidden' }}>
      <LinearGradient colors={max ? ['#FFE29A', '#F5B83D'] : ['#2E2160', '#6D3FD0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 34, minWidth: 34, paddingHorizontal: compact && !max ? 0 : 11 }}>
        <Crown size={15} color={max ? '#1F1B3A' : '#FFD66B'} fill={max ? '#1F1B3A' : '#FFD66B'} />
        {compact && !max ? null : <Txt v="captionMedium" color={max ? '#1F1B3A' : '#fff'} style={{ fontSize: 12, letterSpacing: max ? 0.8 : 0 }}>{max ? t('max.active') : t('max.crown')}</Txt>}
      </LinearGradient>
    </Pressable>
  );
}
