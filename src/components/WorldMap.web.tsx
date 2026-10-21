import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';
import { buildMapHtml, safePoints } from './mapHtml';
import { useTheme } from '../theme/tokens';
import type { WorldMapProps } from './WorldMap';

export function WorldMap({ points, wordsMode = false, onSelect, onBlank, style, center, zoom }: WorldMapProps) {
  const { isDark } = useTheme();
  const ref = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const latest = useRef({ points, center, zoom });
  latest.current = { points, center, zoom };
  // The page is built once per theme/mode; points and centre are pushed in afterwards, so a data
  // refresh doesn't reset where the user has panned and zoomed.
  const html = useMemo(() => {
    ready.current = false;
    return buildMapHtml(latest.current.points, { dark: isDark, wordsMode, center: latest.current.center, zoom: latest.current.zoom });
  }, [isDark, wordsMode]);

  const post = (m: unknown) => ref.current?.contentWindow?.postMessage(JSON.stringify(m), '*');

  useEffect(() => {
    if (ready.current) post({ type: 'points', pts: safePoints(points) });
  }, [points]);
  useEffect(() => {
    if (ready.current && center) post({ type: 'view', center, zoom });
  }, [center?.[0], center?.[1], zoom]);

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      try {
        const m = JSON.parse(String(e.data));
        if (m.type === 'ready') {
          ready.current = true;
          post({ type: 'points', pts: safePoints(latest.current.points) });
        }
        if (m.type === 'select') onSelect?.(m.id);
        if (m.type === 'blank') onBlank?.();
      } catch {}
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [onSelect, onBlank]);
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
