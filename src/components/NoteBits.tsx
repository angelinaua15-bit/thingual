import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, NotebookPen, Plus, Volume2 } from './icons';
import { Txt, PressableScale } from './ui';
import { useT } from '../i18n';
import { useApp } from '../store/useApp';
import { useTheme, radius } from '../theme/tokens';
import { emojiUrl } from '../data/emoji';
import { Photo } from './Photo';
import { speak, haptic } from '../lib/feedback';
import type { LangCode } from '../data/languages';

/** 3D emoji when we have it, the system emoji otherwise. */
export function EmojiArt({ emoji, size }: { emoji?: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const e = emoji?.trim() || '📝';
  if (failed) return <Text style={{ fontSize: size * 0.82, lineHeight: size, textAlign: 'center', width: size }}>{e}</Text>;
  return <Image source={{ uri: emojiUrl(e) }} style={{ width: size, height: size }} contentFit="contain" onError={() => setFailed(true)} />;
}

/** The word's picture: the learner's photo if there is one, otherwise its emoji, filling a square box. */
export function NoteArt({ photo, emoji, size }: { photo?: string; emoji?: string; size: number }) {
  if (photo) return <Photo uri={photo} style={{ width: size, height: size }} />;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <EmojiArt key={emoji} emoji={emoji} size={size * 0.62} />
    </View>
  );
}

/** Round "done" checkbox with a little bounce. */
export function DoneCheck({ done, onPress, size = 30 }: { done: boolean; onPress: () => void; size?: number }) {
  const { c } = useTheme();
  const scale = useSharedValue(1);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      hitSlop={8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={() => {
        scale.value = withSequence(withSpring(0.8, { damping: 20 }), withSpring(1, { damping: 8 }));
        done ? haptic.light() : haptic.success();
        onPress();
      }}
    >
      <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: done ? 0 : 2, borderColor: c.textTertiary, backgroundColor: done ? c.success : 'transparent' }, st]}>
        {done ? <Check size={size * 0.55} color="#fff" strokeWidth={3} /> : null}
      </Animated.View>
    </Pressable>
  );
}

export function SpeakButton({ text, code, size = 36, slow }: { text: string; code: LangCode; size?: number; slow?: boolean }) {
  const { c } = useTheme();
  return (
    <Pressable hitSlop={6} onPress={() => speak(text, code, { slow })} style={[styles.round, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceAlt }]} accessibilityLabel="listen">
      <Volume2 size={size * 0.45} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ round: { alignItems: 'center', justifyContent: 'center' } });

/** Entry card for My vocabulary (Dictionary and Learn). */
export function NotebookCard({ style }: { style?: object }) {
  const { c, isDark } = useTheme();
  const { t } = useT();
  const notebook = useApp((x) => x.notebook);
  const list = Object.values(notebook);
  const learned = list.filter((w) => w.done).length;
  const recent = list.sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  return (
    <PressableScale onPress={() => router.push('/notebook')} style={[{ borderRadius: radius.l, overflow: 'hidden' }, style]}>
      <LinearGradient colors={isDark ? ['#3A2A12', '#2A1F3D'] : ['#FFF3D6', '#F3E8FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' }}>
          <NotebookPen size={22} color={isDark ? '#FCD34D' : '#B45309'} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt v="bodyMedium">{t('nb.open')}</Txt>
          <Txt v="caption" color={c.textSecondary} numberOfLines={1}>
            {list.length ? `${t('nb.count', { n: list.length })} · ${t('nb.learnedN', { n: learned })}${recent.length ? ' · ' + recent.map((w) => w.word).join(', ') : ''}` : t('nb.openSub')}
          </Txt>
        </View>
        <Pressable onPress={() => router.push('/notebook/edit')} hitSlop={8} accessibilityLabel={t('nb.add')} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={20} color={c.onAccent} />
        </Pressable>
      </LinearGradient>
    </PressableScale>
  );
}
