import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from '../../src/components/icons';
import { Txt } from '../../src/components/ui';
import { useTheme, fonts, space } from '../../src/theme/tokens';
import { useApp } from '../../src/store/useApp';
import { LEGAL } from '../../src/data/legal';
import { CONTACT_EMAIL } from '../../src/config';
import { goBack } from '../../src/lib/nav';

export default function LegalDoc() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { doc } = useLocalSearchParams<{ doc: 'privacy' | 'terms' }>();
  const ui = useApp((s) => s.settings.uiLang);
  const d = LEGAL[doc === 'terms' ? 'terms' : 'privacy'][ui === 'uk' ? 'uk' : 'en'];
  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ height: 52, justifyContent: 'center', paddingHorizontal: 16 }}>
        <Pressable onPress={() => goBack('/settings')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.l, paddingTop: 0, paddingBottom: insets.bottom + 40, maxWidth: 680, width: '100%', alignSelf: 'center' }}>
        <Txt style={{ fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, color: c.text }}>{d.title}</Txt>
        <Txt v="caption" color={c.textTertiary} style={{ marginTop: 6 }}>{d.updated}</Txt>
        {d.sections.map((s) => (
          <View key={s.h} style={{ marginTop: 22, gap: 8 }}>
            <Txt v="headline">{s.h}</Txt>
            {s.p.map((p, i) => <Txt key={i} v="body" color={c.textSecondary}>{p}</Txt>)}
          </View>
        ))}
        {CONTACT_EMAIL ? <Txt v="body" style={{ marginTop: 24 }}>✉️ {CONTACT_EMAIL}</Txt> : null}
      </ScrollView>
    </View>
  );
}
