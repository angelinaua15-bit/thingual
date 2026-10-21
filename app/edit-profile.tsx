import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { goBack } from '../src/lib/nav';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, X } from '../src/components/icons';
import { Avatar, Button, Txt } from '../src/components/ui';
import { toast } from '../src/components/Overlay';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { handleAvailable, normalizeHandle, updateProfile, uploadImage } from '../src/lib/api';
import { useMe, useNet } from '../src/lib/queries';
import { pickImage } from '../src/lib/pickImage';
import { haptic } from '../src/lib/feedback';

export default function EditProfile() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const uid = useNet((s) => s.uid);
  const me = useMe().data;
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setHandle(me.handle);
    setBio(me.bio);
    setAvatar(me.avatar_url);
  }, [me?.id]);

  const save = async () => {
    const h = normalizeHandle(handle);
    if (h.length < 3) return setError(t('social.handleRules'));
    setSaving(true);
    setError('');
    try {
      if (h !== me?.handle && !(await handleAvailable(h, uid))) {
        setError(t('social.handleTaken'));
        return;
      }
      let avatar_url = avatar;
      if (newAvatar) avatar_url = await uploadImage('avatars', newAvatar);
      if (newAvatar === null) avatar_url = null;
      const updated = await updateProfile({ name: name.trim(), handle: h, bio: bio.trim(), avatar_url });
      qc.setQueryData(['me'], updated);
      qc.setQueryData(['profile', updated.id], updated);
      qc.invalidateQueries({ queryKey: ['feed'] });
      haptic.success();
      toast(t('social.saved'));
      goBack();
    } catch (e) {
      setError((e as { code?: string })?.code === '23505' ? t('social.handleTaken') : t('social.offline'));
    } finally {
      setSaving(false);
    }
  };

  const shown = newAvatar === undefined ? avatar : newAvatar;

  return (
    <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack()} hitSlop={12}><X size={22} color={c.text} /></Pressable>
        <Txt v="headline" style={{ flex: 1 }}>{t('social.editProfile')}</Txt>
        {saving ? <ActivityIndicator color={c.accent} /> : (
          <Pressable onPress={save} hitSlop={10}><Txt v="bodyMedium" color={c.accent}>{t('common.done')}</Txt></Pressable>
        )}
      </View>
      <ScrollView contentContainerStyle={{ padding: space.m, paddingBottom: insets.bottom + 40, maxWidth: 560, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginVertical: 12 }}>
          <Pressable onPress={async () => { const u = await pickImage({ square: true, max: 600 }); if (u) setNewAvatar(u); }}>
            <Avatar seed={uid ?? 'x'} size={110} label={name || handle} uri={shown} />
            <View style={[styles.camBadge, { backgroundColor: c.text, borderColor: c.background }]}><Camera size={16} color={c.background} /></View>
          </Pressable>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 12 }}>
            <Pressable onPress={async () => { const u = await pickImage({ square: true, max: 600 }); if (u) setNewAvatar(u); }}>
              <Txt v="captionMedium" color={c.accent}>{t('social.changePhoto')}</Txt>
            </Pressable>
            {shown ? (
              <Pressable onPress={() => setNewAvatar(null)}>
                <Txt v="captionMedium" color={c.error}>{t('social.removePhoto')}</Txt>
              </Pressable>
            ) : null}
          </View>
        </View>
        <Field label={t('social.name')} value={name} onChange={setName} max={40} />
        <Field label={t('social.handle')} value={handle} onChange={(v) => setHandle(normalizeHandle(v))} max={24} prefix="@" hint={t('social.handleRules')} />
        <Field label={t('social.bio')} value={bio} onChange={setBio} max={160} multiline placeholder={t('social.bioPlaceholder')} />
        {error ? <Txt v="callout" color={c.error} style={{ marginTop: 8 }}>{error}</Txt> : null}
        <Button title={t('common.save')} onPress={save} loading={saving} style={{ marginTop: 20 }} />
      </ScrollView>
    </View>
  );
}

function Field({ label, value, onChange, max, multiline, prefix, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; max: number; multiline?: boolean; prefix?: string; hint?: string; placeholder?: string }) {
  const { c } = useTheme();
  return (
    <View style={{ marginTop: 14 }}>
      <Txt v="captionMedium" color={c.textSecondary} style={{ marginBottom: 6 }}>{label}</Txt>
      <View style={[styles.field, { backgroundColor: c.surface, borderColor: c.divider, minHeight: multiline ? 90 : 50 }]}>
        {prefix ? <Txt v="body" color={c.textTertiary}>{prefix}</Txt> : null}
        <TextInput
          value={value}
          onChangeText={(v) => onChange(v.slice(0, max))}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={c.textTertiary}
          autoCapitalize={prefix ? 'none' : 'sentences'}
          autoCorrect={!prefix}
          style={{ flex: 1, color: c.text, fontFamily: fonts.regular, fontSize: 16, paddingVertical: 12, textAlignVertical: multiline ? 'top' : 'center' }}
        />
      </View>
      <Txt v="caption" color={c.textTertiary} style={{ marginTop: 4 }}>{hint ? `${hint} · ` : ''}{value.length}/{max}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 52, maxWidth: 560, width: '100%', alignSelf: 'center' },
  camBadge: { position: 'absolute', right: 0, bottom: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
});
