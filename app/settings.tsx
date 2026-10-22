import { InstallBanner } from '../src/components/InstallBanner';
import { haptic } from '../src/lib/feedback';
import { shareFile } from '../src/lib/share';
import React, { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Share, TextInput, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { CEFR_ORDER, bucketOf, cefrOf } from '../src/lib/level';
import { canAddLanguage } from '../src/lib/premium';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { ArrowLeft, X } from '../src/components/icons';
import { Group, ListRow, Toggle, Txt, Segmented, Chip, Button } from '../src/components/ui';
import { Sheet, toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT, languageName } from '../src/i18n';
import { useApp, Level } from '../src/store/useApp';
import { LANGUAGES, LangCode, UI_LANGUAGES } from '../src/data/languages';
import { MaxBanner } from '../src/components/MaxBanner';
import { deleteMyData, linkEmail, myEmail } from '../src/lib/api';
import { askNotifications } from '../src/lib/notifications';
import { qc, useNet } from '../src/lib/queries';

export default function SettingsScreen() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const st = useApp();
  const s = st.settings;
  const [langSheet, setLangSheet] = useState<'native' | 'target' | null>(null);
  const [familyOpen, setFamilyOpen] = useState<false | 'set' | 'unlock'>(false);
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [linked, setLinked] = useState<string | null>(null);
  React.useEffect(() => { myEmail().then(setLinked).catch(() => {}); }, []);
  const uid = useNet((x) => x.uid);

  const confirmDelete = () => {
    const doIt = async () => {
      try {
        await deleteMyData();
      } catch {
        toast(t('settings.deleteFailed'));
        return;
      }
      qc.clear();
      st.resetAll();
      toast(t('settings.deleted'), 'success');
      router.replace('/onboarding');
    };
    if (Platform.OS === 'web') {
      if (window.confirm(t('settings.deleteConfirm'))) doIt();
    } else Alert.alert(t('settings.deleteAccount'), t('settings.deleteConfirm'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: doIt }]);
  };

  const exportData = async () => {
    const { settings, words, collections, history, profile } = useApp.getState();
    await shareFile(JSON.stringify({ profile, settings, words, collections, history }, null, 2), 'thingual-export.json', 'application/json');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, height: 52 }}>
        <Pressable onPress={() => goBack()} hitSlop={12}>
          <ArrowLeft size={22} color={c.text} />
        </Pressable>
        <Txt v="headline">{t('settings.title')}</Txt>
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <MaxBanner style={{ marginBottom: 8 }} />
        <InstallBanner always />
        <View style={{ height: 12 }} />
        <Group title={t('settings.languages')}>
          <ListRow title={t('settings.myLanguage')} value={LANGUAGES.find((l) => l.code === s.native)?.native} onPress={() => setLangSheet('native')} />
          <ListRow title={t('settings.learning')} value={s.targets.map((l) => languageName(l, s.uiLang)).join(', ')} onPress={() => setLangSheet('target')} />
          <View style={{ padding: 16, paddingBottom: 4, gap: 10 }}>
            <Txt v="captionMedium" color={c.textSecondary}>{t('settings.uiLanguage')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {UI_LANGUAGES.map((code) => (
                <Chip key={code} label={LANGUAGES.find((l) => l.code === code)?.native ?? code} selected={s.uiLang === code} onPress={() => st.updateSettings({ uiLang: code })} />
              ))}
            </ScrollView>
            <Txt v="captionMedium" color={c.textSecondary} style={{ marginTop: 6 }}>{t('settings.speakerGender')}</Txt>
            <Segmented
              value={s.speakerGender ?? 'male'}
              onChange={(v) => st.updateSettings({ speakerGender: v })}
              options={[{ value: 'male', label: t('settings.genderMale') }, { value: 'female', label: t('settings.genderFemale') }]}
            />
          </View>
          <View style={{ padding: 16, gap: 10 }}>
            <Txt v="captionMedium" color={c.textSecondary}>{t('settings.level')}</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CEFR_ORDER.map((l) => (
                <Chip key={l} label={`${l} · ${t(`cefr.${l}`)}`} selected={cefrOf(s) === l} onPress={() => st.updateSettings({ cefr: l, level: bucketOf(l) })} />
              ))}
            </View>
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

        {Platform.OS !== 'web' && (
          <Group title={t('settings.notifications')}>
            <ListRow title={t('settings.nDrop')} right={<Toggle value={s.notify.drop} onChange={(v) => { if (v) askNotifications(true); st.updateSettings({ notify: { ...s.notify, drop: v } }); }} />} />
            <ListRow title={t('settings.nReview')} right={<Toggle value={s.notify.review} onChange={(v) => { if (v) askNotifications(true); st.updateSettings({ notify: { ...s.notify, review: v } }); }} />} />
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
              <Txt v="captionMedium" color={c.textSecondary}>{t('settings.reviewTime')}</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {[8, 12, 18, 19, 20, 21].map((h) => <Chip key={h} label={`${h}:00`} selected={s.notify.reviewHour === h} onPress={() => st.updateSettings({ notify: { ...s.notify, reviewHour: h } })} />)}
              </ScrollView>
            </View>
          </Group>
        )}

        <Group title={t('settings.account')} footer={uid ? `${t('settings.accountId')}: ${uid}` : undefined}>
          <View style={{ padding: 16, gap: 10 }}>
            {linked ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.success }} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyMedium">{t('sync.on')}</Txt>
                  <Txt v="caption" color={c.textSecondary}>{linked}</Txt>
                </View>
              </View>
            ) : null}
            <Txt v="bodyMedium">{linked ? t('sync.changeEmail') : t('settings.linkEmail')}</Txt>
            <Txt v="caption" color={c.textSecondary}>{t('sync.linkSub')}</Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={c.textTertiary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ flex: 1, height: 44, borderRadius: radius.s, backgroundColor: c.surfaceAlt, paddingHorizontal: 12, color: c.text, fontFamily: fonts.regular, fontSize: 15 }}
              />
              <Button
                title={t('common.save')}
                size="m"
                disabled={!/^\S+@\S+\.\S+$/.test(email)}
                onPress={async () => {
                  try {
                    await linkEmail(email.trim());
                    toast(t('settings.emailSent'));
                  } catch {
                    toast(t('social.offline'), 'default');
                  }
                }}
              />
            </View>
          </View>
          <ListRow title={t('sync.signinOther')} subtitle={t('sync.signinOtherSub')} onPress={() => router.push('/signin')} />
        </Group>

        <Group title={t('settings.appearance')}>
          <View style={{ padding: 16 }}>
            <Segmented value={s.theme} onChange={(v) => st.updateSettings({ theme: v })} options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))} />
          </View>
          <ListRow title={t('settings.haptics')} right={<Toggle value={s.haptics} onChange={(v) => st.updateSettings({ haptics: v })} />} />
          <ListRow title={t('settings.reduceMotion')} right={<Toggle value={s.reduceMotion} onChange={(v) => st.updateSettings({ reduceMotion: v })} />} />
        </Group>

        <Group title={t('settings.privacy')} footer={t('settings.privacyNote')}>
          <ListRow title={t('settings.family')} subtitle={t('settings.familySub')} right={<Toggle value={st.familyMode.enabled} onChange={(v) => setFamilyOpen(v ? 'set' : 'unlock')} />} />
          <ListRow title={t('settings.export')} onPress={exportData} />
          <ListRow title={t('legal.privacy')} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'privacy' } })} />
          <ListRow title={t('legal.terms')} onPress={() => router.push({ pathname: '/legal/[doc]', params: { doc: 'terms' } })} />
          <ListRow title={t('settings.deleteAccount')} danger onPress={confirmDelete} />
        </Group>

        <Group title={t('settings.about')}>
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
                    // the language you speak can't also be the one you learn
                    if (s.targets.includes(l.code)) {
                      const rest = s.targets.filter((x) => x !== l.code);
                      const fallback = rest[0] ?? (l.code === 'en' ? 'es' : 'en');
                      st.updateSettings({ targets: rest.length ? rest : [fallback], active: rest.includes(s.active) ? s.active : fallback });
                    }
                    st.updateSettings({ native: l.code, uiLang: UI_LANGUAGES.includes(l.code) ? l.code : 'en' });
                    setLangSheet(null);
                  } else if (sel && s.targets.length > 1) st.removeTarget(l.code);
                  else if (l.code !== s.native) {
                    if (!canAddLanguage(l.code)) { setLangSheet(null); return; }
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

      <Sheet visible={!!familyOpen} onClose={() => { setFamilyOpen(false); setPin(''); }} title={t('settings.family')}>
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          <Txt v="callout" color={c.textSecondary}>{familyOpen === 'unlock' ? t('settings.familyUnlock') : t('settings.familySub')}</Txt>
          <TextInput
            value={pin}
            onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
            placeholder="PIN"
            keyboardType="number-pad"
            secureTextEntry
            placeholderTextColor={c.textTertiary}
            style={{ height: 56, borderRadius: radius.m, backgroundColor: c.surfaceAlt, paddingHorizontal: 16, fontFamily: fonts.semibold, fontSize: 24, letterSpacing: 8, color: c.text, textAlign: 'center' }}
          />
          <Button title={t('common.done')} disabled={pin.length !== 4} onPress={() => {
            if (familyOpen === 'unlock') {
              if (pin !== st.familyMode.pin) { haptic.error(); toast(t('settings.wrongPin')); setPin(''); return; }
              st.setFamilyMode({ enabled: false });
            } else st.setFamilyMode({ enabled: true, pin });
            setFamilyOpen(false); setPin(''); toast(t('settings.family'));
          }} />
        </View>
      </Sheet>
    </View>
  );
}
