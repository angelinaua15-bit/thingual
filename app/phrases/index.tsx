import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from '../../src/components/icons';
import { Txt, Button, PressableScale } from '../../src/components/ui';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { EXPRESSIONS, EXPR_KINDS, KIND_EMOJI, SITUATIONS, SITUATION_EMOJI, exprsOfKind } from '../../src/data/expressions';
import { LANGUAGES } from '../../src/data/languages';
import { emojiUrl } from '../../src/data/emoji';
import { isDue } from '../../src/lib/srs';
import { goBack } from '../../src/lib/nav';
import { useIsMax, requireMax, FREE_SITUATIONS } from '../../src/lib/premium';
import { MaxBadge } from '../../src/components/MaxLock';

/** Hub: phrasebook by situation + English phrasal verbs, collocations and idioms. */
export default function PhrasesHub() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const exprs = useApp((x) => x.exprs);
  const saved = Object.keys(exprs).length;
  const max = useIsMax();
  const due = Object.values(exprs).filter((e) => isDue(e.card)).length;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/(tabs)/learn')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <Txt v="display">{t('phr.title')}</Txt>
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{t('phr.sub', { n: LANGUAGES.length })}</Txt>

        {/* review */}
        <Animated.View entering={FadeInDown.delay(60)} style={[styles.review, { backgroundColor: c.ink }]}>
          <View style={{ flex: 1 }}>
            <Txt v="overline" color={c.background} style={{ opacity: 0.6 }}>{t('phr.review')}</Txt>
            <Txt style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, color: c.background, marginTop: 4 }}>
              {saved ? t('phr.savedN', { n: saved }) : t('phr.total', { n: EXPRESSIONS.length })}
            </Txt>
            {!saved && <Txt v="caption" color={c.background} style={{ opacity: 0.7, marginTop: 4 }}>{t('phr.nothingSaved')}</Txt>}
          </View>
          {saved > 0 && (
            <Button title={due ? t('phr.reviewDue', { n: due }) : t('phr.practice')} variant="inverse" size="m" onPress={() => router.push({ pathname: '/phrase-review', params: due ? {} : { all: '1' } })} />
          )}
        </Animated.View>

        {/* kinds */}
        <View style={{ gap: 10, marginTop: space.l }}>
          {EXPR_KINDS.map((k, i) => (
            <Animated.View key={k} entering={FadeInDown.delay(100 + i * 60)}>
              <PressableScale onPress={() => router.push({ pathname: '/phrases/[kind]', params: { kind: k } })} style={[styles.kind, { backgroundColor: c.surface, borderColor: c.divider }]}>
                <View style={[styles.kindIc, { backgroundColor: c.surfaceAlt }]}><Image source={{ uri: emojiUrl(KIND_EMOJI[k]) }} style={{ width: 34, height: 34 }} /></View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Txt v="bodyMedium">{t(`phr.kinds.${k}`)}</Txt>
                    {k !== 'phrase' && <View style={[styles.en, { backgroundColor: c.accentSoft }]}><Txt v="caption" color={c.accent} style={{ fontSize: 11 }}>{t('phr.english')}</Txt></View>}
                  </View>
                  <Txt v="caption" color={c.textSecondary}>{t(`phr.kindSub.${k}`)}</Txt>
                </View>
                <Txt v="captionMedium" color={c.textTertiary}>{exprsOfKind(k).length}</Txt>
                <ChevronRight size={18} color={c.textTertiary} />
              </PressableScale>
            </Animated.View>
          ))}
        </View>

        {/* situations */}
        <Txt v="headline" style={{ marginTop: space.xl, marginBottom: 12 }}>{t('phr.kinds.phrase')}</Txt>
        <View style={styles.grid}>
          {SITUATIONS.map((sit, i) => (
            <Animated.View key={sit} entering={FadeInDown.delay(Math.min(i, 8) * 40)} style={{ width: '31.5%', flexGrow: 1 }}>
              <PressableScale onPress={() => (max || FREE_SITUATIONS.includes(sit) ? router.push({ pathname: '/phrases/[kind]', params: { kind: 'phrase', group: sit } }) : requireMax('phrases'))} style={[styles.sit, { backgroundColor: c.surface, borderColor: c.divider }]}>
                {!max && !FREE_SITUATIONS.includes(sit) ? <View style={{ position: 'absolute', top: 8, right: 8 }}><MaxBadge /></View> : null}
                <Image source={{ uri: emojiUrl(SITUATION_EMOJI[sit]) }} style={{ width: 38, height: 38 }} />
                <Txt v="captionMedium" center numberOfLines={2}>{t(`phr.situations.${sit}`)}</Txt>
                <Txt v="caption" color={c.textTertiary}>{exprsOfKind('phrase').filter((e) => e.group === sit).length}</Txt>
              </PressableScale>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  review: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderRadius: radius.xl, marginTop: space.m },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth },
  kindIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  en: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sit: { alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 6, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, minHeight: 112 },
});
