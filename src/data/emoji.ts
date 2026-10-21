import { Platform } from 'react-native';

/** 3D Fluent Emoji (Microsoft, MIT) copied to /public/emoji by scripts/copy-emoji.js. */
const HOST = Platform.OS === 'web' ? '' : 'https://thingual.vercel.app';
export const emojiCode = (e: string) => [...e].map((ch) => ch.codePointAt(0)!.toString(16)).filter((c) => c !== 'fe0f').join('-');
export const emojiUrl = (e?: string) => (e ? `${HOST}/emoji/${emojiCode(e)}.webp` : undefined);
export const isEmojiUrl = (u?: string) => !!u && u.includes('/emoji/') && u.endsWith('.webp');
