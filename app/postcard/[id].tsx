import { shareText } from '../../src/lib/share';
import React, { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, View, useWindowDimensions, ImageStyle, StyleProp } from 'react-native';
import { goBack } from '../../src/lib/nav';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';
import ViewShot from 'react-native-view-shot';
import { Share2, X } from '../../src/components/icons';
import { Button, Txt, Segmented, Chip } from '../../src/components/ui';
import { Photo, photoForWord } from '../../src/components/Photo';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { conceptById, fullWord } from '../../src/data/concepts';
import { LANGUAGES, LangCode } from '../../src/data/languages';

/** Postcard generator — story 9:16 or square, with the word in several languages (spec §6.5). */
export default function Postcard() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = useApp((x) => x.settings);
  const word = useApp((x) => (id ? x.words[id] : undefined));
  const concept = conceptById(id ?? '');
  const [format, setFormat] = useState<'story' | 'square'>('story');
  const [langs, setLangs] = useState<LangCode[]>([s.active, s.native, 'ja', 'fr', 'ar'].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5) as LangCode[]);
  const ref = useRef<{ capture?: () => Promise<string> } | null>(null);
  if (!concept) return null;

  const maxW = Math.min(width - 48, 360);
  const cardW = format === 'story' ? Math.min(maxW, (height - 340) * (9 / 16)) : maxW;
  const cardH = format === 'story' ? cardW * (16 / 9) : cardW;

  const share = async () => {
    const text = t('postcard.shareText', { word: fullWord(concept.id, s.active), n: langs.length });
    if (Platform.OS !== 'web' && ref.current) {
      try {
        const uri = await ref.current?.capture?.();
        if (!uri) throw new Error('capture');
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
          return;
        }
      } catch {}
    }
    await shareText(`${text}\n${langs.map((l) => concept.labels[l].word).join(' · ')}\nhttps://thingual.vercel.app/word/${concept.id}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 }}>
        <Txt v="headline" style={{ flex: 1 }}>{t('postcard.title')}</Txt>
        <Pressable onPress={() => goBack()} hitSlop={12}><X size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ alignItems: 'center', padding: space.m, paddingBottom: insets.bottom + 24 }}>
        <Animated.View layout={LinearTransition.springify()} entering={FadeIn}>
          <ViewShot ref={ref as never} options={{ format: 'png', quality: 1 }}>
            <View collapsable={false} style={{ width: cardW, height: cardH, borderRadius: radius.l, overflow: 'hidden', backgroundColor: '#0E0E0E' }}>
              <Photo uri={photoForWord(concept.id, word?.photo, 900)} style={StyleSheet.absoluteFill as StyleProp<ImageStyle>} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={[StyleSheet.absoluteFill, { top: '35%' }]} />
              <View style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
                <Txt style={{ fontFamily: fonts.serif, fontSize: format === 'story' ? 52 : 42, lineHeight: format === 'story' ? 54 : 44, color: '#fff' }}>{fullWord(concept.id, s.active)}</Txt>
                <View style={{ marginTop: 10, gap: 2 }}>
                  {langs.filter((l) => l !== s.active).map((l) => (
                    <Txt key={l} style={{ fontFamily: fonts.serif, fontSize: 20, color: 'rgba(255,255,255,0.82)' }}>
                      {concept.labels[l].word}
                      <Txt v="caption" color="rgba(255,255,255,0.5)">  {LANGUAGES.find((x) => x.code === l)?.native}</Txt>
                    </Txt>
                  ))}
                </View>
                {<Txt v="overline" color="rgba(255,255,255,0.55)" style={{ marginTop: 14 }}>Thingual</Txt>}
              </View>
            </View>
          </ViewShot>
        </Animated.View>

        <View style={{ width: '100%', maxWidth: 520, marginTop: 20, gap: 14 }}>
          <Segmented value={format} onChange={setFormat} options={[{ value: 'story', label: t('postcard.story') }, { value: 'square', label: t('postcard.square') }]} />
          <Txt v="captionMedium" color={c.textSecondary}>{t('postcard.languages')}</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {LANGUAGES.map((l) => (
              <Chip
                key={l.code}
                label={l.native}
                selected={langs.includes(l.code)}
                onPress={() => setLangs((x) => (x.includes(l.code) ? (x.length > 1 ? x.filter((y) => y !== l.code) : x) : [...x, l.code].slice(0, 7)))}
              />
            ))}
          </View>
          <Button title={t('common.share')} icon={<Share2 size={18} color={c.onAccent} />} onPress={share} />
        </View>
      </ScrollView>
    </View>
  );
}
