import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
export { similarity } from './similarity';

/** On-device speech recognition on iOS / Android (expo-speech-recognition). */
export const speechRecognitionAvailable = () => {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
};

export function listenOnce(locale: string, onResult: (text: string) => void, onEnd: () => void) {
  let done = false;
  const subs: { remove: () => void }[] = [];
  const finish = () => {
    if (done) return;
    done = true;
    subs.forEach((s) => s.remove());
    onEnd();
  };
  (async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync().catch(() => null);
    if (!perm?.granted) return finish();
    subs.push(
      ExpoSpeechRecognitionModule.addListener('result', (e) => {
        if (e.isFinal && e.results[0]) onResult(e.results[0].transcript);
      }),
      ExpoSpeechRecognitionModule.addListener('end', finish),
      ExpoSpeechRecognitionModule.addListener('error', finish),
    );
    ExpoSpeechRecognitionModule.start({ lang: locale, interimResults: false, maxAlternatives: 3, continuous: false });
  })();
  return () => {
    try { ExpoSpeechRecognitionModule.abort(); } catch {}
    finish();
  };
}
