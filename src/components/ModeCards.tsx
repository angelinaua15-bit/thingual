import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Txt, PressableScale } from './ui';
import { EmojiArt } from './NoteBits';
import { FoxArt } from './PathBits';
import { radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { STORIES } from '../data/stories';

/** Two bright cards: Lightning (60-second round) and Tingo Stories. */
export function ModeCards() {
  const { t } = useT();
  const best = useApp((s) => s.lightningBest[s.settings.active] ?? 0);
  const done = useApp((s) => STORIES.filter((st) => s.stories[`${s.settings.active}:${st.id}`]).length);
  return (
    <View style={styles.row}>
      <PressableScale onPress={() => router.push('/lightning')} style={{ flex: 1 }}>
        <LinearGradient colors={['#3B1E8F', '#6D28D9']} style={styles.card}>
          <EmojiArt emoji="⚡" size={40} />
          <Txt v="headline" color="#fff" style={{ marginTop: 8 }}>{t('lightning.title')}</Txt>
          <Txt v="caption" color="rgba(255,255,255,.8)">{best ? t('lightning.best', { n: best }) : t('lightning.short')}</Txt>
        </LinearGradient>
      </PressableScale>
      <PressableScale onPress={() => router.push('/stories')} style={{ flex: 1 }}>
        <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.card}>
          <FoxArt size={40} />
          <Txt v="headline" color="#fff" style={{ marginTop: 8 }}>{t('stories.title')}</Txt>
          <Txt v="caption" color="rgba(255,255,255,.8)">{t('stories.progress', { n: done, total: STORIES.length })}</Txt>
        </LinearGradient>
      </PressableScale>
    </View>
  );
}

/** Link to Tingo's wardrobe (on the crystals screen). */
export function WardrobeCard() {
  const { t } = useT();
  return (
    <PressableScale onPress={() => router.push('/wardrobe')}>
      <LinearGradient colors={['#FDE7C8', '#F4A261']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 0 }]}>
        <FoxArt size={56} />
        <View style={{ flex: 1 }}>
          <Txt v="headline" color="#2B1B0E">{t('wardrobe.title')}</Txt>
          <Txt v="caption" color="#5B3A1E">{t('wardrobe.cardSub')}</Txt>
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, marginTop: 14 },
  card: { padding: 16, borderRadius: radius.l, minHeight: 130 },
});
