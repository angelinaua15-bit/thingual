import React from 'react';
import { Text, View } from 'react-native';
import { Txt } from './ui';
import { useTheme, fonts } from '../theme/tokens';
import { useT } from '../i18n';

const norm = (ch: string) => ch.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Which characters of the target were heard (longest common subsequence). */
export function matchChars(heard: string, target: string): boolean[] {
  const a = [...target].map(norm), b = [...heard].map(norm);
  const n = a.length, m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = new Array(n).fill(false);
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  // spaces and punctuation are never "mistakes"
  [...target].forEach((ch, k) => { if (!/\p{L}|\p{N}/u.test(ch)) out[k] = true; });
  return out;
}

/** Target text with the sounds you missed in red, plus what the phone heard. */
export function PronunciationDiff({ heard, target, score }: { heard: string; target: string; score: number }) {
  const { c } = useTheme();
  const { t } = useT();
  const ok = matchChars(heard, target);
  const color = score >= 85 ? c.success : score >= 70 ? '#E8A10C' : c.error;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 34, textAlign: 'center' }}>
        {[...target].map((ch, i) => <Text key={i} style={{ color: ok[i] ? c.success : c.error, textDecorationLine: ok[i] ? 'none' : 'underline' }}>{ch}</Text>)}
      </Text>
      <Txt v="bodyMedium" color={color}>{score}%</Txt>
      <Txt v="caption" color={c.textSecondary} center>{t('pron.heard', { text: heard || '…' })}</Txt>
    </View>
  );
}
