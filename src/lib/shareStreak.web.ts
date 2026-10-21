import { FLAMES } from './streak';
import { FLAME_INNER, FLAME_OUTER } from '../components/Flame';
import type { ShareInput } from './shareStreak';
export type { ShareInput };

/** Draws the share card on a canvas (1080×1350) — same look as the in-app card. */
async function renderPng({ count, flame, caption, wordsLabel }: ShareInput): Promise<Blob | null> {
  const W = 1080, H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  if (!g) return null;
  try { await (document as any).fonts?.ready; } catch {}
  const [c1, c2] = FLAMES[flame].card;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  // soft glow
  const glow = g.createRadialGradient(W / 2, 470, 40, W / 2, 470, 520);
  glow.addColorStop(0, 'rgba(255,255,255,.35)'); glow.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
  // flame
  g.save();
  g.translate(W / 2 - 160, 170); g.scale(5, 5);
  g.fillStyle = '#FFFFFF'; g.fill(new Path2D(FLAME_OUTER));
  g.fillStyle = FLAMES[flame].colors[1]; g.fill(new Path2D(FLAME_INNER));
  g.restore();
  g.fillStyle = '#FFFFFF'; g.textAlign = 'center';
  g.font = `400 ${count > 999 ? 220 : 280}px "Instrument Serif", Georgia, serif`;
  g.fillText(String(count), W / 2, 950);
  g.font = '600 56px Inter, system-ui, sans-serif';
  g.fillText(caption, W / 2, 1040);
  g.globalAlpha = 0.8; g.font = '500 38px Inter, system-ui, sans-serif';
  g.fillText(wordsLabel, W / 2, 1110);
  g.globalAlpha = 1; g.font = '400 64px "Instrument Serif", Georgia, serif';
  g.fillText('Thingual', W / 2, 1260);
  return new Promise((res) => cv.toBlob((b) => res(b), 'image/png'));
}

export async function shareStreak(input: ShareInput): Promise<'shared' | 'copied' | 'failed'> {
  const text = `${input.text}\nhttps://thingual.vercel.app`;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  try {
    const blob = await renderPng(input);
    if (blob) {
      const file = new File([blob], `thingual-streak-${input.count}.png`, { type: 'image/png' });
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text });
        return 'shared';
      }
      // desktop: download the picture and copy the text
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } else if (nav.share) {
      await nav.share({ text });
      return 'shared';
    }
    await navigator.clipboard?.writeText(text);
    return 'copied';
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return 'shared';
    return 'failed';
  }
}
