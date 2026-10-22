import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, Crown, RotateCcw, Snowflake, Sparkle, X } from '../src/components/icons';
import { Txt, Button } from '../src/components/ui';
import { Flame } from '../src/components/Flame';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp, ShopItem } from '../src/store/useApp';
import { dateKey } from '../src/data/social';
import { dayDiff, FLAMES, FlameId, MAX_FREEZES, PRICES, REPAIR_WINDOW } from '../src/lib/streak';
import { useIsMax } from '../src/lib/premium';
import { haptic } from '../src/lib/feedback';

const PACKS = [{ n: 500, price: '$0.99' }, { n: 1500, price: '$2.99', tag: '+20%' }, { n: 5000, price: '$7.99', tag: '+60%' }];

export default function Shop() {
  const { c } = useTheme();
  const { t, ta } = useT();
  const insets = useSafeAreaInsets();
  const sparks = useApp((s) => s.sparks);
  const freezes = useApp((s) => s.freezes);
  const lost = useApp((s) => s.lostStreak);
  const flames = useApp((s) => s.flames);
  const flame = useApp((s) => s.flame);
  const max = useIsMax();
  const buy = useApp((s) => s.buy);
  const setFlame = useApp((s) => s.setFlame);
  const repairable = !!lost && dayDiff(lost.day, dateKey()) <= REPAIR_WINDOW;

  const purchase = (item: ShopItem) => {
    const r = buy(item);
    if (r === 'ok') { haptic.success(); toast(t('shop.bought'), 'success'); }
    else { haptic.error(); toast(r === 'funds' ? t('shop.noFunds') : r === 'max' ? t('shop.max') : t('shop.repairNone', { d: REPAIR_WINDOW })); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Txt v="headline" style={{ flex: 1 }}>{t('shop.title')}</Txt>
        <Pressable onPress={() => goBack()} hitSlop={12}><X size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        {/* balance */}
        <Animated.View entering={FadeInDown} style={[styles.balance, { backgroundColor: c.ink }]}>
          <Txt v="overline" color={c.background} style={{ opacity: 0.6 }}>{t('shop.balance')}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <Sparkle size={30} color="#F59F00" fill="#F59F00" />
            <Txt style={{ fontFamily: fonts.serif, fontSize: 56, lineHeight: 62, color: c.background }}>{sparks}</Txt>
          </View>
          <Txt v="caption" color={c.background} style={{ opacity: 0.7, marginTop: 6 }}>{t('shop.earn')}</Txt>
        </Animated.View>

        {/* streak items */}
        <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('shop.streakSection')}</Txt>
        <Item
          i={0}
          icon={<View style={[styles.ic, { backgroundColor: '#DBEAFE' }]}><Snowflake size={22} color="#3B82F6" /></View>}
          title={t('shop.freeze')}
          sub={`${t('shop.freezeSub', { max: MAX_FREEZES })} ${t('shop.have', { n: freezes })}`}
          price={PRICES.freeze}
          disabled={freezes >= MAX_FREEZES}
          onBuy={() => purchase('freeze')}
        />
        <Item
          i={1}
          icon={<View style={[styles.ic, { backgroundColor: c.dropSoft }]}><RotateCcw size={22} color={c.drop} /></View>}
          title={t('shop.repair')}
          sub={repairable ? t('shop.repairSub', { n: lost!.count }) : t('shop.repairNone', { d: REPAIR_WINDOW })}
          price={PRICES.repair}
          disabled={!repairable}
          onBuy={() => purchase('repair')}
        />

        {/* flames */}
        <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('shop.flames')}</Txt>
        <Txt v="caption" color={c.textSecondary} style={{ marginBottom: 10, marginTop: -4 }}>{t('shop.flamesSub')}</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {(Object.keys(FLAMES) as FlameId[]).map((id, i) => {
            const own = flames.includes(id) || (id === 'gold' && max);
            const on = flame === id;
            return (
              <Animated.View key={id} entering={FadeInDown.delay(120 + i * 60)} style={[styles.flameCard, { backgroundColor: c.surface, borderColor: on ? c.text : c.divider, borderWidth: on ? 2 : StyleSheet.hairlineWidth }]}>
                <Flame size={44} skin={id} animate={on} />
                <Txt v="bodyMedium" style={{ marginTop: 8 }}>{t(`shop.flameNames.${id}`)}</Txt>
                {own ? (
                  <Button title={on ? t('shop.equipped') : t('shop.equip')} variant={on ? 'secondary' : 'primary'} size="m" style={{ marginTop: 10, alignSelf: 'stretch', height: 38 }}
                    icon={on ? <Check size={16} color={c.text} /> : undefined} onPress={() => { haptic.light(); setFlame(id); }} />
                ) : (
                  <PriceButton price={FLAMES[id].price} onPress={() => purchase(id)} afford={sparks >= FLAMES[id].price} />
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* Thingual Max */}
        <Animated.View entering={FadeInDown.delay(300)} style={{ marginTop: space.l, borderRadius: radius.xl, overflow: 'hidden' }}>
          <Pressable onPress={() => router.push('/premium')}>
          <LinearGradient colors={['#1F1B3A', '#3B2A6B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: space.l }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Crown size={24} color="#FFD66B" />
              <Txt style={{ fontFamily: fonts.serif, fontSize: 32, lineHeight: 36, color: '#fff', flex: 1 }}>{t('shop.max_title')}</Txt>
              <View style={styles.soon}><Txt v="caption" color="#1F1B3A" style={{ fontFamily: fonts.semibold }}>{t('shop.soon')}</Txt></View>
            </View>
            <Txt v="callout" color="rgba(255,255,255,.75)" style={{ marginTop: 4 }}>{t('shop.maxSub')}</Txt>
            <View style={{ gap: 8, marginTop: 14 }}>
              {ta('shop.maxPerks').map((p) => (
                <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Check size={16} color="#FFD66B" />
                  <Txt v="callout" color="#fff">{p}</Txt>
                </View>
              ))}
            </View>
            <Txt v="captionMedium" color="#FFD66B" style={{ marginTop: 14 }}>{t('premium.open')} →</Txt>
          </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* spark packs */}
        <Txt v="overline" color={c.textSecondary} style={styles.section}>{t('shop.packs')}</Txt>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {PACKS.map((p) => (
            <View key={p.n} style={[styles.pack, { backgroundColor: c.surface, borderColor: c.divider }]}>
              {p.tag && <View style={[styles.tag, { backgroundColor: c.drop }]}><Txt v="caption" color="#fff" style={{ fontSize: 11 }}>{p.tag}</Txt></View>}
              <Sparkle size={26} color="#F59F00" fill="#F59F00" />
              <Txt style={{ fontFamily: fonts.serif, fontSize: 26, lineHeight: 30, color: c.text, marginTop: 6 }}>{p.n}</Txt>
              <Txt v="caption" color={c.textSecondary}>{p.price}</Txt>
              <View style={[styles.soonSmall, { backgroundColor: c.surfaceAlt }]}><Txt v="caption" color={c.textSecondary}>{t('shop.soon')}</Txt></View>
            </View>
          ))}
        </View>
        <Txt v="caption" color={c.textTertiary} style={{ marginTop: 10 }}>{t('shop.soonNote')}</Txt>
      </ScrollView>
    </View>
  );
}

function PriceButton({ price, onPress, afford }: { price: number; onPress: () => void; afford: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.price, { backgroundColor: afford ? c.text : c.surfaceAlt }]}>
      <Sparkle size={14} color="#F59F00" fill="#F59F00" />
      <Txt v="captionMedium" color={afford ? c.background : c.textSecondary}>{price}</Txt>
    </Pressable>
  );
}

function Item({ icon, title, sub, price, onBuy, disabled, i }: { icon: React.ReactNode; title: string; sub: string; price: number; onBuy: () => void; disabled?: boolean; i: number }) {
  const { c } = useTheme();
  const sparks = useApp((s) => s.sparks);
  return (
    <Animated.View entering={FadeInDown.delay(60 + i * 60)}>
      <View style={[styles.item, { backgroundColor: c.surface, borderColor: c.divider, opacity: disabled ? 0.6 : 1 }]}>
        {icon}
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium">{title}</Txt>
          <Txt v="caption" color={c.textSecondary}>{sub}</Txt>
        </View>
        <View style={{ width: 84 }}>
          <PriceButton price={price} onPress={onBuy} afford={!disabled && sparks >= price} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 },
  balance: { borderRadius: radius.xl, padding: space.l },
  section: { marginTop: space.l, marginBottom: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  ic: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flameCard: { width: '47.5%', flexGrow: 1, alignItems: 'center', padding: 14, borderRadius: radius.l },
  price: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, height: 38, borderRadius: 999, marginTop: 10, alignSelf: 'stretch' },
  soon: { backgroundColor: '#FFD66B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pack: { flex: 1, alignItems: 'center', padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  tag: { position: 'absolute', top: -8, right: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  soonSmall: { marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
});
