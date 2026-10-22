import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lightbulb, Trash2, Volume2, WandSparkles } from '../../src/components/icons';
import { Txt, Button, Chip } from '../../src/components/ui';
import { EmojiArt } from '../../src/components/NoteBits';
import { toast, Sheet } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, type NoteInput } from '../../src/store/useApp';
import { enrichWord } from '../../src/lib/notebook';
import { quotaLeft, requireMax, useIsMax } from '../../src/lib/premium';
import { speak, haptic } from '../../src/lib/feedback';
import { cefrOf } from '../../src/lib/level';
import { goBack } from '../../src/lib/nav';
import type { LangCode } from '../../src/data/languages';


/** Create or edit a word in My vocabulary. */
export default function EditNote() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const { id, word: preset } = useLocalSearchParams<{ id?: string; word?: string }>();
  const s = useApp((x) => x.settings);
  const existing = useApp((x) => (id ? x.notebook[id] : undefined));
  const max = useIsMax();
  const [f, setF] = useState<NoteInput>(() =>
    existing
      ? { word: existing.word, lang: existing.lang, translation: existing.translation, ipa: existing.ipa, roman: existing.roman, pos: existing.pos, association: existing.association, example: existing.example, exampleTr: existing.exampleTr, emoji: existing.emoji, note: existing.note }
      : { word: preset ?? '', lang: s.active, translation: '' },
  );
  const [busy, setBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<NoteInput>) => setF((x) => ({ ...x, ...patch }));
  const left = quotaLeft('word');

  const ai = async () => {
    if (!f.word.trim()) return setAiMsg({ text: t('nb.needWord'), ok: false });
    if (left <= 0) return requireMax('word');
    setBusy(true);
    setAiMsg(null);
    const r = await enrichWord({ word: f.word.trim(), target: f.lang, native: s.native, translation: f.translation.trim() || undefined, level: cefrOf(s) });
    setBusy(false);
    if (!r.ok) {
      if (r.error === 'limit') return requireMax('word');
      return setAiMsg({ text: t(r.error === 'unknown' ? 'nb.aiUnknown' : r.error === 'no_key' ? 'nb.noKey' : r.error === 'service' ? 'nb.aiService' : 'nb.aiOffline'), ok: false });
    }
    const d = r.data;
    haptic.success();
    set({ word: d.word || f.word, translation: d.translation || f.translation, ipa: d.ipa, roman: d.roman, pos: d.pos, association: d.association, example: d.example, exampleTr: d.exampleTr, emoji: d.emoji || f.emoji });
    setAiMsg({ text: t('nb.aiFilled'), ok: true });
    speak(d.word || f.word, f.lang);
  };

  const save = () => {
    const word = f.word.trim();
    if (!word) return setAiMsg({ text: t('nb.needWord'), ok: false });
    const clean: NoteInput = { ...f, word, translation: f.translation.trim() };
    const st = useApp.getState();
    if (existing) {
      st.updateNote(existing.id, clean);
      toast(t('nb.saved'), 'success');
      goBack('/notebook');
    } else {
      const nid = st.addNote(clean);
      haptic.success();
      toast(t('nb.added'), 'success');
      router.replace({ pathname: '/notebook/[id]', params: { id: nid } });
    }
  };

  const remove = () => {
    if (!existing) return;
    useApp.getState().removeNote(existing.id);
    setConfirm(false);
    toast(t('nb.deleted'));
    router.dismissTo('/notebook');
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={[styles.bar, { borderBottomColor: c.divider }]}>
        <Pressable onPress={() => goBack('/notebook')} hitSlop={10}><Txt v="body" color={c.textSecondary}>{t('nb.cancel')}</Txt></Pressable>
        <Txt v="headline" style={{ flex: 1, textAlign: 'center' }}>{existing ? t('nb.edit') : t('nb.new')}</Txt>
        <Pressable onPress={save} hitSlop={10} disabled={!f.word.trim()}><Txt v="bodyMedium" color={f.word.trim() ? c.accent : c.textTertiary}>{t('nb.save')}</Txt></Pressable>
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {/* language */}
        {s.targets.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {s.targets.map((l) => <Chip key={l} label={languageName(l, s.uiLang)} selected={f.lang === l} onPress={() => set({ lang: l as LangCode })} />)}
          </View>
        )}

        {/* word */}
        <View style={[styles.wordCard, { backgroundColor: c.surface, borderColor: c.divider }]}>
          <View style={[styles.emoji, { backgroundColor: c.surfaceAlt }]}>
            <EmojiArt key={f.emoji} emoji={f.emoji} size={40} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt v="overline" color={c.textTertiary}>{t('nb.word')}</Txt>
            <TextInput
              value={f.word}
              onChangeText={(v) => set({ word: v })}
              placeholder={t('nb.wordPh')}
              placeholderTextColor={c.textTertiary}
              autoFocus={!existing && !preset}
              autoCapitalize="none"
              style={[styles.wordInput, { color: c.text }]}
            />
            {f.ipa ? (
              <Pressable onPress={() => speak(f.word, f.lang)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Volume2 size={14} color={c.accent} />
                <Txt v="callout" color={c.accent}>{f.ipa}{f.roman ? ` · ${f.roman}` : ''}</Txt>
              </Pressable>
            ) : (
              <Txt v="caption" color={c.textTertiary}>{t('nb.wordHint', { lang: languageName(f.lang, s.uiLang) })}</Txt>
            )}
          </View>
        </View>

        {/* AI */}
        <Pressable onPress={ai} disabled={busy} style={({ pressed }) => [styles.aiBtn, { opacity: pressed || busy ? 0.85 : 1 }]}>
          <LinearGradient colors={['#5B3FD0', '#8B5CF6', '#C084FC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aiGrad}>
            {busy ? <ActivityIndicator color="#fff" /> : <WandSparkles size={19} color="#fff" />}
            <Txt v="bodyMedium" color="#fff">{busy ? t('nb.aiWorking') : f.association ? t('nb.aiAgain') : t('nb.aiFill')}</Txt>
          </LinearGradient>
        </Pressable>
        {!max && <Txt v="caption" color={c.textTertiary} center style={{ marginTop: 6 }}>{t('nb.aiLeft', { n: Math.max(0, left) })}</Txt>}
        {aiMsg && (
          <Animated.View entering={FadeIn} style={[styles.msg, { backgroundColor: aiMsg.ok ? c.successSoft : c.errorSoft }]}>
            <Txt v="caption" color={aiMsg.ok ? c.success : c.error}>{aiMsg.text}</Txt>
          </Animated.View>
        )}

        {/* fields */}
        <Field label={t('nb.translation')}>
          <TextInput value={f.translation} onChangeText={(v) => set({ translation: v })} placeholder={t('nb.translationPh')} placeholderTextColor={c.textTertiary} style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]} />
        </Field>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={t('nb.transcription')}>
              <TextInput value={f.ipa ?? ''} onChangeText={(v) => set({ ipa: v })} placeholder="/liβeɾˈtað/" placeholderTextColor={c.textTertiary} autoCapitalize="none" style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]} />
            </Field>
          </View>
          <View style={{ width: 92 }}>
            <Field label={t('nb.emoji')}>
              <TextInput value={f.emoji ?? ''} onChangeText={(v) => set({ emoji: [...v].slice(-2).join('') })} placeholder="🕊️" placeholderTextColor={c.textTertiary} style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, color: c.text, textAlign: 'center', fontSize: 22 }]} />
            </Field>
          </View>
        </View>

        <Field label={t('nb.association')} icon={<Lightbulb size={14} color="#D97706" />}>
          <TextInput value={f.association ?? ''} onChangeText={(v) => set({ association: v })} placeholder={t('nb.associationPh')} placeholderTextColor={c.textTertiary} multiline style={[styles.input, styles.multi, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]} />
        </Field>

        <Field label={t('nb.example')}>
          <TextInput value={f.example ?? ''} onChangeText={(v) => set({ example: v })} placeholder={t('nb.examplePh')} placeholderTextColor={c.textTertiary} multiline style={[styles.input, styles.multi, { backgroundColor: c.surface, borderColor: c.divider, color: c.text, minHeight: 60 }]} />
          <TextInput value={f.exampleTr ?? ''} onChangeText={(v) => set({ exampleTr: v })} placeholder={t('nb.exampleTr')} placeholderTextColor={c.textTertiary} multiline style={[styles.input, styles.multi, { backgroundColor: c.surface, borderColor: c.divider, color: c.textSecondary, minHeight: 50, marginTop: 8 }]} />
        </Field>

        <Field label={t('nb.note')}>
          <TextInput value={f.note ?? ''} onChangeText={(v) => set({ note: v })} placeholder={t('nb.notePh')} placeholderTextColor={c.textTertiary} multiline style={[styles.input, styles.multi, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]} />
        </Field>

        <Button title={t('nb.save')} disabled={!f.word.trim()} onPress={save} style={{ marginTop: space.l }} />
        {existing && (
          <Button title={t('nb.delete')} variant="ghost" icon={<Trash2 size={18} color={c.error} />} onPress={() => setConfirm(true)} style={{ marginTop: 8 }} />
        )}
      </ScrollView>

      <Sheet visible={confirm} onClose={() => setConfirm(false)} title={t('nb.delete')}>
        <View style={{ paddingHorizontal: 20, gap: 10 }}>
          <Txt v="callout" color={c.textSecondary}>{t('nb.deleteConfirm', { w: existing?.word ?? '' })}</Txt>
          <Button title={t('nb.delete')} variant="danger" onPress={remove} />
          <Button title={t('nb.cancel')} variant="secondary" onPress={() => setConfirm(false)} />
        </View>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={{ marginTop: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        {icon}
        <Txt v="captionMedium" color={c.textSecondary}>{label}</Txt>
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  wordCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.xl, borderWidth: StyleSheet.hairlineWidth },
  emoji: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  wordInput: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, paddingVertical: 2, minHeight: 44 },
  aiBtn: { marginTop: space.m, borderRadius: 26, overflow: 'hidden' },
  aiGrad: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  msg: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.s },
  input: { minHeight: 48, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 16 },
  multi: { minHeight: 76, textAlignVertical: 'top' },
});
