import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mic, Send, Volume2 } from '../src/components/icons';
import { Txt, Chip } from '../src/components/ui';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp } from '../src/store/useApp';
import { lang } from '../src/data/languages';
import { emojiUrl } from '../src/data/emoji';
import { chatTurn, SCENARIOS, type ChatMsg } from '../src/lib/tutor';
import { listenOnce, speechRecognitionAvailable } from '../src/lib/speech';
import { speak, haptic } from '../src/lib/feedback';
import { cefrOf } from '../src/lib/level';
import { goBack } from '../src/lib/nav';
import { hasQuota, spendQuota, requireMax, quotaLeft } from '../src/lib/premium';
import { useIsMax } from '../src/lib/premium';


/** AI conversation partner: role-play real situations in the language you learn, with gentle corrections. */
export default function Tutor() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const s = useApp((x) => x.settings);
  const [scenario, setScenario] = useState<(typeof SCENARIOS)[number] | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [showTr, setShowTr] = useState<Record<number, boolean>>({});
  const list = useRef<FlatList<ChatMsg>>(null);
  const max = useIsMax();

  const ask = async (history: ChatMsg[], sc = scenario) => {
    if (!sc) return;
    setBusy(true);
    setError(null);
    try {
      const r = await chatTurn({ messages: history, scenario: sc.prompt, target: s.active, native: s.native, level: cefrOf(s) });
      if (r.error) throw new Error(r.error);
      if (history.length) spendQuota('chat');
      const next = [...history];
      if (r.correction && next.length && next[next.length - 1].role === 'user') next[next.length - 1] = { ...next[next.length - 1], correction: r.correction };
      next.push({ role: 'assistant', content: r.reply, translation: r.translation });
      setMsgs(next);
      speak(r.reply, s.active);
      setTimeout(() => list.current?.scrollToEnd({ animated: true }), 80);
    } catch (e) {
      const m = String((e as Error).message);
      setError(m.includes('no_key') || m.startsWith('api_') ? t('tutor.noKey') : t('social.offline'));
    } finally {
      setBusy(false);
    }
  };

  const start = (sc: (typeof SCENARIOS)[number]) => {
    haptic.light();
    setScenario(sc);
    setMsgs([]);
    ask([], sc);
  };

  const send = () => {
    const v = text.trim();
    if (!v || busy) return;
    if (!hasQuota('chat')) { requireMax('chat'); return; }
    const history: ChatMsg[] = [...msgs, { role: 'user', content: v }];
    setMsgs(history);
    setText('');
    const st = useApp.getState();
    st.questBump('chat');
    if (history.filter((m) => m.role === 'user').length === 1) st.markActive();
    ask(history);
  };

  const mic = () => {
    if (!speechRecognitionAvailable()) return;
    setListening(true);
    listenOnce(lang(s.active).voice, (heard) => setText((x) => (x ? `${x} ${heard}` : heard)), () => setListening(false));
  };

  if (!scenario) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
        <View style={{ height: 48, justifyContent: 'center', paddingHorizontal: 16 }}>
          <Pressable onPress={() => goBack('/(tabs)/learn')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: space.m, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
          <Image source={{ uri: emojiUrl('🤖') }} style={{ width: 64, height: 64 }} />
          <Txt v="display" style={{ marginTop: 8 }}>{t('tutor.title')}</Txt>
          <Txt v="callout" color={c.textSecondary} style={{ marginTop: 4 }}>{t('tutor.sub', { lang: languageName(s.active, s.uiLang) })}</Txt>
          <View style={styles.grid}>
            {SCENARIOS.map((sc, i) => (
              <Animated.View key={sc.id} entering={FadeInDown.delay(i * 40)} style={{ width: '48%', flexGrow: 1 }}>
                <Pressable onPress={() => start(sc)} style={[styles.sc, { backgroundColor: c.surface, borderColor: c.divider }]}>
                  <Image source={{ uri: emojiUrl(sc.emoji) }} style={{ width: 40, height: 40 }} />
                  <Txt v="bodyMedium">{t(`tutor.sc.${sc.id}`)}</Txt>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => setScenario(null)} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
        <Image source={{ uri: emojiUrl(scenario.emoji) }} style={{ width: 28, height: 28 }} />
        <View style={{ flex: 1 }}>
          <Txt v="bodyMedium">{t(`tutor.sc.${scenario.id}`)}</Txt>
          <Txt v="caption" color={c.textSecondary}>{languageName(s.active, s.uiLang)} · {cefrOf(s)}{max ? '' : ` · ${t('max.chatLeft', { n: Math.max(0, quotaLeft('chat')) })}`}</Txt>
        </View>
      </View>
      <FlatList
        ref={list}
        data={msgs}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: space.m, gap: 10, maxWidth: 720, width: '100%', alignSelf: 'center' }}
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        renderItem={({ item, index }) =>
          item.role === 'assistant' ? (
            <Animated.View entering={FadeInUp.springify().damping(18)} style={{ alignSelf: 'flex-start', maxWidth: '86%' }}>
              <Pressable onPress={() => setShowTr((x) => ({ ...x, [index]: !x[index] }))} style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.divider, borderTopLeftRadius: 6 }]}>
                <Txt v="body">{item.content}</Txt>
                {showTr[index] && item.translation ? <Txt v="caption" color={c.textSecondary} style={{ marginTop: 6 }}>{item.translation}</Txt> : null}
                <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                  <Pressable onPress={() => speak(item.content, s.active)} hitSlop={8}><Volume2 size={16} color={c.textTertiary} /></Pressable>
                  <Txt v="caption" color={c.textTertiary}>{showTr[index] ? t('tutor.hide') : t('tutor.translate')}</Txt>
                </View>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInUp.springify().damping(18)} style={{ alignSelf: 'flex-end', maxWidth: '86%', gap: 6 }}>
              <View style={[styles.bubble, { backgroundColor: c.ink, borderTopRightRadius: 6 }]}>
                <Txt v="body" color={c.background}>{item.content}</Txt>
              </View>
              {item.correction ? (
                <View style={[styles.correction, { backgroundColor: c.dropSoft }]}>
                  <Txt v="caption" color={c.text}>✏️ {item.correction}</Txt>
                </View>
              ) : null}
            </Animated.View>
          )
        }
        ListFooterComponent={
          <View style={{ paddingVertical: 8 }}>
            {busy ? <ActivityIndicator color={c.textSecondary} /> : null}
            {error ? <Txt v="caption" color={c.error} center>{error}</Txt> : null}
          </View>
        }
      />
      {msgs.length > 0 && msgs.length < 3 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space.m, paddingBottom: 8 }}>
          {[t('tutor.hint1'), t('tutor.hint2')].map((h) => <Chip key={h} label={h} onPress={() => setText(h)} />)}
        </ScrollView>
      )}
      <View style={[styles.inputRow, { borderTopColor: c.divider, paddingBottom: insets.bottom + 10 }]}>
        {speechRecognitionAvailable() && (
          <Pressable onPress={mic} style={[styles.round, { backgroundColor: listening ? c.drop : c.surfaceAlt }]}><Mic size={18} color={listening ? '#fff' : c.text} /></Pressable>
        )}
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('tutor.placeholder')}
          placeholderTextColor={c.textTertiary}
          onSubmitEditing={send}
          returnKeyType="send"
          style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
        />
        <Pressable onPress={send} disabled={!text.trim() || busy} style={[styles.round, { backgroundColor: c.accent, opacity: !text.trim() || busy ? 0.4 : 1 }]}><Send size={17} color={c.onAccent} /></Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 60 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: space.l },
  sc: { padding: 16, borderRadius: radius.l, borderWidth: StyleSheet.hairlineWidth, gap: 10, minHeight: 112 },
  bubble: { padding: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  correction: { padding: 10, borderRadius: 14 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, height: 44, borderRadius: 22, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 15 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
