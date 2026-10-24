import React, { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { ArrowRight, ChevronDown, Trophy } from '../../src/components/icons';
import { Txt, Button, PressableScale } from '../../src/components/ui';
import { EmojiArt } from '../../src/components/NoteBits';
import { Sheet, toast } from '../../src/components/Overlay';
import { HeartsPill, Mascot, PathNodeButton, shade, useHearts, useMascotLine } from '../../src/components/PathBits';
import { StreakPills } from '../../src/components/StreakBits';
import { QuestStrip } from '../../src/components/QuestBits';
import { useTheme, fonts, radius, space, TAB_BAR_HEIGHT } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { UNITS, NODES, nodeIndex, pathState, type PathNode, type Unit } from '../../src/data/path';
import { haptic } from '../../src/lib/feedback';
import type { CEFR } from '../../src/data/concepts';

const HEADER_H = 150;
const NODE_H = 108;
const OFFSETS = [0, 48, 76, 48, 0, -48, -76, -48];
const unitHeight = (u: Unit) => HEADER_H + u.nodes.length * NODE_H + 24;

/** The learning path: units A1 → C2, one lesson after another. */
export default function PathTab() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const done = useApp((x) => x.path);
  const level = (s.cefr ?? 'A1') as CEFR;
  const st = useMemo(() => pathState(done, s.active, level), [done, s.active, level]);
  const currentUnit = NODES[Math.min(st.current, NODES.length - 1)].unit;
  const [picked, setPicked] = useState<PathNode | null>(null);
  const [topUnit, setTopUnit] = useState(currentUnit);
  const list = useRef<FlatList<Unit>>(null);
  const line = useMascotLine();
  const hearts = useHearts();
  const narrow = useWindowDimensions().width < 360;

  const offsets = useMemo(() => {
    let y = 0;
    return UNITS.map((u) => { const o = y; y += unitHeight(u); return o; });
  }, []);

  const open = (n: PathNode) => {
    haptic.light();
    setPicked(n);
  };

  const start = (n: PathNode) => {
    const key = `${s.active}:${n.id}`;
    setPicked(null);
    if (n.kind === 'chest') {
      const got = useApp.getState().openChest(key);
      if (got) {
        haptic.success();
        toast(t('path.chestGot', { n: got }), 'success');
      }
      return;
    }
    if (!hearts.unlimited && hearts.n <= 0) {
      router.push('/hearts');
      return;
    }
    router.push({ pathname: '/lesson', params: { node: n.id } });
  };

  const unit = UNITS[topUnit];
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* top bar: language, streak, crystals, hearts */}
      <View style={[styles.bar, { paddingTop: insets.top + 6, backgroundColor: c.background, borderBottomColor: c.divider }]}>
        <View style={styles.barRow}>
          <PressableScale onPress={() => router.push('/settings')} style={[styles.lang, { backgroundColor: c.surfaceAlt }]}>
            <Txt v="captionMedium" numberOfLines={1}>{s.active.toUpperCase()}</Txt>
            <ChevronDown size={14} color={c.textSecondary} />
          </PressableScale>
          <View style={{ flexDirection: 'row', gap: narrow ? 5 : 8, alignItems: 'center' }}>
            <StreakPills compact />
            <HeartsPill />
          </View>
        </View>
        <QuestStrip />
        {/* the unit you're looking at stays pinned on top */}
        <Animated.View key={topUnit} entering={FadeIn.duration(200)} style={[styles.unitPin, { backgroundColor: unit.color, borderBottomColor: shade(unit.color) }]}>
          <View style={{ flex: 1 }}>
            <Txt v="overline" color="rgba(255,255,255,.85)">{t('path.section', { level: unit.level })} · {t('path.unit', { n: unit.n + 1 })}</Txt>
            <Txt v="headline" color="#fff" numberOfLines={1}>{unitTitle(unit, t)}</Txt>
          </View>
          <PressableScale onPress={() => router.push({ pathname: '/explore', params: unit.topic ? { topic: unit.topic } : {} })} style={styles.guide} accessibilityLabel={t('path.words')}>
            <EmojiArt emoji={unit.emoji} size={30} />
          </PressableScale>
        </Animated.View>
      </View>

      <FlatList
        ref={list}
        data={UNITS}
        keyExtractor={(u) => String(u.n)}
        initialScrollIndex={Math.max(0, currentUnit)}
        getItemLayout={(_, i) => ({ length: unitHeight(UNITS[i]), offset: offsets[i], index: i })}
        windowSize={7}
        initialNumToRender={3}
        onViewableItemsChanged={useRef(({ viewableItems }: { viewableItems: { index?: number | null }[] }) => {
          const first = viewableItems.find((v) => v.index != null);
          if (first?.index != null) setTopUnit(first.index);
        }).current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
        contentContainerStyle={{ paddingBottom: TAB_BAR_HEIGHT + 60 }}
        renderItem={({ item: u }) => (
          <UnitBlock unit={u} status={st.status} onNode={open} mascot={u.n === currentUnit ? line || ' ' : undefined} t={t} />
        )}
      />

      {/* side buttons: Lightning, Stories, Tingo's wardrobe */}
      <View style={[styles.side, { bottom: TAB_BAR_HEIGHT + 20 }]}>
        {[
          { e: '⚡', to: '/lightning', label: t('lightning.title'), bg: '#6D28D9' },
          { e: '📖', to: '/stories', label: t('stories.title'), bg: '#8B5CF6' },
          { e: '👕', to: '/wardrobe', label: t('wardrobe.title'), bg: '#F4A261' },
        ].map((b, i) => (
          <Animated.View key={b.to} entering={ZoomIn.delay(200 + i * 80)}>
            <PressableScale onPress={() => router.push(b.to as never)} style={[styles.sideBtn, { backgroundColor: b.bg, borderBottomColor: shade(b.bg) }]} accessibilityLabel={b.label}>
              <EmojiArt emoji={b.e} size={28} />
            </PressableScale>
          </Animated.View>
        ))}
      </View>

      {currentUnit !== topUnit && (
        <Animated.View entering={ZoomIn} style={[styles.jump, { bottom: TAB_BAR_HEIGHT + 20 }]}>
          <PressableScale onPress={() => list.current?.scrollToIndex({ index: currentUnit, animated: true })} style={[styles.jumpBtn, { backgroundColor: c.surface, borderColor: c.divider }]}>
            <ArrowRight size={18} color={c.text} style={{ transform: [{ rotate: currentUnit > topUnit ? '90deg' : '-90deg' }] }} />
          </PressableScale>
        </Animated.View>
      )}

      <Sheet visible={!!picked} onClose={() => setPicked(null)}>
        {picked && <NodeCard node={picked} status={st.status(nodeIndex(picked.id))} onStart={() => start(picked)} t={t} />}
      </Sheet>
    </View>
  );
}

type T = (k: string, v?: Record<string, string | number>) => string;

export const unitTitle = (u: Unit, t: T) =>
  u.topic ? `${t(`explore.topics.${u.topic}`)}${u.part > 1 ? ` ${u.part}` : ''}` : u.situation ? t(`phr.situations.${u.situation}`) : t('path.mixed', { level: u.level });

function UnitBlock({ unit, status, onNode, mascot, t }: { unit: Unit; status: (i: number) => 'done' | 'current' | 'open' | 'locked'; onNode: (n: PathNode) => void; mascot?: string; t: T }) {
  const { c } = useTheme();
  const firstOfLevel = unit.n === 0 || UNITS[unit.n - 1].level !== unit.level;
  const done = unit.nodes.filter((n) => status(nodeIndex(n.id)) === 'done').length;
  // narrow phones: a tighter zigzag so the side buttons never cover a lesson
  const zig = Math.min(1, (useWindowDimensions().width - 150) / 240);
  return (
    <View style={{ height: unitHeight(unit), maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <View style={{ height: HEADER_H, paddingHorizontal: space.m, justifyContent: 'flex-end', paddingBottom: 18 }}>
        {firstOfLevel && (
          <View style={styles.levelRow}>
            <View style={[styles.levelLine, { backgroundColor: c.divider }]} />
            <Txt v="overline" color={c.textSecondary}>{t('path.levelTitle', { level: unit.level, name: t(`cefr.${unit.level}`) })}</Txt>
            <View style={[styles.levelLine, { backgroundColor: c.divider }]} />
          </View>
        )}
        <View style={styles.unitRow}>
          <View style={[styles.unitDot, { backgroundColor: unit.color }]}><EmojiArt emoji={unit.emoji} size={26} /></View>
          <View style={{ flex: 1 }}>
            <Txt v="overline" color={unit.color}>{t('path.unit', { n: unit.n + 1 })} · {unit.level}</Txt>
            <Txt v="headline" numberOfLines={1}>{unitTitle(unit, t)}</Txt>
            <Txt v="caption" color={c.textTertiary}>{t('path.unitProgress', { done, n: unit.nodes.length })}</Txt>
          </View>
        </View>
      </View>
      {unit.nodes.map((n, i) => {
        const idx = nodeIndex(n.id);
        const x = OFFSETS[i % OFFSETS.length] * zig;
        const stt = status(idx);
        return (
          <View key={n.id} style={{ height: NODE_H, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ transform: [{ translateX: x }] }}>
              <PathNodeButton kind={n.kind} status={stt} color={unit.color} onPress={() => onNode(n)} label={t('path.start')} />
            </View>
            {mascot && i === 1 && (
              <View style={[styles.mascot, x >= 0 ? { left: 18 } : { right: 18 }]} pointerEvents="none">
                <Mascot size={76} say={mascot.trim() || undefined} />
              </View>
            )}
            {!mascot && i === 2 && (
              <View style={[styles.mascot, { opacity: 0.9 }, x >= 0 ? { left: 34 } : { right: 34 }]} pointerEvents="none">
                <EmojiArt emoji={unit.emoji} size={54} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function NodeCard({ node, status, onStart, t }: { node: PathNode; status: 'done' | 'current' | 'open' | 'locked'; onStart: () => void; t: T }) {
  const { c } = useTheme();
  const u = UNITS[node.unit];
  const lessons = u.nodes.filter((n) => n.kind === 'lesson');
  const title =
    node.kind === 'lesson' ? t('path.lessonN', { n: lessons.indexOf(node) + 1, total: lessons.length })
      : node.kind === 'phrases' ? t('path.phrasesTitle', { s: t(`phr.situations.${u.situation}`) })
        : node.kind === 'chest' ? t('path.chest')
          : t('path.review');
  const sub =
    node.kind === 'lesson' ? t('path.lessonSub', { n: node.words.length })
      : node.kind === 'phrases' ? t('path.phrasesSub', { n: node.phrases.length })
        : node.kind === 'chest' ? t('path.chestSub')
          : t('path.reviewSub');
  const locked = status === 'locked';
  return (
    <View style={{ paddingBottom: 8 }}>
      <View style={[styles.cardTop, { backgroundColor: locked ? c.surfaceAlt : u.color }]}>
        <View style={{ flex: 1 }}>
          <Txt v="overline" color={locked ? c.textSecondary : 'rgba(255,255,255,.85)'}>{unitTitle(u, t)} · {u.level}</Txt>
          <Txt v="title" color={locked ? c.text : '#fff'}>{title}</Txt>
          <Txt v="callout" color={locked ? c.textSecondary : 'rgba(255,255,255,.9)'} style={{ marginTop: 2 }}>{locked ? t('path.locked') : sub}</Txt>
        </View>
        {node.kind === 'review' ? <Trophy size={34} color={locked ? c.textTertiary : '#fff'} /> : null}
      </View>
      {!locked && (
        <Button
          title={node.kind === 'chest' ? (status === 'done' ? t('path.chestOpened') : t('path.openChest')) : status === 'done' ? t('path.again') : t('path.startXp', { n: node.kind === 'review' ? 20 : 15 })}
          onPress={node.kind === 'chest' && status === 'done' ? () => {} : onStart}
          style={{ marginTop: 14 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { zIndex: 2, paddingHorizontal: space.m, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  barRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, maxWidth: 560, width: '100%', alignSelf: 'center' },
  lang: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, flexShrink: 1 },
  unitPin: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.l, borderBottomWidth: 4, maxWidth: 560, width: '100%', alignSelf: 'center' },
  guide: { width: 46, height: 46, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  levelLine: { flex: 1, height: 1 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  unitDot: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  mascot: { position: 'absolute', top: 6 },
  jump: { position: 'absolute', right: 18 },
  side: { position: 'absolute', left: 14, gap: 10 },
  sideBtn: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4 },
  jumpBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: radius.l },
});
