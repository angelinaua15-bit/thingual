import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Crown, Gem, Heart, X } from '../src/components/icons';
import { Txt } from '../src/components/ui';
import { toast } from '../src/components/Overlay';
import { ChunkyButton, useHearts } from '../src/components/PathBits';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp, HEARTS_MAX } from '../src/store/useApp';
import { requireMax } from '../src/lib/premium';
import { haptic } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

export const REFILL_PRICE = 30;

/** Hearts: what they are, when the next one comes back, and how to get them now. */
export default function Hearts() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const h = useHearts();
  const crystals = useApp((s) => s.crystals);
  const mins = h.next ? Math.max(1, Math.ceil((h.next - Date.now()) / 60000)) : 0;

  const refill = () => {
    if (useApp.getState().refillHearts(REFILL_PRICE) === 'funds') {
      haptic.error();
      toast(t('cr.needMore', { n: REFILL_PRICE - crystals }));
      return;
    }
    haptic.success();
    toast(t('hearts.refilled'), 'success');
    goBack('/(tabs)/path');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16, paddingHorizontal: space.l }}>
      <Pressable onPress={() => goBack('/(tabs)/path')} hitSlop={12} style={{ alignSelf: 'flex-end' }} accessibilityLabel={t('common.close')}><X size={24} color={c.textSecondary} /></Pressable>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', maxWidth: 460, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {Array.from({ length: HEARTS_MAX }, (_, i) => (
            <Animated.View key={i} entering={ZoomIn.delay(i * 70).springify()}>
              <Heart size={40} color={h.unlimited || i < h.n ? '#F43F5E' : c.divider} fill={h.unlimited || i < h.n ? '#F43F5E' : c.divider} />
            </Animated.View>
          ))}
        </View>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, color: c.text, textAlign: 'center', marginTop: 20 }}>
          {h.unlimited ? t('hearts.unlimited') : h.n <= 0 ? t('hearts.out') : t('hearts.title', { n: h.n })}
        </Txt>
        <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 8 }}>
          {h.unlimited ? t('hearts.unlimitedSub') : h.full ? t('hearts.fullSub') : t('hearts.nextIn', { n: mins })}
        </Txt>
        <Txt v="caption" color={c.textTertiary} center style={{ marginTop: 14 }}>{t('hearts.how')}</Txt>

        {!h.unlimited && !h.full && (
          <Animated.View entering={FadeInDown.delay(200)} style={{ width: '100%', gap: 12, marginTop: 30 }}>
            <Pressable onPress={refill} style={[styles.opt, { backgroundColor: c.surface, borderColor: c.divider }]}>
              <Heart size={26} color="#F43F5E" fill="#F43F5E" />
              <View style={{ flex: 1 }}>
                <Txt v="bodyMedium">{t('hearts.refill')}</Txt>
                <Txt v="caption" color={c.textSecondary}>{t('hearts.refillSub')}</Txt>
              </View>
              <View style={styles.price}><Gem size={14} color="#7C5CFF" /><Txt v="captionMedium" color="#7C5CFF">{REFILL_PRICE}</Txt></View>
            </Pressable>
            <Pressable onPress={() => requireMax('hearts')} style={[styles.opt, { backgroundColor: '#2B1B6B', borderColor: '#2B1B6B' }]}>
              <Crown size={24} color="#FCD34D" />
              <View style={{ flex: 1 }}>
                <Txt v="bodyMedium" color="#fff">{t('hearts.max')}</Txt>
                <Txt v="caption" color="rgba(255,255,255,.75)">{t('hearts.maxSub')}</Txt>
              </View>
            </Pressable>
          </Animated.View>
        )}
      </View>
      <View style={{ maxWidth: 460, width: '100%', alignSelf: 'center' }}>
        <ChunkyButton title={h.n > 0 || h.unlimited ? t('hearts.back') : t('hearts.wait')} color="#3B82F6" onPress={() => goBack('/(tabs)/path')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  opt: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.l, borderWidth: 1.5 },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(124,92,255,.12)' },
});
