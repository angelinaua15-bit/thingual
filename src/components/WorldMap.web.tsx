import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { buildMapHtml } from './mapHtml';
import { useTheme } from '../theme/tokens';
import type { WorldMapProps } from './WorldMap';

export function WorldMap({ points, wordsMode = false, onSelect, style, center, zoom }: WorldMapProps) {
  const { isDark } = useTheme();
  const ref = useRef<HTMLIFrameElement | null>(null);
  const html = useMemo(() => buildMapHtml(points, { dark: isDark, wordsMode, center, zoom }), [points, isDark, wordsMode, center, zoom]);
  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      try {
        const m = JSON.parse(String(e.data));
        if (m.type === 'select') onSelect?.(m.id);
      } catch {}
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [onSelect]);
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      {React.createElement('iframe', {
        ref,
        srcDoc: html,
        title: 'map',
        style: { border: 0, width: '100%', height: '100%', display: 'block' },
      })}
    </View>
  );
}
