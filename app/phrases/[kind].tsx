import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Plus, Search, Volume2, X } from '../../src/components/icons';
import { Txt, Button } from '../../src/components/ui';
import { toast } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT } from '../../src/i18n';
import { useApp } from '../../src/store/useApp';
import { exprLang, exprMeaning, exprTarget, exprsOfKind, groupsOf, SITUATIONS, type Expr, type ExprKind } from '../../src/data/expressions';
import { speak } from '../../src/lib/feedback';
import { goBack } from '../../src/lib/nav';
import { useIsMax, requireMax, FREE_SITUATIONS, LIMITS } from '../../src/lib/premium';
import { MaxLockCard, MaxBadge } from '../../src/components/MaxLock';
import { haptic } from '../../src/lib/feedback';

const groupLabel = (t: (k: string) => string, kind: ExprKind, g: string) =>
  kind === 'phrase' ? t(`phr.situations.${g}`) : kind === 'collocation' ? t(`phr.groups.${g}`) : g;

export default function ExprList() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ kind: ExprKind; group?: string }>();
  const kind = (params.kind ?? 'phrase') as ExprKind;
  const s = useApp((x) => x.settings);
  const exprs = useApp((x) => x.exprs);
  const [group, setGroup] = useState<string>(params.group ?? 'all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  // phrasal verbs are grouped by their verb — too many chips, so we show levels instead
  const groups = useMemo(() => {
    if (kind === 'phrase') return SITUATIONS;
    if (kind === 'phrasal' || kind === 'idiom') return ['A2', 'B1', 'B2', 'C1'].filter((l) => exprsOfKind(kind).some((e) => e.level === l));
    return groupsOf(kind);
  }, [kind]);

  const max = useIsMax();
  const all = useMemo(() => {
    const query = q.trim().toLowerCase();
    return exprsOfKind(kind).filter((e) => {
      if (group !== 'all' && (kind === 'phrasal' || kind === 'idiom' ? e.level !== group : e.group !== group)) return false;
      if (!query) return true;
      const hay = [e.en, e.uk, e.def, exprTarget(e, s.active, s.speakerGender === 'female').text, exprMeaning(e, s.native, s.speakerGender === 'female')].join(' ').toLowerCase();
      return hay.includes(query);
    });
  }, [kind, group, q, s.active, s.native, s.speakerGender]);
  // Free: 3 phrasebook situations and the first 30 of each English list
  const isOpen = (e: Expr) => max || (kind === 'phrase' ? FREE_SITUATIONS.includes(e.group) : exprsOfKind(kind).indexOf(e) < LIMITS.freeExprPerKind);
  const list = useMemo(() => all.filter(isOpen), [all, max]);
  const locked = all.length - list.length;

  const unsaved = list.filter((e) => !exprs[e.id]);
  const saveAll = () => {
    const n = useApp.getState().saveExprs(unsaved.map((e) => e.id));
    haptic.success();
    toast(t('phr.savedN', { n }), 'success');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/phrases')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <View style={{ flex: 1 }}>
          <Txt v="headline">{t(`phr.kinds.${kind}`)}</Txt>
          <Txt v="caption" color={c.textSecondary}>{kind === 'phrase' ? t('phr.total', { n: exprsOfKind(kind).length }) : `${t('phr.english')} · ${t('phr.total', { n: exprsOfKind(kind).length })}`}</Txt>
        </View>
      </View>
      <View style={{ paddingHorizontal: space.m, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
          <Search size={17} color={c.textSecondary} />
          <TextInput value={q} onChangeText={setQ} placeholder={t('phr.search')} placeholderTextColor={c.textTertiary} autoCorrect={false}
            style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 15, height: 42 }} />
          {!!q && <Pressable onPress={() => setQ('')} hitSlop={8}><X size={16} color={c.textSecondary} /></Pressable>}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 12 }}>
          {['all', ...groups].map((g) => {
            const on = g === group;
            return (
              <Pressable key={g} onPress={() => { haptic.light(); if (kind === 'phrase' && g !== 'all' && !max && !FREE_SITUATIONS.includes(g)) { requireMax('phrases'); return; } setGroup(g); }} style={[styles.chip, { backgroundColor: on ? c.ink : c.surface, borderColor: c.divider, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                {kind === 'phrase' && g !== 'all' && !max && !FREE_SITUATIONS.includes(g) ? <MaxBadge size={14} /> : null}
                <Txt v="captionMedium" color={on ? c.background : c.text}>{g === 'all' ? t('phr.all') : groupLabel(t, kind, g)}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        initialNumToRender={20}
        contentContainerStyle={{ paddingHorizontal: space.m, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        ListHeaderComponent={unsaved.length > 1 ? (<Button title={t('phr.saveAll', { n: unsaved.length })} variant="secondary" size="m" icon={<Plus size={16} color={c.text} />} onPress={saveAll} style={{ marginBottom: 10 }} />) : undefined}
        ListFooterComponent={locked > 0 ? <MaxLockCard reason={kind === 'phrase' ? 'phrases' : 'english'} title={t('max.moreLocked', { n: locked })} sub={t('max.moreLockedSub')} /> : undefined}
        ListEmptyComponent={locked > 0 ? undefined : <Txt v="callout" color={c.textSecondary} center style={{ marginTop: 40 }}>{t('phr.empty')}</Txt>}
        renderItem={({ item, index }) => <Row e={item} i={index} open={open === item.id} onToggle={() => setOpen(open === item.id ? null : item.id)} />}
      />
    </View>
  );
}

function Row({ e, i, open, onToggle }: { e: Expr; i: number; open: boolean; onToggle: () => void }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const saved = useApp((x) => !!x.exprs[e.id]);
  const target = exprTarget(e, s.active, s.speakerGender === 'female');
  const meaning = exprMeaning(e, s.native, s.speakerGender === 'female');
  const langCode = exprLang(e, s.active);
  const ex = s.native === 'uk' ? e.exUk : undefined;
  return (
    <Animated.View entering={i < 14 ? FadeInDown.delay(i * 25) : undefined}>
      <Pressable onPress={onToggle} style={[styles.row, { borderColor: c.divider }]}>
        <View style={{ flex: 1 }}>
          <Txt style={{ fontFamily: fonts.serif, fontSize: 22, lineHeight: 27, color: c.text }}>{target.text}</Txt>
          {'roman' in target && target.roman ? <Txt v="caption" color={c.textTertiary}>{target.roman}</Txt> : null}
          <Txt v="callout" color={c.textSecondary} style={{ marginTop: 2 }}>{meaning}</Txt>
          {open && (e.exEn || e.def) ? (
            <Animated.View entering={FadeIn} style={[styles.example, { backgroundColor: c.surfaceAlt }]}>
              {e.def && s.native === 'uk' ? <Txt v="caption" color={c.textSecondary}>{e.def}</Txt> : null}
              {e.exEn ? (
                <Pressable onPress={() => speak(e.exEn!, 'en')} style={{ marginTop: e.def ? 6 : 0 }}>
                  <Txt v="body" style={{ fontStyle: 'italic' }}>{e.exEn}</Txt>
                  {ex ? <Txt v="caption" color={c.textSecondary}>{ex}</Txt> : null}
                </Pressable>
              ) : null}
            </Animated.View>
          ) : null}
          {e.level ? <Txt v="caption" color={c.textTertiary} style={{ marginTop: 4 }}>{e.level}</Txt> : null}
        </View>
        <View style={{ gap: 8, alignItems: 'center' }}>
          <Pressable onPress={() => speak(target.text, langCode)} hitSlop={8} style={[styles.round, { backgroundColor: c.surfaceAlt }]}><Volume2 size={17} color={c.text} /></Pressable>
          <Pressable onPress={() => { const on = useApp.getState().toggleExpr(e.id); if (on) haptic.success(); }} hitSlop={8} style={[styles.round, { backgroundColor: saved ? c.success : c.ink }]}>
            {saved ? <Check size={16} color="#fff" /> : <Plus size={17} color={c.background} />}
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 60 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.m, paddingHorizontal: 12 },
  chip: { height: 36, paddingHorizontal: 13, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  example: { marginTop: 8, padding: 10, borderRadius: radius.s },
});
