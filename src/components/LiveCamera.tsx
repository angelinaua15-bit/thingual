import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Linking } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { Detection } from '../lib/cocoMap';

export type CameraStatus = 'loading' | 'ready' | 'denied' | 'nocamera' | 'nomodel';

export type LiveCameraHandle = {
  capture: () => Promise<{ uri: string; base64?: string; detections: Detection[] } | null>;
  request: () => Promise<void> | void;
};

export type LiveCameraProps = {
  live: boolean;
  onTapDetection: (d: Detection, photo: string) => void;
  onStatus?: (s: CameraStatus) => void;
  labelFor?: (concept: string) => string;
  facing?: 'back' | 'front';
};

/**
 * Native camera. Live dots need a development build with a frame-processor model; in Expo Go the user
 * captures a photo and the recognition server (or the word picker) names the object.
 */
export const LiveCamera = forwardRef<LiveCameraHandle, LiveCameraProps>(function LiveCamera({ onStatus, facing = 'back' }, ref) {
  const cam = useRef<CameraView>(null);
  const [perm, request] = useCameraPermissions();

  useEffect(() => {
    if (!perm) onStatus?.('loading');
    else if (perm.granted) onStatus?.('nomodel');
    else onStatus?.('denied');
  }, [perm?.granted, perm]);

  useImperativeHandle(ref, () => ({
    capture: async () => {
      const pic = await cam.current?.takePictureAsync({ quality: 0.5, base64: true });
      return pic ? { uri: pic.uri, base64: pic.base64 ?? undefined, detections: [] } : null;
    },
    request: async () => {
      // after "Don't allow" the system won't ask again — open the app's settings instead
      if (perm && !perm.granted && !perm.canAskAgain) Linking.openSettings();
      else await request();
    },
  }));

  if (!perm?.granted) return null;
  return <CameraView ref={cam} style={StyleSheet.absoluteFill} facing={facing} />;
});
