// Thingual mark v2 — premium: glass lens + aperture inside a speech bubble, framed by a viewfinder.
const C = 512;
function blades(r, n = 7, rot = 0) {
  // aperture blades: curved triangles meeting around an inner opening
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = rot + (i / n) * Math.PI * 2, a1 = a0 + (Math.PI * 2) / n;
    const p = (a, rr) => `${(C + Math.cos(a) * rr).toFixed(1)},${(C + Math.sin(a) * rr).toFixed(1)}`;
    d += `M${p(a0, r)} A${r},${r} 0 0 1 ${p(a1, r)} L${p(a1 + 0.9, r * 0.36)} Z `;
  }
  return d;
}
function ticks(r, n, len) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const l = i % 5 === 0 ? len * 1.8 : len;
    d += `M${(C + Math.cos(a) * r).toFixed(1)},${(C + Math.sin(a) * r).toFixed(1)} L${(C + Math.cos(a) * (r - l)).toFixed(1)},${(C + Math.sin(a) * (r - l)).toFixed(1)} `;
  }
  return d;
}
const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#0B5A45"/><stop offset=".45" stop-color="#0A3B44"/><stop offset="1" stop-color="#0A1F4D"/>
  </linearGradient>
  <radialGradient id="meshA" cx=".18" cy=".12" r=".7"><stop offset="0" stop-color="#36D39A" stop-opacity=".55"/><stop offset="1" stop-color="#36D39A" stop-opacity="0"/></radialGradient>
  <radialGradient id="meshB" cx=".95" cy=".95" r=".75"><stop offset="0" stop-color="#3A5BFF" stop-opacity=".55"/><stop offset="1" stop-color="#3A5BFF" stop-opacity="0"/></radialGradient>
  <radialGradient id="meshC" cx=".5" cy=".52" r=".42"><stop offset="0" stop-color="#FF8A5B" stop-opacity=".30"/><stop offset="1" stop-color="#FF8A5B" stop-opacity="0"/></radialGradient>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".5" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>
  <linearGradient id="corner" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CFE9FF" stop-opacity=".85"/></linearGradient>
  <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFE3C2"/><stop offset=".35" stop-color="#FF9D66"/><stop offset=".7" stop-color="#FF5A2E"/><stop offset="1" stop-color="#B8321A"/>
  </linearGradient>
  <linearGradient id="ringHi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <radialGradient id="glass" cx=".38" cy=".3" r=".85">
    <stop offset="0" stop-color="#2A6E8F"/><stop offset=".45" stop-color="#0E2F4A"/><stop offset="1" stop-color="#050E1E"/>
  </radialGradient>
  <linearGradient id="blade" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5FA9CF" stop-opacity=".7"/><stop offset=".6" stop-color="#14385A" stop-opacity=".85"/><stop offset="1" stop-color="#06142A" stop-opacity=".95"/></linearGradient>
  <radialGradient id="pupil" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFD2A8"/><stop offset=".45" stop-color="#FF7A45"/><stop offset="1" stop-color="#C2391B"/></radialGradient>
  <radialGradient id="refl" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#7CF0C6" stop-opacity=".55"/><stop offset="1" stop-color="#7CF0C6" stop-opacity="0"/></radialGradient>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="22"/><feOffset dy="22"/><feComponentTransfer><feFuncA type="linear" slope=".55"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .05 0"/></filter>
  <clipPath id="lensClip"><circle cx="${C}" cy="${C}" r="150"/></clipPath>
</defs>`;

function mark({ background = true, rx = 0 } = {}) {
  const bg = background ? `
  <rect width="1024" height="1024" rx="${rx}" fill="url(#bg)"/>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#meshA)"/>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#meshB)"/>
  <rect width="1024" height="1024" rx="${rx}" fill="url(#meshC)"/>
  <!-- faint focus grid -->
  <g stroke="#fff" stroke-opacity=".05" stroke-width="2">
    <path d="M341 120 V904 M683 120 V904 M120 341 H904 M120 683 H904"/>
  </g>
  <!-- outer lens ring + tick scale -->
  <circle cx="${C}" cy="${C}" r="300" fill="none" stroke="#fff" stroke-opacity=".07" stroke-width="2"/>
  <path d="${ticks(300, 60, 12)}" stroke="#fff" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>
  <rect width="1024" height="1024" rx="${rx}" filter="url(#grain)" opacity=".9"/>` : '';
  const corner = (x, y, dx, dy) => `M${x} ${y + dy * 128} L${x} ${y + dy * 30} Q${x} ${y} ${x + dx * 30} ${y} L${x + dx * 128} ${y}`;
  return `${bg}
  <!-- viewfinder -->
  <g fill="none" stroke="url(#corner)" stroke-width="34" stroke-linecap="round">
    <path d="${corner(214, 214, 1, 1)}"/><path d="${corner(810, 214, -1, 1)}"/>
    <path d="${corner(214, 810, 1, -1)}"/><path d="${corner(810, 810, -1, -1)}"/>
  </g>
  <g fill="#fff" fill-opacity=".9"><circle cx="214" cy="512" r="7"/><circle cx="810" cy="512" r="7"/><circle cx="512" cy="214" r="7"/><circle cx="512" cy="810" r="7"/></g>
  <!-- speech-bubble lens -->
  <g filter="url(#shadow)">
    <path d="M${C - 128} ${C + 118} C ${C - 150} ${C + 170}, ${C - 170} ${C + 210}, ${C - 214} ${C + 232} C ${C - 150} ${C + 236}, ${C - 98} ${C + 214}, ${C - 62} ${C + 182} Z" fill="url(#ring)"/>
    <circle cx="${C}" cy="${C}" r="196" fill="url(#ring)"/>
  </g>
  <circle cx="${C}" cy="${C}" r="194" fill="none" stroke="url(#ringHi)" stroke-width="6"/>
  <circle cx="${C}" cy="${C}" r="164" fill="#0A1626"/>
  <circle cx="${C}" cy="${C}" r="150" fill="url(#glass)"/>
  <g clip-path="url(#lensClip)">
    <path d="${blades(150, 7, -0.3)}" fill="url(#blade)" stroke="#BFE9FF" stroke-opacity=".45" stroke-width="2.5"/>
    <circle cx="${C}" cy="${C}" r="150" fill="url(#refl)" opacity=".35"/>
  </g>
  <circle cx="${C}" cy="${C}" r="150" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="6"/>
  <!-- pupil -->
  <circle cx="${C}" cy="${C}" r="60" fill="url(#pupil)"/>
  <circle cx="${C}" cy="${C}" r="60" fill="none" stroke="#FFE3C2" stroke-opacity=".6" stroke-width="3"/>
  <circle cx="${C}" cy="${C}" r="24" fill="#2A0C06" opacity=".55"/>
  <!-- specular highlights -->
  <path d="M${C - 118} ${C - 30} A122 122 0 0 1 ${C - 20} ${C - 120}" stroke="#fff" stroke-opacity=".55" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M${C - 132} ${C + 24} A134 134 0 0 1 ${C - 126} ${C - 46}" stroke="#7CF0FF" stroke-opacity=".35" stroke-width="5" stroke-linecap="round" fill="none"/>
  <path d="M${C + 44} ${C - 126} A134 134 0 0 1 ${C + 112} ${C - 74}" stroke="#FF7AD9" stroke-opacity=".3" stroke-width="5" stroke-linecap="round" fill="none"/>
  <circle cx="${C + 22}" cy="${C - 22}" r="11" fill="#fff" opacity=".95"/>
  <path d="M${C + 96} ${C + 58} A112 112 0 0 1 ${C + 40} ${C + 104}" stroke="#fff" stroke-opacity=".35" stroke-width="8" stroke-linecap="round" fill="none"/>
  <circle cx="${C}" cy="${C}" r="40" fill="#FF8A5B" filter="url(#glow)" opacity=".35"/>
  ${background ? `<rect x="2" y="2" width="1020" height="1020" rx="${Math.max(0, rx - 2)}" fill="none" stroke="url(#edge)" stroke-width="4"/>` : ''}`;
}
const svg = (body, view = '0 0 1024 1024') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${view}" width="1024" height="1024">${defs}${body}</svg>`;
module.exports = {
  icon: svg(mark({ rx: 0 })),
  rounded: svg(mark({ rx: 230 })),
  androidBg: svg(`<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#meshA)"/><rect width="1024" height="1024" fill="url(#meshB)"/>`),
  androidFg: svg(mark({ background: false }), '-260 -260 1544 1544'),
  mono: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-260 -260 1544 1544" width="1024" height="1024"><g fill="none" stroke="#fff" stroke-width="34" stroke-linecap="round"><path d="M214 342 L214 244 Q214 214 244 214 L342 214"/><path d="M810 342 L810 244 Q810 214 780 214 L682 214"/><path d="M214 682 L214 780 Q214 810 244 810 L342 810"/><path d="M810 682 L810 780 Q810 810 780 810 L682 810"/></g><circle cx="512" cy="512" r="196" fill="#fff"/><path d="M384 630 C362 682 342 722 298 744 C362 748 414 726 450 694 Z" fill="#fff"/><circle cx="512" cy="512" r="70" fill="#000"/></svg>`,
  splash: svg(mark({ background: false }), '100 100 824 824'),
};
