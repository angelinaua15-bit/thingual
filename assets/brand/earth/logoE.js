const fs = require('fs');
const earth = 'data:image/png;base64,' + fs.readFileSync(__dirname + '/earth-sphere.png').toString('base64');
// deterministic stars
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let stars = '';
for (let i = 0; i < 120; i++) { const x = rnd() * 1024, y = rnd() * 1024, r = rnd() < 0.85 ? 0.8 + rnd() * 1.4 : 2 + rnd() * 1.6, o = 0.25 + rnd() * 0.7;
  if (Math.hypot(x - 512, y - 512) < 300) continue; stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}"/>`; }
const ring = 'あ  字  가  ह  ع';
const ringB = 'a  ж  ñ  ї  ö  ß  λ  ç  ğ  ש';
const build = (rx = 230, bare = false) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" width="1024" height="1024">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#062A21"/><stop offset=".5" stop-color="#04131C"/><stop offset="1" stop-color="#050A24"/></linearGradient>
  <radialGradient id="nebG" cx=".12" cy=".1" r=".65"><stop offset="0" stop-color="#1FAE7F" stop-opacity=".26"/><stop offset="1" stop-color="#1FAE7F" stop-opacity="0"/></radialGradient>
  <radialGradient id="nebB" cx=".95" cy=".95" r=".7"><stop offset="0" stop-color="#2E46D8" stop-opacity=".3"/><stop offset="1" stop-color="#2E46D8" stop-opacity="0"/></radialGradient>
  <radialGradient id="atm" cx=".5" cy=".5" r=".5"><stop offset=".78" stop-color="#5FB6FF" stop-opacity="0"/><stop offset=".86" stop-color="#5FB6FF" stop-opacity=".55"/><stop offset="1" stop-color="#5FB6FF" stop-opacity="0"/></radialGradient>
  <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FF7A45"/><stop offset=".45" stop-color="#FFD39E"/><stop offset="1" stop-color="#FF7A45"/></linearGradient>
  <path id="orbTop" d="M140 552 A372 118 -16 0 1 884 474"/><path id="orbBot" d="M140 552 A372 118 -16 0 0 884 474"/>
  <clipPath id="front"><rect x="-200" y="512" width="1424" height="700" transform="rotate(-16 512 512)"/></clipPath>
  <clipPath id="back"><rect x="-200" y="-200" width="1424" height="712" transform="rotate(-16 512 512)"/></clipPath>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="blur40"><feGaussianBlur stdDeviation="40"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .045 0"/></filter>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".5" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient>
</defs>
${bare ? '' : `<rect width="1024" height="1024" rx="${rx}" fill="url(#bg)"/><rect width="1024" height="1024" rx="${rx}" fill="url(#nebG)"/><rect width="1024" height="1024" rx="${rx}" fill="url(#nebB)"/>${stars}`}
<circle cx="512" cy="512" r="250" fill="#3E8BFF" opacity=".28" filter="url(#blur40)"/>
<g clip-path="url(#back)" opacity=".7">
  <ellipse cx="512" cy="512" rx="372" ry="118" transform="rotate(-16 512 512)" fill="none" stroke="url(#rg)" stroke-width="3"/>
  <text font-family="Georgia, 'Noto Serif', serif" font-size="40" fill="#FFE3C4" letter-spacing="8" dy="-14"><textPath href="#orbTop" startOffset="84%" text-anchor="middle">${ring}</textPath></text>
</g>
<image href="${earth}" x="292" y="292" width="440" height="440"/>
<circle cx="512" cy="512" r="236" fill="url(#atm)"/>
<g clip-path="url(#front)" filter="url(#glow)">
  <ellipse cx="512" cy="512" rx="372" ry="118" transform="rotate(-16 512 512)" fill="none" stroke="url(#rg)" stroke-width="6"/>
  <text font-family="Georgia, 'Noto Serif', serif" font-size="46" fill="#FFF1E2" letter-spacing="10" dy="-16"><textPath href="#orbBot" startOffset="54%" text-anchor="middle">${ringB}</textPath></text>
</g>
<circle cx="806" cy="372" r="16" fill="#FF8A55" filter="url(#glow)"/><circle cx="806" cy="372" r="7" fill="#FFF1E2"/>
${bare ? '' : `<path d="M848 168 L853 198 L883 203 L853 208 L848 238 L843 208 L813 203 L843 198 Z" fill="#fff" opacity=".9"/><rect width="1024" height="1024" rx="${rx}" filter="url(#grain)"/><rect x="2" y="2" width="1020" height="1020" rx="${Math.max(0, rx - 2)}" fill="none" stroke="url(#edge)" stroke-width="4"/>`}
</svg>`;
module.exports = { build };
