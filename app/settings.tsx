import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ArrowLeft, X } from 'lucide-react-native';
import { Group, ListRow, Toggle, Txt, Segmented, Chip, Button } from '../src/components/ui';
import { Sheet, toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp, Level } from '../src/store/useApp';
import { LANGUAGES, LangCode, UI_LANGUAGES } from '../src/data/languages';
import { backendConnected } from '../src/lib/recognize';

export default function SettingsScreen() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const st = useApp();
  const s = st.settings;
  const [langSheet, setLangSheet] = useState<'native' | 'target' | null>(null);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [pin, setPin] = useState('');

  const confirmDelete = () => {
    const doIt = () => { st.resetAll(); router.replace('/onboarding'); };
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.deleteConfirm'))) doIt();
    } else Alert.alert(t('settings.deleteAccount'), t('settings.deleteConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: doIt }]);
  };

  const exportData = async () => {
    const { settings, words, collections, myPosts, history, profile } = useApp.getState();
    await Share.share({ message: JSON.stringify({ profile, settings, words, collections, myPosts, history }, null, 2) });
    toast(t('settings.exported'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 52 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <ArrowLeft size={22} color={c.text} />
        </Pressable>
        <Txt v="headline">{t('settings.title')}</Txt>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Group title={t('settings.languages')}>
          <ListRow title={t('settings.myLanguage')} value={LANGUAGES.find((l) => l.code === s.native)?.native} onPress={() => setLangSheet('native')} />
          <ListRow title={t('settings.learning')} value={s.targets.map((l) => languageName(l, s.uiLang)).join(', ')} onPress={() => setLangSheet('target')} />
          <View style={{ padding: 16, gap: 10 }}>
            <Txt v="captionMedium" color={c.textSecondary}>{t('settings.level')}</Txt>
            <Segmented<Level>
              value={s.level}
              onChange={(v) => st.updateSettings({ level: v })}
              options={(['beginner', 'intermediate', 'advanced'] as Level[]).map((l) => ({ value: l, label: t(`levels.${l}`) }))}
            />
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            <Txt v="captionMedium" color={c.textSecondary}>{t('settings.dailyGoal')}</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {([3, 5, 10, 15] as const).map((m) => <Chip key={m} label={t('learn.minutes', { n: m })} selected={s.dailyMinutes === m} onPress={() => st.updateSettings({ dailyMinutes: m })} />)}
            </View>
          </View>
        </Group>

        <Group title={t('settings.voice')}>
          <View style={{ padding: 16 }}>
            <Segmented value={s.voice} onChange={(v) => st.updateSettings({ voice: v })} options={[{ value: 'female', label: t('settings.female') }, { value: 'male', label: t('settings.male') }]} />
          </View>
          <ListRow title={t('settings.slow')} right={<Toggle value={s.slowVoice} onChange={(v) => st.updateSettings({ slowVoice: v })} />} />
        </Group>

        <Group title={t('settings.notifications')}>
          <ListRow title={t('settings.nDrop')} right={<Toggle value={s.notify.drop} onChange={(v) => st.updateSettings({ notify: { ...s.notify, drop: v } })} />} />
          <ListRow title={t('settings.nReview')} right={<Toggle value={s.notify.review} onChange={(v) => st.updateSettings({ notify: { ...s.notify, review: v } })} />} />
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
            <Txt v="captionMedium" color={c.textSecondary}>{t('settings.reviewTime')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {[8, 12, 18, 19, 20, 21].map((h) => <Chip key={h} label={`${h}:00`} selected={s.notify.reviewHour === h} onPress={() => st.updateSettings({ notify: { ...s.notify, reviewHour: h } })} />)}
            </ScrollView>
          </View>
          <ListRow title={t('settings.nFriends')} right={<Toggle value={s.notify.friends} onChange={(v) => st.updateSettings({ notify: { ...s.notify, friends: v } })} />} />
          <ListRow title={t('settings.nWeekly')} right={<Toggle value={s.notify.weekly} onChange={(v) => st.updateSettings({ notify: { ...s.notify, weekly: v } })} />} />
          <ListRow title={t('settings.friendsSummary')} right={<Toggle value={s.weeklyFriendsSummary} onChange={(v) => st.updateSettings({ weeklyFriendsSummary: v })} />} />
        </Group>

        <Group title={t('settings.appearance')}>
          <View style={{ padding: 16 }}>
            <Segmented value={s.theme} onChange={(v) => st.updateSettings({ theme: v })} options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))} />
          </View>
          <ListRow title={t('settings.sounds')} right={<Toggle value={s.sounds} onChange={(v) => st.updateSettings({ sounds: v })} />} />
          <ListRow title={t('settings.haptics')} right={<Toggle value={s.haptics} onChange={(v) => st.updateSettings({ haptics: v })} />} />
          <ListRow title={t('settings.reduceMotion')} right={<Toggle value={s.reduceMotion} onChange={(v) => st.updateSettings({ reduceMotion: v })} />} />
        </Group>

        <Group title={t('settings.privacy')} footer={t('settings.privacyNote')}>
          <ListRow title={t('settings.family')} subtitle={t('settings.familySub')} right={<Toggle value={st.familyMode.enabled} onChange={(v) => (v ? setFamilyOpen(true) : st.setFamilyMode({ enabled: false }))} />} />
          <ListRow title={t('settings.export')} onPress={exportData} />
          <ListRow title={t('settings.deleteAccount')} danger onPress={confirmDelete} />
        </Group>

        <Group title={t('settings.about')}>
          <ListRow title={t('settings.demoMode')} subtitle={t('settings.demoSub')} right={<Toggle value={s.demoMode} onChange={(v) => st.updateSettings({ demoMode: v })} />} />
          <ListRow title={t('settings.backend')} value={backendConnected() ? t('settings.backendOn') : t('settings.backendOff')} />
          <ListRow title="Thingual+" value={st.premium ? t('common.on') : t('common.off')} onPress={() => router.push('/paywall')} />
          <ListRow title={t('settings.version', { v: Constants.expoConfig?.version ?? '1.0.0' })} subtitle={t('settings.photos')} />
        </Group>
      </ScrollView>

      <Sheet visible={!!langSheet} onClose={() => setLangSheet(null)} title={langSheet === 'native' ? t('settings.myLanguage') : t('settings.learning')}>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
          {LANGUAGES.map((l) => {
            const sel = langSheet === 'native' ? s.native === l.code : s.targets.includes(l.code);
            return (
              <Pressable
                key={l.code}
                onPress={() => {
                  if (langSheet === 'native') {
                    st.updateSettings({ native: l.code, uiLang: UI_LANGUAGES.includes(l.code) ? l.code : 'en' });
                    setLangSheet(null);
                  } else if (sel && s.targets.length > 1) st.removeTarget(l.code);
                  else if (l.code !== s.native) {
                    if (!st.premium && s.targets.length >= 1 && !sel) toast(t('paywall.f2'), 'default');
                    st.addTarget(l.code as LangCode);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', height: 50, paddingHorizontal: 16, borderRadius: radius.s, backgroundColor: sel ? c.text : c.surfaceAlt, opacity: langSheet === 'target' && l.code === s.native ? 0.4 : 1 }}
              >
                <Txt v="bodyMedium" color={sel ? c.background : c.text} style={{ flex: 1 }}>{l.native}</Txt>
                <Txt v="caption" color={sel ? c.background : c.textSecondary}>{l.english}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      </Sheet>

      <Sheet visible={familyOpen} onClose={() => setFamilyOpen(false)} title={t('settings.family')}>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Txt v="callout" color={c.textSecondary}>{t('settings.familySub')}</Txt>
          <TextInput
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="PIN"
            keyboardType="number-pad"
            secureTextEntry
            placeholderTextColor={c.textTertiary}
            style={{ height: 56, borderRadius: radius.m, backgroundColor: c.surfaceAlt, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 24, letterSpacing: 8, color: c.text, textAlign: 'center' }}
          />
          <Button title={t('common.done')} disabled={pin.length !== 4} onPress={() => { st.setFamilyMode({ enabled: true, pin }); setFamilyOpen(false); setPin(''); toast(t('settings.family')); }} />
        </View>
      </Sheet>
    </View>
  );
}
