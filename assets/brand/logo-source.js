// Thingual mark: a camera viewfinder framing a speech-bubble lens. Brand gradient: deep green → deep navy.
const G1 = '#0F5240', G2 = '#0B2350';
function glyph({ color = '#fff', bubble = 'url(#coral)', dot = '#fff', scale = 1 } = {}) {
  const s = scale, c = 512;
  const T = (x, y) => `${c + (x - c) * s},${c + (y - c) * s}`;
  const w = 58 * s, a = 150 * s;
  const L = 238, R = 786, Tp = 238, B = 786;
  const corner = (x, y, dx, dy) => `M${T(x, y + dy * 150)} L${T(x, y)} L${T(x + dx * 150, y)}`;
  return `
  <g fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">
    <path d="${corner(L, Tp, 1, 1)}"/><path d="${corner(R, Tp, -1, 1)}"/>
    <path d="${corner(L, B, 1, -1)}"/><path d="${corner(R, B, -1, -1)}"/>
  </g>
  <path d="M${T(424, 618)} L${T(392, 704)} L${T(484, 660)} Z" fill="${bubble}"/>
  <circle cx="${c}" cy="${c - 8 * s}" r="${150 * s}" fill="${bubble}"/>
  <circle cx="${c + 34 * s}" cy="${c - 42 * s}" r="${46 * s}" fill="${dot}"/>`;
}
const defs = `<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${G1}"/><stop offset="1" stop-color="${G2}"/></linearGradient>
  <radialGradient id="glow" cx="0.3" cy="0.25" r="0.8"><stop offset="0" stop-color="#3FBF8F" stop-opacity=".28"/><stop offset="1" stop-color="#3FBF8F" stop-opacity="0"/></radialGradient>
  <linearGradient id="coral" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB079"/><stop offset="1" stop-color="#FF6B35"/></linearGradient>
</defs>`;
const bg = (rx = 0) => `<rect width="1024" height="1024" rx="${rx}" fill="url(#bg)"/><rect width="1024" height="1024" rx="${rx}" fill="url(#glow)"/>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${defs}${body}</svg>`;
module.exports = {
  icon: svg(bg(0) + glyph()),
  rounded: svg(bg(230) + glyph()),
  androidBg: svg(bg(0)),
  androidFg: svg(glyph({ scale: 0.62 })),
  mono: svg(glyph({ color: '#fff', bubble: '#fff', dot: '#000', scale: 0.62 })),
  splash: svg(glyph({ scale: 1 })),
  glyph, G1, G2,
};
