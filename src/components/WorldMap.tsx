import React, { useMemo } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildMapHtml, MapPoint } from './mapHtml';
import { useTheme } from '../theme/tokens';

export type WorldMapProps = {
  points: MapPoint[];
  wordsMode?: boolean;
  onSelect?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  center?: [number, number];
  zoom?: number;
};

export function WorldMap({ points, wordsMode = false, onSelect, style, center, zoom }: WorldMapProps) {
  const { isDark } = useTheme();
  const html = useMemo(() => buildMapHtml(points, { dark: isDark, wordsMode, center, zoom }), [points, isDark, wordsMode, center, zoom]);
  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        onMessage={(e) => {
          try {
            const m = JSON.parse(e.nativeEvent.data);
            if (m.type === 'select') onSelect?.(m.id);
          } catch {}
        }}
      />
    </View>
  );
}
