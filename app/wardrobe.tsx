import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Check, Gem, X } from '../src/components/icons';
import { Txt, Segmented } from '../src/components/ui';
import { EmojiArt } from '../src/components/NoteBits';
import { FoxArt, ChunkyButton } from '../src/components/PathBits';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { WARDROBE, wearById, type Slot } from '../src/data/wardrobe';
import { haptic } from '../src/lib/feedback';
import { goBack } from '../src/lib/nav';

/** Tingo's wardrobe: try things on for free, buy them with crystals, wear them everywhere. */
export default function Wardrobe() {
  const { c } = useTheme();
  const { t, code } = useT();
  const insets = useSafeAreaInsets();
  const look = useApp((s) => s.foxLook);
  const unlocks = useApp((s) => s.unlocks);
  const crystals = useApp((s) => s.crystals);
  const [slot, setSlot] = useState<Slot>('hat');
  const [trying, setTrying] = useState<string | null>(null);
  const L = (o: { en: string; uk: string }) => (code === 'uk' ? o.uk : o.en);
  const owned = (id: string) => unlocks.includes(`fox:${id}`);
  const tryItem = wearById(trying ?? undefined);
  const preview = tryItem ? { ...look, [tryItem.slot]: tryItem.id } : look;

  const tap = (id: string) => {
    haptic.light();
    const w = wearById(id)!;
    if (owned(id)) {
      // tap a worn item again to take it off
      useApp.getState().setFoxLook({ [w.slot]: look[w.slot] === id ? undefined : id });
      setTrying(null);
    } else setTrying(trying === id ? null : id);
  };

  const buy = () => {
    if (!tryItem) return;
    const r = useApp.getState().unlockReward(`fox:${tryItem.id}`, tryItem.price);
    if (r === 'funds') {
      haptic.error();
      toast(t('cr.needMore', { n: tryItem.price - crystals }));
      return;
    }
    haptic.success();
    useApp.getState().setFoxLook({ [tryItem.slot]: tryItem.id });
    toast(t('wardrobe.bought'), 'success');
    setTrying(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <LinearGradient colors={['#FDE7C8', '#F9C79A', '#F4A261']} style={{ paddingTop: insets.top + 8, paddingBottom: 24, alignItems: 'center' }}>
        <View style={styles.top}>
          <View style={styles.balance}><Gem size={15} color="#7C5CFF" fill="#C4B5FD" /><Txt v="captionMedium" color="#2B1B0E">{crystals}</Txt></View>
          <Pressable onPress={() => goBack('/(tabs)/path')} hitSlop={12} style={styles.close}><X size={20} color="#2B1B0E" /></Pressable>
        </View>
        <Animated.View key={JSON.stringify(preview)} entering={ZoomIn.springify().damping(12)} style={{ marginTop: 40 }}>
          <FoxArt size={150} look={preview} />
        </Animated.View>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 32, color: '#2B1B0E', marginTop: 14 }}>{t('wardrobe.title')}</Txt>
        <Txt v="callout" color="#5B3A1E" center style={{ marginTop: 4, paddingHorizontal: 24 }}>{t('wardrobe.sub')}</Txt>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 120, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Segmented<Slot> value={slot} onChange={(v) => { setSlot(v); setTrying(null); }} options={[{ value: 'hat', label: t('wardrobe.hat') }, { value: 'face', label: t('wardrobe.face') }, { value: 'neck', label: t('wardrobe.neck') }]} />
        <View style={styles.grid}>
          {WARDROBE.filter((w) => w.slot === slot).map((w, i) => {
            const own = owned(w.id);
            const on = look[w.slot] === w.id;
            const tr = trying === w.id;
            return (
              <Animated.View key={w.id} entering={FadeInDown.delay(i * 40)} style={{ width: '31%', flexGrow: 1 }}>
                <Pressable onPress={() => tap(w.id)} style={[styles.item, { backgroundColor: c.surface, borderColor: on || tr ? '#F59E0B' : c.divider, borderWidth: on || tr ? 2 : StyleSheet.hairlineWidth }]}>
                  <EmojiArt emoji={w.emoji} size={46} />
                  <Txt v="captionMedium" center numberOfLines={1}>{L(w.name)}</Txt>
                  {own ? (
                    <View style={styles.price}>{on ? <Check size={13} color="#2FB574" strokeWidth={3} /> : null}<Txt v="caption" color={on ? '#2FB574' : c.textTertiary}>{on ? t('wardrobe.wearing') : t('wardrobe.owned')}</Txt></View>
                  ) : (
                    <View style={styles.price}><Gem size={12} color="#7C5CFF" /><Txt v="caption" color="#7C5CFF">{w.price}</Txt></View>
                  )}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        <Txt v="caption" color={c.textTertiary} center style={{ marginTop: 16 }}>{t('wardrobe.hint')}</Txt>
      </ScrollView>

      {tryItem && (
        <Animated.View entering={FadeInDown.springify()} style={[styles.buyBar, { paddingBottom: insets.bottom + 14, backgroundColor: c.background, borderTopColor: c.divider }]}>
          <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center' }}>
            <ChunkyButton title={t('wardrobe.buy', { name: L(tryItem.name), n: tryItem.price })} color={crystals >= tryItem.price ? '#7C5CFF' : '#A1A1AA'} onPress={buy} />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 16 },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.6)' },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.6)', alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  item: { alignItems: 'center', gap: 6, padding: 12, borderRadius: radius.l },
  price: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.m, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
