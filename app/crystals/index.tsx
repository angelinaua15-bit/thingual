import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Gem, Lock, X } from '../../src/components/icons';
import { Txt } from '../../src/components/ui';
import { EmojiArt } from '../../src/components/NoteBits';
import { TimeCard } from '../../src/components/TimeCard';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { ACCENTS, WORD_PACKS } from '../../src/data/wordPacks';
import { useIsMax } from '../../src/lib/premium';
import { haptic } from '../../src/lib/feedback';
import { goBack } from '../../src/lib/nav';

/** Crystals: earned for time spent learning, spent on colour themes and fun word collections. */
export default function Crystals() {
  const { c, isDark } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const crystals = useApp((s) => s.crystals);
  const unlocks = useApp((s) => s.unlocks);
  const accent = useApp((s) => s.settings.accent ?? 'classic');
  const max = useIsMax();
  const L = (o: { en: string; uk: string }) => (code === 'uk' ? o.uk : o.en);

  const buy = (id: string, price: number, then?: () => void) => {
    const r = useApp.getState().unlockReward(id, price);
    if (r === 'funds') {
      haptic.error();
      toast(t('cr.needMore', { n: price - crystals }));
      return;
    }
    if (r === 'ok') {
      haptic.success();
      toast(t('cr.unlocked'), 'success');
    }
    then?.();
  };

  const pickAccent = (id: string, price: number) => {
    const owned = price === 0 || unlocks.includes(`accent:${id}`);
    const apply = () => useApp.getState().updateSettings({ accent: id });
    if (owned) {
      haptic.light();
      apply();
    } else buy(`accent:${id}`, price, () => useApp.getState().unlocks.includes(`accent:${id}`) && apply());
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <LinearGradient colors={['#2B1B6B', '#5B3FD0', '#9F7AEA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 8, paddingHorizontal: space.l, paddingBottom: space.l }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Pressable onPress={() => goBack('/(tabs)/learn')} hitSlop={12} style={styles.close}><X size={20} color="#fff" /></Pressable>
          </View>
          <View style={{ maxWidth: 600, width: '100%', alignSelf: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Gem size={40} color="#fff" fill="rgba(255,255,255,.35)" />
              <Txt style={{ fontFamily: fonts.serif, fontSize: 64, lineHeight: 68, color: '#fff' }}>{crystals}</Txt>
            </View>
            <Txt v="headline" color="#fff" style={{ marginTop: 4 }}>{t('cr.title')}</Txt>
            <Txt v="callout" color="rgba(255,255,255,.8)" style={{ marginTop: 6 }}>{t('cr.sub')}{max ? ` ${t('cr.maxDouble')}` : ''}</Txt>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: space.m, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <TimeCard compact />

          {/* colour themes */}
          <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('cr.themes')}</Txt>
          <View style={styles.grid}>
            {ACCENTS.map((a, i) => {
              const owned = a.price === 0 || unlocks.includes(`accent:${a.id}`);
              const on = accent === a.id;
              return (
                <Animated.View key={a.id} entering={FadeInDown.delay(i * 40)} style={{ width: '31%', flexGrow: 1 }}>
                  <Pressable onPress={() => pickAccent(a.id, a.price)} style={[styles.theme, { backgroundColor: c.surface, borderColor: on ? c.text : c.divider, borderWidth: on ? 2 : StyleSheet.hairlineWidth }]}>
                    <View style={[styles.swatch, { backgroundColor: isDark ? a.dark : a.light }]}>
                      {on ? <Check size={18} color="#fff" strokeWidth={3} /> : !owned ? <Lock size={14} color="#fff" /> : null}
                    </View>
                    <Txt v="captionMedium" numberOfLines={1}>{L(a.name)}</Txt>
                    {owned ? (
                      <Txt v="caption" color={c.textTertiary}>{on ? t('cr.on') : t('cr.owned')}</Txt>
                    ) : (
                      <View style={styles.price}><Gem size={12} color="#7C5CFF" /><Txt v="caption" color="#7C5CFF">{a.price}</Txt></View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* word collections */}
          <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('cr.packs')}</Txt>
          <View style={{ gap: 10 }}>
            {WORD_PACKS.map((p, i) => {
              const owned = unlocks.includes(`pack:${p.id}`);
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(i * 50)}>
                  <Pressable
                    onPress={() => (owned ? router.push({ pathname: '/crystals/[pack]', params: { pack: p.id } }) : buy(`pack:${p.id}`, p.price, () => useApp.getState().unlocks.includes(`pack:${p.id}`) && router.push({ pathname: '/crystals/[pack]', params: { pack: p.id } })))}
                    style={[styles.pack, { backgroundColor: c.surface, borderColor: c.divider }]}
                  >
                    <View style={[styles.packIc, { backgroundColor: c.surfaceAlt }]}><EmojiArt emoji={p.emoji} size={34} /></View>
                    <View style={{ flex: 1 }}>
                      <Txt v="bodyMedium">{L(p.title)}</Txt>
                      <Txt v="caption" color={c.textSecondary} numberOfLines={2}>{L(p.sub)} · {t('cr.words', { n: p.words.length })}</Txt>
                    </View>
                    {owned ? (
                      <Txt v="captionMedium" color={c.accent}>{t('cr.open')}</Txt>
                    ) : (
                      <View style={[styles.buy, { backgroundColor: crystals >= p.price ? '#7C5CFF' : c.surfaceAlt }]}>
                        <Gem size={13} color={crystals >= p.price ? '#fff' : '#7C5CFF'} />
                        <Txt v="captionMedium" color={crystals >= p.price ? '#fff' : '#7C5CFF'}>{p.price}</Txt>
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* how it works */}
          <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('cr.how')}</Txt>
          <View style={[styles.how, { backgroundColor: c.surface, borderColor: c.divider }]}>
            {[t('cr.how1'), t('cr.how2'), t('cr.how3')].map((x) => (
              <View key={x} style={{ flexDirection: 'row', gap: 10 }}>
                <Gem size={15} color="#7C5CFF" style={{ marginTop: 3 }} />
                <Txt v="callout" style={{ flex: 1 }}>{x}</Txt>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.18)', alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space.l, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  theme: { alignItems: 'center', gap: 6, padding: 12, borderRadius: radius.l },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  pack: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  packIc: { width: 54, height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buy: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 34, borderRadius: 17 },
  how: { padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
});
