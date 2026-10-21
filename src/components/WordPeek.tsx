import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Bookmark, BookmarkCheck, Search, Volume2 } from 'lucide-react-native';
import { Sheet, toast } from './Overlay';
import { Button, Txt, PressableScale } from './ui';
import { Photo, photoForWord } from './Photo';
import { useTheme, fonts, radius } from '../theme/tokens';
import { useT } from '../i18n';
import { useApp, WordSource } from '../store/useApp';
import { CONCEPTS, conceptById, fullWord, labelOf } from '../data/concepts';
import { haptic, speak } from '../lib/feedback';

/** Small card that rises after recognition: photo, word, sound, save. */
export function WordPeek({ conceptId, photo, visible, onClose, alternatives = [], confidence = 1, source, onChange }: {
  conceptId: string | null; photo?: string; visible: boolean; onClose: () => void; alternatives?: string[]; confidence?: number; source: WordSource; onChange?: (id: string) => void;
}) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const saved = useApp((x) => (conceptId ? !!x.words[conceptId] : false));
  const saveWord = useApp((x) => x.saveWord);
  if (!conceptId) return null;
  const target = s.active;
  const l = labelOf(conceptId, target)!;
  const nat = labelOf(conceptId, s.native)!;

  const save = () => {
    const ok = saveWord(conceptId, photo ?? '', source);
    haptic.success();
    toast(ok ? t('word.savedToast') : t('word.alreadySaved'));
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
        <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
          <Animated.View entering={ZoomIn.springify().damping(15)} style={{ width: 96, height: 120, borderRadius: radius.m, overflow: 'hidden' }}>
            <Photo uri={photoForWord(conceptId, photo, 400)} style={{ width: '100%', height: '100%' }} />
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(80)} style={{ flex: 1 }}>
            {l.article ? <Txt v="caption" color={c.textSecondary}>{l.article}</Txt> : null}
            <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: c.text }} numberOfLines={2}>{l.word}</Txt>
            {l.roman ? <Txt v="callout" color={c.textSecondary}>{l.roman}</Txt> : null}
            <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{nat.word}</Txt>
          </Animated.View>
          <Pressable onPress={() => speak(l.word, target)} style={[styles.round, { backgroundColor: c.surfaceAlt }]} hitSlop={8}>
            <Volume2 size={20} color={c.text} />
          </Pressable>
        </View>

        {confidence < 0.9 && alternatives.length > 0 && (
          <Animated.View entering={FadeIn} style={{ marginTop: 16 }}>
            <Txt v="captionMedium" color={c.textSecondary} style={{ marginBottom: 8 }}>{t('camera.whatIsIt')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {alternatives.map((a) => (
                <PressableScale key={a} onPress={() => onChange?.(a)} style={[styles.alt, { borderColor: c.divider }]}>
                  <Txt v="callout">{fullWord(a, target)}</Txt>
                </PressableScale>
              ))}
            </View>
          </Animated.View>
        )}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Button
            title={saved ? t('common.saved') : t('common.save')}
            variant={saved ? 'secondary' : 'primary'}
            icon={saved ? <BookmarkCheck size={18} color={c.text} /> : <Bookmark size={18} color={c.onAccent} />}
            onPress={save}
            style={{ flex: 1 }}
          />
          <Button
            title={t('common.open')}
            variant="secondary"
            onPress={() => {
              if (!saved) saveWord(conceptId, photo ?? '', source);
              onClose();
              router.push({ pathname: '/word/[id]', params: { id: conceptId } });
            }}
            style={{ flex: 1 }}
          />
        </View>
        <Pressable onPress={() => onChange?.('__pick__')} style={{ alignItems: 'center', paddingTop: 14 }}>
          <Txt v="captionMedium" color={c.textSecondary}>{t('word.wrong')}</Txt>
        </Pressable>
      </View>
    </Sheet>
  );
}

/** Full picker — the "low confidence" path, also used for corrections. */
export function ConceptPicker({ visible, onClose, onPick, photo }: { visible: boolean; onClose: () => void; onPick: (id: string) => void; photo?: string }) {
  const { c } = useTheme();
  const { t } = useT();
  const s = useApp((x) => x.settings);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return CONCEPTS;
    return CONCEPTS.filter((cc) => Object.values(cc.labels).some((l) => l.word.toLowerCase().includes(query) || l.roman?.toLowerCase().includes(query)));
  }, [q]);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('camera.pickConcept')}>
      <View style={{ paddingHorizontal: 20 }}>
        {photo ? (
          <View style={{ height: 140, borderRadius: radius.m, overflow: 'hidden', marginBottom: 12 }}>
            <Photo uri={photo} style={{ width: '100%', height: '100%' }} />
          </View>
        ) : null}
        <View style={[styles.search, { backgroundColor: c.surfaceAlt }]}>
          <Search size={18} color={c.textSecondary} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={t('dictionary.search')}
            placeholderTextColor={c.textTertiary}
            style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 10 }}
            autoCorrect={false}
          />
        </View>
      </View>
      <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }} keyboardShouldPersistTaps="handled">
        {list.map((cc) => (
          <PressableScale key={cc.id} onPress={() => onPick(cc.id)} style={{ width: 96 }}>
            <View style={{ width: 96, height: 96, borderRadius: radius.s, overflow: 'hidden' }}>
              <Photo uri={photoForWord(cc.id, undefined, 200)} style={{ width: '100%', height: '100%' }} />
            </View>
            <Txt v="captionMedium" numberOfLines={1} style={{ marginTop: 4 }}>{labelOf(cc.id, s.native)?.word}</Txt>
            <Txt v="caption" numberOfLines={1} color={c.textSecondary}>{fullWord(cc.id, s.active)}</Txt>
          </PressableScale>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  alt: { paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.s, paddingHorizontal: 12 },
});

export { conceptById };
