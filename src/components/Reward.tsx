import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { Txt } from './ui';
import { EmojiArt } from './NoteBits';
import { Burst, Confetti, CountUp } from './Fx';
import { ChunkyButton } from './PathBits';
import { fonts } from '../theme/tokens';
import { useT } from '../i18n';
import { haptic } from '../lib/feedback';
import { sfx } from '../lib/sfx';

/**
 * A chest that shakes, pops open and showers you with gems.
 * `amount` > 0 shows it; `onClose` hides it.
 */
export function ChestReward({ amount, label, onClose, emoji = '💎' }: { amount: number; label?: string; onClose: () => void; emoji?: string }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const shake = useSharedValue(0);
  useEffect(() => {
    if (!amount) return;
    setOpen(false);
    shake.value = withRepeat(withSequence(withTiming(-14, { duration: 70 }), withTiming(14, { duration: 70 })), 5, true);
    const id = setTimeout(() => { setOpen(true); haptic.success(); sfx('chest'); }, 800);
    return () => clearTimeout(id);
  }, [amount]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${shake.value}deg` }] }));
  return (
    <Modal visible={amount > 0} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.back} onPress={open ? onClose : undefined}>
        {open && <Confetti count={60} />}
        <View style={{ alignItems: 'center' }}>
          {!open ? (
            <Animated.View entering={ZoomIn.springify().damping(10)} style={st}><EmojiArt emoji="🎁" size={150} /></Animated.View>
          ) : (
            <Animated.View entering={ZoomIn.springify().damping(8)} style={{ alignItems: 'center' }}>
              <View style={{ width: 150, height: 150, alignItems: 'center', justifyContent: 'center' }}>
                <EmojiArt emoji={emoji} size={120} />
                <Burst emoji={[emoji, '✨', '⭐']} count={16} size={30} radius={170} />
              </View>
              <CountUp to={amount} prefix="+" style={{ fontFamily: fonts.serif, fontSize: 64, lineHeight: 70, color: '#fff', marginTop: 10 }} />
              <Txt v="headline" color="rgba(255,255,255,.85)">{label ?? t('reward.crystals')}</Txt>
            </Animated.View>
          )}
        </View>
        {open && (
          <Animated.View entering={FadeIn.delay(500)} style={{ position: 'absolute', left: 24, right: 24, bottom: 48, maxWidth: 420, alignSelf: 'center', width: '100%' }}>
            <ChunkyButton title={t('reward.collect')} color="#F59E0B" onPress={onClose} />
          </Animated.View>
        )}
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  back: { flex: 1, backgroundColor: '#140C2E', alignItems: 'center', justifyContent: 'center' },
});
