import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from '../src/components/icons';
import { Txt, Button } from '../src/components/ui';
import { LogoMark } from '../src/components/Logo';
import { useTheme, fonts, radius, space } from '../src/theme/tokens';
import { useT } from '../src/i18n';
import { signInWithEmail, verifyEmailCode } from '../src/lib/api';
import { goBack } from '../src/lib/nav';

/** Restore an existing account on a new device with a magic link. */
export default function SignIn() {
  const { c } = useTheme();
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  const send = async () => {
    setState('sending');
    try {
      await signInWithEmail(email.trim().toLowerCase());
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top }}>
      <View style={styles.bar}>
        <Pressable onPress={() => goBack('/onboarding')} hitSlop={12}><ArrowLeft size={22} color={c.text} /></Pressable>
      </View>
      <View style={{ flex: 1, padding: space.l, maxWidth: 480, width: '100%', alignSelf: 'center', justifyContent: 'center' }}>
        <Animated.View entering={FadeInDown.springify()}><LogoMark size={64} /></Animated.View>
        <Txt v="display" style={{ marginTop: 18 }}>{t('sync.signinTitle')}</Txt>
        <Txt v="callout" color={c.textSecondary} style={{ marginTop: 8 }}>{t('sync.signinSub')}</Txt>
        {state === 'sent' ? (
          <Animated.View entering={FadeIn} style={[styles.sent, { backgroundColor: c.successSoft }]}>
            <Check size={20} color={c.success} />
            <View style={{ flex: 1 }}>
              <Txt v="bodyMedium">{t('sync.sentTitle')}</Txt>
              <Txt v="caption" color={c.textSecondary}>{t('sync.sentSub', { email: email.trim() })}</Txt>
            </View>
          </Animated.View>
        ) : null}
        {state === 'sent' ? (
          <View style={{ marginTop: 18 }}>
            <Txt v="captionMedium" color={c.textSecondary}>{t('sync.orCode')}</Txt>
            <TextInput
              value={code}
              onChangeText={(v) => { setCode(v.replace(/\D/g, '').slice(0, 8)); setCodeError(false); }}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              placeholder="123456"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { marginTop: 8, letterSpacing: 6, textAlign: 'center', backgroundColor: c.surface, borderColor: codeError ? c.error : c.divider, color: c.text }]}
            />
            {codeError && <Txt v="caption" color={c.error} style={{ marginTop: 6 }}>{t('sync.badCode')}</Txt>}
            <Button
              title={t('sync.verify')}
              disabled={code.length < 6}
              loading={checking}
              style={{ marginTop: 12 }}
              onPress={async () => {
                setChecking(true);
                try { await verifyEmailCode(email.trim().toLowerCase(), code); } catch { setCodeError(true); } finally { setChecking(false); }
              }}
            />
          </View>
        ) : (
          <>
            <TextInput
              value={email}
              onChangeText={(v) => { setEmail(v); if (state === 'error') setState('idle'); }}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { backgroundColor: c.surface, borderColor: state === 'error' ? c.error : c.divider, color: c.text }]}
            />
            {state === 'error' && <Txt v="caption" color={c.error} style={{ marginTop: 6 }}>{t('sync.error')}</Txt>}
            <Button title={t('sync.sendLink')} disabled={!valid} loading={state === 'sending'} onPress={send} style={{ marginTop: 14 }} />
          </>
        )}
        <Txt v="caption" color={c.textTertiary} style={{ marginTop: 18 }}>{t('sync.howTo')}</Txt>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: { height: 52, justifyContent: 'center', paddingHorizontal: 16 },
  input: { marginTop: 24, height: 54, borderRadius: radius.m, borderWidth: 1, paddingHorizontal: 16, fontFamily: fonts.regular, fontSize: 16 },
  sent: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16, borderRadius: radius.l, marginTop: 24 },
});
