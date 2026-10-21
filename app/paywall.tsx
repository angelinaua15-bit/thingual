import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import { Button, Txt, PressableScale } from '../src/components/ui';
import { Photo } from '../src/components/Photo';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { photosFor, unsplash } from '../src/data/photos';
import { fullWord } from '../src/data/concepts';
import { haptic } from '../src/lib/feedback';

/** Prices are placeholders — production prices come from RevenueCat offerings with regional pricing. */
const PLANS = [
  { id: 'yearly', price: '$39.99', per: 'perYear', save: 44 },
  { id: 'monthly', price: '$5.99', per: 'perMonth' },
  { id: 'family', price: '$59.99', per: 'perYear' },
] as const;

export default function Paywall() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const premium = useApp((x) => x.premium);
  const setPremium = useApp((x) => x.setPremium);
  const target = useApp((x) => x.settings.active);
  const [plan, setPlan] = useState<(typeof PLANS)[number]['id']>('yearly');
  const collage = ['bicycle', 'teapot', 'window', 'cat', 'bread', 'umbrella'];

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0E0E' }}>
      <View style={{ height: height * 0.32, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, transform: [{ rotate: '-4deg' }, { scale: 1.15 }], marginTop: -10 }}>
          {collage.map((id, i) => (
            <Animated.View key={id} entering={ZoomIn.delay(i * 70).springify()} style={{ width: '32.5%', aspectRatio: 0.85, borderRadius: 14, overflow: 'hidden' }}>
              <Photo uri={unsplash(photosFor(id)[0].path, 300)} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
              <View style={{ position: 'absolute', left: 8, bottom: 6 }}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: 16, color: '#fff' }}>{fullWord(id, target)}</Txt>
              </View>
            </Animated.View>
          ))}
        </View>
        <LinearGradient colors={['rgba(14,14,14,0)', '#0E0E0E']} style={[StyleSheet.absoluteFill, { top: '40%' }]} />
        <Pressable onPress={() => router.back()} style={[styles.close, { top: insets.top + 8 }]} hitSlop={12}>
          <X size={20} color="#fff" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingBottom: insets.bottom + 24, maxWidth: 560, width: '100%', alignSelf: 'center' }}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 48, color: '#fff' }}>{t('paywall.title')}</Txt>
          <Txt v="callout" color="rgba(255,255,255,0.7)" style={{ marginTop: 6 }}>{premium ? t('paywall.active') : t('paywall.sub')}</Txt>
        </Animated.View>
        <View style={{ marginTop: 20, gap: 10 }}>
          {(['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const).map((f, i) => (
            <Animated.View key={f} entering={FadeInDown.delay(100 + i * 50)} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={styles.tick}><Check size={13} color="#0E0E0E" /></View>
              <Txt v="callout" color="#fff" style={{ flex: 1 }}>{t(`paywall.${f}`)}</Txt>
            </Animated.View>
          ))}
        </View>
        {!premium && (
          <View style={{ marginTop: 24, gap: 10 }}>
            {PLANS.map((p) => {
              const sel = plan === p.id;
              return (
                <PressableScale key={p.id} onPress={() => setPlan(p.id)} style={[styles.plan, { borderColor: sel ? '#fff' : 'rgba(255,255,255,0.15)', backgroundColor: sel ? 'rgba(255,255,255,0.08)' : 'transparent' }]}>
                  <View style={[styles.radio, { borderColor: sel ? '#fff' : 'rgba(255,255,255,0.4)' }]}>{sel && <View style={styles.radioDot} />}</View>
                  <Txt v="bodyMedium" color="#fff" style={{ flex: 1 }}>{t(`paywall.${p.id}`)}</Txt>
                  {'save' in p && p.save ? <View style={styles.save}><Txt v="captionMedium" color="#0E0E0E" style={{ fontSize: 11 }}>{t('paywall.save', { n: p.save })}</Txt></View> : null}
                  <Txt v="bodyMedium" color="#fff">{p.price}<Txt v="caption" color="rgba(255,255,255,0.6)">{t(`paywall.${p.per}`)}</Txt></Txt>
                </PressableScale>
              );
            })}
          </View>
        )}
        <View style={{ marginTop: 20 }}>
          {premium ? (
            <Button title={t('paywall.cancel')} variant="secondary" onPress={() => { setPremium(false); router.back(); }} />
          ) : (
            <Button
              title={t('paywall.trial')}
              variant="inverse"
              onPress={() => {
                setPremium(true);
                haptic.success();
                toast(t('paywall.active'));
                router.back();
              }}
            />
          )}
          <Pressable style={{ alignItems: 'center', padding: 14 }} onPress={() => toast(t('paywall.restore'), 'default')}>
            <Txt v="captionMedium" color="rgba(255,255,255,0.6)">{t('paywall.restore')}</Txt>
          </Pressable>
          <Txt v="caption" color="rgba(255,255,255,0.4)" center>{t('paywall.test')}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  close: { position: 'absolute', right: 16, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  tick: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 62, paddingHorizontal: 16, borderRadius: radius.m, borderWidth: 1.5 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' },
  save: { backgroundColor: '#FF8A5B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
});
