import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, type AudioPlayer } from 'expo-audio';
import { useApp } from '../store/useApp';
import { bookById } from '../data/audiobooks';
import { dateKey } from '../data/social';
import { bookCover, type Chapter } from './audiobooks';
import { chapterOpen, isMax, requireMax } from './premium';

/**
 * One audiobook player for the whole app, so listening continues while the learner moves between screens.
 * Screens talk to it through `usePlayer` (what to play) and read its status from the same store.
 */
type PlayerState = {
  bookId?: string;
  chapters: Chapter[];
  chapter: number;
  rate: number;
  /** live status from the audio element */
  time: number;
  duration: number;
  playing: boolean;
  buffering: boolean;
  error: boolean;
};

export const usePlayer = create<PlayerState>(() => ({ chapters: [], chapter: 0, rate: 1, time: 0, duration: 0, playing: false, buffering: false, error: false }));

let player: AudioPlayer | null = null;
let pendingSeek: number | null = null;

/** Start (or resume) a book at a chapter; position defaults to where the learner stopped. */
export function playBook(bookId: string, chapters: Chapter[], chapter?: number) {
  const saved = useApp.getState().books[bookId];
  const ch = chapter ?? saved?.chapter ?? 0;
  if (!chapterOpen(bookId, ch, isMax())) {
    requireMax('books');
    return;
  }
  const st = usePlayer.getState();
  const same = st.bookId === bookId && st.chapter === ch && player;
  if (same) {
    player!.play();
    return;
  }
  pendingSeek = saved && saved.chapter === ch ? saved.position : 0;
  usePlayer.setState({ bookId, chapters, chapter: ch, time: pendingSeek ?? 0, duration: chapters[ch]?.seconds ?? 0, error: false, buffering: true });
  // start inside the tap itself: mobile browsers only allow audio that a gesture started
  load(bookId, ch);
}

function load(bookId: string, ch: number) {
  const st = usePlayer.getState();
  const c = st.chapters[ch];
  if (!player || !c) return;
  player.replace({ uri: c.url });
  player.setPlaybackRate(st.rate);
  player.play();
  if (Platform.OS !== 'web') {
    const b = bookById(bookId);
    try {
      player.setActiveForLockScreen(true, { title: c.title, artist: b?.author, albumTitle: b?.title, artworkUrl: bookCover(bookId) }, { showSeekBackward: true, showSeekForward: true });
    } catch {}
  }
}

export const togglePlay = () => {
  if (!player) return;
  usePlayer.getState().playing ? player.pause() : player.play();
};
export const seekBy = (sec: number) => {
  if (!player) return;
  const { time, duration } = usePlayer.getState();
  player.seekTo(Math.max(0, Math.min((duration || time + sec) - 1, time + sec)));
};
export const seekTo = (sec: number) => player?.seekTo(Math.max(0, sec));
export const setRate = (rate: number) => {
  usePlayer.setState({ rate });
  player?.setPlaybackRate(rate);
};
export const stopBook = () => {
  saveProgress();
  player?.pause();
  usePlayer.setState({ bookId: undefined, chapters: [], chapter: 0, time: 0, duration: 0, playing: false });
  if (Platform.OS !== 'web') player?.clearLockScreenControls();
};

function saveProgress(done?: boolean) {
  const { bookId, chapter, time } = usePlayer.getState();
  if (!bookId) return;
  const prev = useApp.getState().books[bookId];
  useApp.getState().saveBookProgress(bookId, {
    chapter,
    position: done ? 0 : Math.floor(time),
    done: done ? [...new Set([...(prev?.done ?? []), chapter])] : prev?.done ?? [],
  });
}

/** Mounted once in the root layout. */
export function BookAudio() {
  const p = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(p);
  const bookId = usePlayer((s) => s.bookId);
  const listened = useRef(0);
  const lastSave = useRef(0);
  player = p;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }).catch(() => {});
  }, []);

  // mirror status into the store, resume position, count minutes, save progress
  useEffect(() => {
    if (!bookId) return;
    if (status.isLoaded && pendingSeek && status.duration > 0) {
      const to = pendingSeek;
      pendingSeek = null;
      if (to < status.duration - 5) p.seekTo(to);
    }
    usePlayer.setState({
      time: status.currentTime,
      duration: status.duration || usePlayer.getState().duration,
      playing: status.playing,
      buffering: status.isBuffering && status.playing !== false,
    });
    if (status.playing) {
      listened.current += 0.5;
      if (listened.current >= 60) {
        listened.current = 0;
        const st = useApp.getState();
        st.logSession(0, 0, 1);
        const today = st.history.find((h) => h.day === dateKey());
        if (today && today.minutes >= 3) st.markActive();
      }
      if (Date.now() - lastSave.current > 10000) {
        lastSave.current = Date.now();
        saveProgress();
      }
    } else if (lastSave.current && status.isLoaded) {
      saveProgress();
      lastSave.current = 0;
    }
    if (status.didJustFinish) {
      saveProgress(true);
      const st = usePlayer.getState();
      const next = st.chapter + 1;
      if (next < st.chapters.length) {
        if (chapterOpen(bookId, next, isMax())) {
          pendingSeek = 0;
          usePlayer.setState({ chapter: next, time: 0, duration: st.chapters[next].seconds });
          useApp.getState().saveBookProgress(bookId, { chapter: next, position: 0 });
          load(bookId, next);
        } else {
          usePlayer.setState({ playing: false });
          requireMax('books');
        }
      }
    }
  }, [status.currentTime, status.playing, status.isLoaded, status.didJustFinish, status.isBuffering, status.duration]);

  return null;
}
