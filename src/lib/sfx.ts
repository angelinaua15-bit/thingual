import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useApp } from '../store/useApp';

/** Short game sounds (generated, see assets/sfx). Muted when "Sounds" is off in settings. */
const FILES = {
  correct: require('../../assets/sfx/correct.wav'),
  wrong: require('../../assets/sfx/wrong.wav'),
  tap: require('../../assets/sfx/tap.wav'),
  combo: require('../../assets/sfx/combo.wav'),
  chest: require('../../assets/sfx/chest.wav'),
  fanfare: require('../../assets/sfx/fanfare.wav'),
  heart: require('../../assets/sfx/heart.wav'),
  pop: require('../../assets/sfx/pop.wav'),
} as const;
export type Sfx = keyof typeof FILES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};

export function sfx(name: Sfx, volume = 1) {
  if (!useApp.getState().settings.sounds) return;
  try {
    let p = players[name];
    if (!p) {
      p = createAudioPlayer(FILES[name]);
      players[name] = p;
    }
    p.volume = volume;
    p.seekTo(0);
    p.play();
  } catch {
    // sounds are a nicety — never break the lesson over them
  }
}
