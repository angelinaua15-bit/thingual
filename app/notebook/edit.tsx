import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, Camera, ImagePlus, Lightbulb, Trash2, Volume2, X } from '../../src/components/icons';
import { Txt, Button, Chip } from '../../src/components/ui';
import { EmojiArt, NoteArt } from '../../src/components/NoteBits';
import { toast, Sheet } from '../../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../../src/theme/tokens';
import { useT, languageName } from '../../src/i18n';
import { useApp, type NoteInput } from '../../src/store/useApp';
import { PICK_EMOJI, fromConcept, lookupWord } from '../../src/lib/notebook';
import { pickImage } from '../../src/lib/pickImage';
import { needsPersist, persistPhoto } from '../../src/lib/photoStore';
import { fullWord, labelOf } from '../../src/data/concepts';
import { speak, haptic } from '../../src/lib/feedback';
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
  const [f, setF] = useState<NoteInput>(() =>
    existing
      ? { word: existing.word, lang: existing.lang, translation: existing.translation, ipa: existing.ipa, roman: existing.roman, pos: existing.pos, association: existing.association, example: existing.example, exampleTr: existing.exampleTr, emoji: existing.emoji, photo: existing.photo, conceptId: existing.conceptId, note: existing.note }
      : { word: preset ?? '', lang: s.active, translation: '' },
  );
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const set = (patch: Partial<NoteInput>) => setF((x) => ({ ...x, ...patch }));
  // offline helper: words we already know in any language
  const matches = useMemo(() => (f.conceptId && fullWord(f.conceptId, f.lang) === f.word ? [] : lookupWord(f.word)), [f.word, f.lang, f.conceptId]);
  const useMatch = (id: string) => {
    const cc = matches.find((m) => m.id === id);
    if (!cc) return;
    haptic.success();
    const d = fromConcept(cc, f.lang, s.native);
    setF((x) => ({ ...x, ...d, translation: x.translation || d.translation || '', association: x.association, note: x.note, photo: x.photo || d.photo }));
    setMsg({ text: t('nb.filled'), ok: true });
    speak(d.word ?? f.word, f.lang);
  };
  const addPhoto = async (camera?: boolean) => {
    const uri = await pickImage({ square: true, camera, max: 1080 });
    if (uri) set({ photo: uri });
  };

  const save = async () => {
    const word = f.word.trim();
    if (!word) return setMsg({ text: t('nb.needWord'), ok: false });
    setSaving(true);
    // keep photos from the gallery/camera on the device (not just in memory)
    const photo = f.photo && needsPersist(f.photo) ? await persistPhoto(f.photo).catch(() => f.photo) : f.photo;
    setSaving(false);
    const clean: NoteInput = { ...f, word, photo, translation: f.translation.trim() };
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
        <Pressable onPress={save} hitSlop={10} disabled={!f.word.trim() || saving}><Txt v="bodyMedium" color={f.word.trim() ? c.accent : c.textTertiary}>{t('nb.save')}</Txt></Pressable>
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

        {/* built-in dictionary suggestions */}
        {matches.length > 0 && (
          <Animated.View entering={FadeIn} style={[styles.found, { backgroundColor: c.accentSoft }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BookOpen size={14} color={c.accent} />
              <Txt v="captionMedium" color={c.accent}>{t('nb.found')}</Txt>
            </View>
            {matches.map((m) => (
              <Pressable key={m.id} onPress={() => useMatch(m.id)} style={[styles.foundRow, { backgroundColor: c.surface }]}>
                <EmojiArt emoji={m.emoji} size={28} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt v="bodyMedium" numberOfLines={1}>{fullWord(m.id, f.lang)}</Txt>
                  <Txt v="caption" color={c.textSecondary} numberOfLines={1}>{labelOf(m.id, s.native)?.word}</Txt>
                </View>
                <Txt v="captionMedium" color={c.accent}>{t('nb.use')}</Txt>
              </Pressable>
            ))}
          </Animated.View>
        )}
        {msg && (
          <Animated.View entering={FadeIn} style={[styles.msg, { backgroundColor: msg.ok ? c.successSoft : c.errorSoft }]}>
            <Txt v="caption" color={msg.ok ? c.success : c.error}>{msg.text}</Txt>
          </Animated.View>
        )}

        {/* picture */}
        <Field label={t('nb.picture')}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.pic, { backgroundColor: c.surfaceAlt }]}>
              <NoteArt photo={f.photo} emoji={f.emoji} size={120} />
              {f.photo ? (
                <Pressable onPress={() => set({ photo: undefined })} hitSlop={8} style={styles.picX} accessibilityLabel="remove photo"><X size={14} color="#fff" /></Pressable>
              ) : null}
            </View>
            <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
              <Button title={t('nb.gallery')} variant="secondary" size="m" icon={<ImagePlus size={17} color={c.text} />} onPress={() => addPhoto(false)} />
              {Platform.OS !== 'web' && <Button title={t('nb.camera')} variant="secondary" size="m" icon={<Camera size={17} color={c.text} />} onPress={() => addPhoto(true)} />}
              <Txt v="caption" color={c.textTertiary}>{t('nb.pictureHint')}</Txt>
            </View>
          </View>
          <View style={styles.emojiGrid}>
            {PICK_EMOJI.map((e) => {
              const on = !f.photo && f.emoji === e;
              return (
                <Pressable key={e} onPress={() => { haptic.light(); set({ emoji: e, photo: undefined }); }} style={[styles.emojiCell, { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accent : c.divider }]}>
                  <EmojiArt emoji={e} size={26} />
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* fields */}
        <Field label={t('nb.translation')}>
          <TextInput value={f.translation} onChangeText={(v) => set({ translation: v })} placeholder={t('nb.translationPh')} placeholderTextColor={c.textTertiary} style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]} />
        </Field>

        <View>
          <View>
            <Field label={t('nb.transcription')}>
              <TextInput value={f.ipa ?? ''} onChangeText={(v) => set({ ipa: v })} placeholder="/liβeɾˈtað/" placeholderTextColor={c.textTertiary} autoCapitalize="none" style={[styles.input, { backgroundColor: c.surface, borderColor: c.divider, color: c.text }]} />
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

        <Button title={t('nb.save')} disabled={!f.word.trim()} loading={saving} onPress={save} style={{ marginTop: space.l }} />
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
  found: { marginTop: space.m, padding: 12, borderRadius: radius.l, gap: 8 },
  foundRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.m },
  pic: { width: 120, height: 120, borderRadius: 24, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  picX: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  emojiCell: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  wordInput: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, paddingVertical: 2, minHeight: 44 },
  msg: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.s },
  input: { minHeight: 48, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 16 },
  multi: { minHeight: 76, textAlignVertical: 'top' },
});
