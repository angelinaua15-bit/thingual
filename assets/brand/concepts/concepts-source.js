const common = `
  <linearGradient id="bgA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B5A45"/><stop offset=".5" stop-color="#0A3442"/><stop offset="1" stop-color="#0A1B4A"/></linearGradient>
  <radialGradient id="mA" cx=".15" cy=".1" r=".7"><stop offset="0" stop-color="#3EE0A6" stop-opacity=".5"/><stop offset="1" stop-color="#3EE0A6" stop-opacity="0"/></radialGradient>
  <radialGradient id="mB" cx=".95" cy=".98" r=".75"><stop offset="0" stop-color="#4361FF" stop-opacity=".6"/><stop offset="1" stop-color="#4361FF" stop-opacity="0"/></radialGradient>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter>
  <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".5" stop-color="#fff" stop-opacity=".03"/><stop offset="1" stop-color="#fff" stop-opacity=".14"/></linearGradient>
  <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur in="SourceAlpha" stdDeviation="26"/><feOffset dy="28"/><feComponentTransfer><feFuncA type="linear" slope=".5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>`;
const bg = (rx) => `<rect width="1024" height="1024" rx="${rx}" fill="url(#bgA)"/><rect width="1024" height="1024" rx="${rx}" fill="url(#mA)"/><rect width="1024" height="1024" rx="${rx}" fill="url(#mB)"/>`;
const finish = (rx) => `<rect width="1024" height="1024" rx="${rx}" filter="url(#grain)"/><rect x="2" y="2" width="1020" height="1020" rx="${rx - 2}" fill="none" stroke="url(#edge)" stroke-width="4"/>`;
const wrap = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>${common}${defs}</defs>${body}</svg>`;
const bubble = (cx, cy, r, side) => {
  // circle with a tail at the bottom (left or right)
  const s = side === 'l' ? -1 : 1;
  const a1 = side === 'l' ? 128 : 52, a2 = side === 'l' ? 100 : 80;
  const p = (deg, rr = r) => [cx + Math.cos(deg * Math.PI / 180) * rr, cy + Math.sin(deg * Math.PI / 180) * rr];
  const [x1, y1] = p(a1), [x2, y2] = p(a2);
  const tip = [cx + s * r * 0.95, cy + r * 1.22];
  return side === 'l'
    ? `M${x2} ${y2} A${r} ${r} 0 1 1 ${x1} ${y1} Q${cx - r * 0.78} ${cy + r * 1.05} ${tip[0]} ${tip[1]} Q${cx - r * 0.35} ${cy + r * 1.12} ${x2} ${y2} Z`
    : `M${x1} ${y1} A${r} ${r} 0 1 0 ${x2} ${y2} Q${cx + r * 0.35} ${cy + r * 1.12} ${tip[0]} ${tip[1]} Q${cx + r * 0.78} ${cy + r * 1.05} ${x1} ${y1} Z`;
};

/* A — "Дві мови, одна річ": two glass speech bubbles overlap; the shared lens is coral. */
const A = (rx = 230) => {
  const r = 220, lx = 410, rx2 = 614, cy = 470;
  const tailL = `M${lx - 120} ${cy + 150} Q${lx - 170} ${cy + 250} ${lx - 236} ${cy + 282} Q${lx - 120} ${cy + 280} ${lx - 40} ${cy + 205} Z`;
  const tailR = `M${rx2 + 120} ${cy + 150} Q${rx2 + 170} ${cy + 250} ${rx2 + 236} ${cy + 282} Q${rx2 + 120} ${cy + 280} ${rx2 + 40} ${cy + 205} Z`;
  const Lshape = `<circle cx="${lx}" cy="${cy}" r="${r}"/><path d="${tailL}"/>`;
  return wrap(`
  <linearGradient id="gL" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8CF7D0"/><stop offset="1" stop-color="#14A27A"/></linearGradient>
  <linearGradient id="gR" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#AFC0FF"/><stop offset="1" stop-color="#3E51E2"/></linearGradient>
  <radialGradient id="gX" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#FFE6C4"/><stop offset=".5" stop-color="#FF8A4C"/><stop offset="1" stop-color="#D8411B"/></radialGradient>
  <linearGradient id="hi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="cL">${Lshape}</clipPath>`, `${bg(rx)}
  <ellipse cx="512" cy="820" rx="320" ry="40" fill="#020814" opacity=".5" filter="url(#blur30)"/>
  <g filter="url(#soft)" fill="url(#gL)" opacity=".96">${Lshape}</g>
  <g fill="url(#gR)" opacity=".93"><circle cx="${rx2}" cy="${cy}" r="${r}"/><path d="${tailR}"/></g>
  <g clip-path="url(#cL)"><circle cx="${rx2}" cy="${cy}" r="${r}" fill="url(#gX)"/></g>
  <circle cx="${lx}" cy="${cy}" r="${r - 4}" fill="none" stroke="url(#hi)" stroke-width="8"/>
  <circle cx="${rx2}" cy="${cy}" r="${r - 4}" fill="none" stroke="url(#hi)" stroke-width="8"/>
  <text x="${lx - 108}" y="${cy + 40}" font-family="Georgia, serif" font-size="150" fill="#fff" fill-opacity=".38" text-anchor="middle">A</text>
  <text x="${rx2 + 108}" y="${cy + 40}" font-family="Georgia, serif" font-size="150" fill="#fff" fill-opacity=".38" text-anchor="middle">Я</text>
  <circle cx="512" cy="${cy}" r="70" fill="#7A1E0E" opacity=".25"/>
  <circle cx="512" cy="${cy}" r="62" fill="none" stroke="#FFE6C4" stroke-opacity=".85" stroke-width="5"/>
  <circle cx="512" cy="${cy}" r="30" fill="#fff"/>
  <circle cx="500" cy="${cy - 12}" r="9" fill="#FFB27E"/>
  <path d="M512 ${cy - 128} L520 ${cy - 108} L540 ${cy - 100} L520 ${cy - 92} L512 ${cy - 72} L504 ${cy - 92} L484 ${cy - 100} L504 ${cy - 108} Z" fill="#fff" opacity=".9"/>
  <path d="M${lx - 160} ${cy - 90} Q${lx - 130} ${cy - 160} ${lx - 60} ${cy - 190}" stroke="#fff" stroke-opacity=".75" stroke-width="16" stroke-linecap="round" fill="none"/>
  <path d="M${rx2 + 90} ${cy - 175} Q${rx2 + 150} ${cy - 150} ${rx2 + 178} ${cy - 96}" stroke="#fff" stroke-opacity=".5" stroke-width="12" stroke-linecap="round" fill="none"/>
  ${finish(rx)}`);
};

/* B — "Планета слів": a glossy coral sphere (the thing) with a ring of letters from many scripts. */
const B = (rx = 230, bare = false) => {
  const ring = 'a  ж  あ  ع  字  ñ  ह  가  ç  ї  ö  ש  ';
  return wrap(`
  <radialGradient id="sph" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#FFE7C9"/><stop offset=".35" stop-color="#FF9A5C"/><stop offset=".75" stop-color="#E4471E"/><stop offset="1" stop-color="#7A1E10"/></radialGradient>
  <radialGradient id="rim" cx=".5" cy=".5" r=".5"><stop offset=".82" stop-color="#7CE8FF" stop-opacity="0"/><stop offset="1" stop-color="#7CE8FF" stop-opacity=".55"/></radialGradient>
  <linearGradient id="rg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7BF5C8"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#9DB4FF"/></linearGradient>
  <path id="orbit" d="M152 540 A360 120 -16 1 1 872 484 A360 120 -16 1 1 152 540"/>
  <clipPath id="front"><rect x="0" y="512" width="1024" height="512" transform="rotate(-16 512 512)"/></clipPath>
  <clipPath id="back"><rect x="0" y="0" width="1024" height="512" transform="rotate(-16 512 512)"/></clipPath>`, `${bare ? '' : bg(rx)}
  <circle cx="512" cy="512" r="300" fill="#2EF0B0" opacity=".12" filter="url(#blur30)"/>
  <g clip-path="url(#back)" opacity=".55">
    <ellipse cx="512" cy="512" rx="360" ry="120" transform="rotate(-16 512 512)" fill="none" stroke="url(#rg)" stroke-width="4"/>
    <text font-family="Georgia, 'Noto Serif', serif" font-size="46" fill="#fff" letter-spacing="10"><textPath href="#orbit">${ring.repeat(2)}</textPath></text>
  </g>
  <g filter="url(#soft)"><circle cx="512" cy="512" r="210" fill="url(#sph)"/></g>
  <clipPath id="sphc"><circle cx="512" cy="512" r="210"/></clipPath>
  <g clip-path="url(#sphc)" fill="none" stroke="#FFE7C9" stroke-opacity=".22" stroke-width="3">
    <ellipse cx="512" cy="512" rx="210" ry="70"/><ellipse cx="512" cy="512" rx="210" ry="150"/>
    <ellipse cx="512" cy="512" rx="80" ry="210"/><ellipse cx="512" cy="512" rx="160" ry="210"/>
  </g>
  <circle cx="512" cy="512" r="210" fill="url(#rim)"/>
  <circle cx="512" cy="512" r="232" fill="none" stroke="#7CE8FF" stroke-opacity=".18" stroke-width="10" filter="url(#blur30)"/>
  <ellipse cx="440" cy="420" rx="86" ry="52" transform="rotate(-30 440 420)" fill="#fff" opacity=".45"/>
  <circle cx="420" cy="400" r="16" fill="#fff" opacity=".9"/>
  <g clip-path="url(#front)">
    <ellipse cx="512" cy="512" rx="360" ry="120" transform="rotate(-16 512 512)" fill="none" stroke="url(#rg)" stroke-width="7"/>
    <text font-family="Georgia, 'Noto Serif', serif" font-size="46" fill="#fff" letter-spacing="10"><textPath href="#orbit">${ring.repeat(2)}</textPath></text>
  </g>
  <g fill="#fff"><circle cx="842" cy="260" r="5"/><circle cx="210" cy="230" r="3" opacity=".8"/><circle cx="780" cy="830" r="4" opacity=".7"/><circle cx="170" cy="760" r="3" opacity=".6"/><circle cx="300" cy="160" r="2.5" opacity=".7"/><circle cx="880" cy="640" r="2.5" opacity=".6"/></g>
  <path d="M842 200 L848 232 L880 238 L848 244 L842 276 L836 244 L804 238 L836 232 Z" fill="#fff" opacity=".9"/>
  ${bare ? '' : finish(rx)}`);
};

/* C — "Орігамі": a faceted, folded-paper speech bubble with a coral heart fold. */
const C = (rx = 230) => {
  const c = [512, 470], R = 270, n = 10, pts = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; pts.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R * 0.92]); }
  const inner = [];
  for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + ((i + 0.5) / n) * Math.PI * 2; inner.push([c[0] + Math.cos(a) * R * 0.52, c[1] + Math.sin(a) * R * 0.48]); }
  const P = (q) => q.map((v) => v.map((x) => x.toFixed(1)).join(',')).join(' ');
  const fills = ['url(#f1)', 'url(#f2)', 'url(#f3)', 'url(#f4)', 'url(#f3)', 'url(#f5)', 'url(#f6)', 'url(#f5)', 'url(#f2)', 'url(#f1)'];
  let tris = '';
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n], m = inner[i], m0 = inner[(i - 1 + n) % n];
    tris += `<polygon points="${P([a, b, m])}" fill="${fills[i]}"/>`;
    tris += `<polygon points="${P([a, m, m0])}" fill="${fills[(i + 3) % n]}" opacity=".92"/>`;
  }
  const core = `<polygon points="${P(inner)}" fill="url(#f5)"/>`;
  const coreHi = inner.map((m, i) => `<polygon points="${P([c, m, inner[(i + 1) % n]])}" fill="${i % 2 ? 'url(#f6)' : 'url(#f5)'}"/>`).join('');
  const tail = `<polygon points="${P([pts[6], [330, 860], inner[6]])}" fill="url(#f6)"/><polygon points="${P([pts[6], [330, 860], pts[7]])}" fill="url(#f5)" opacity=".85"/>`;
  return wrap(`
  <linearGradient id="f1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F0FFF8"/><stop offset="1" stop-color="#A4ECD3"/></linearGradient>
  <linearGradient id="f2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#B5F2DD"/><stop offset="1" stop-color="#3FBF95"/></linearGradient>
  <linearGradient id="f3" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D3DDFF"/><stop offset="1" stop-color="#8299FF"/></linearGradient>
  <linearGradient id="f4" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8FA6FF"/><stop offset="1" stop-color="#3F52DD"/></linearGradient>
  <linearGradient id="f5" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFC594"/><stop offset="1" stop-color="#F0582A"/></linearGradient>
  <linearGradient id="f6" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF8A55"/><stop offset="1" stop-color="#A83414"/></linearGradient>`, `${bg(rx)}
  <ellipse cx="512" cy="860" rx="300" ry="36" fill="#020814" opacity=".5" filter="url(#blur30)"/>
  <g filter="url(#soft)" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linejoin="round">${tail}${tris}${core}${coreHi}</g>
  <polygon points="${P(pts)}" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="${c[0]}" cy="${c[1]}" r="16" fill="#fff"/>
  ${finish(rx)}`);
};

/* D — "Монограма T": the crossbar is a speech bubble that is "typing", the stem ends in a glowing lens. */
const D = (rx = 230) => wrap(`
  <linearGradient id="tw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CDEFE4"/></linearGradient>
  <linearGradient id="stem" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#DDF5EE"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#B9E6D8"/></linearGradient>
  <radialGradient id="dl" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#FFE7CC"/><stop offset=".45" stop-color="#FF8448"/><stop offset="1" stop-color="#B8341A"/></radialGradient>
  <radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#FF8A55" stop-opacity=".7"/><stop offset="1" stop-color="#FF8A55" stop-opacity="0"/></radialGradient>
  <radialGradient id="glassD" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#2B6F8E"/><stop offset="1" stop-color="#06162B"/></radialGradient>`, `${bg(rx)}
  <circle cx="512" cy="736" r="210" fill="url(#halo)"/>
  <g filter="url(#soft)">
    <path d="M216 252 Q216 198 270 198 L754 198 Q808 198 808 252 L808 334 Q808 388 754 388 L564 388 L564 600 Q564 620 584 632 L440 632 Q460 620 460 600 L460 388 L340 388 L262 456 L282 388 L270 388 Q216 388 216 334 Z" fill="url(#tw)"/>
  </g>
  <rect x="460" y="388" width="104" height="236" fill="url(#stem)"/>
  <path d="M250 222 L774 222" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".9"/>
  <g><circle cx="430" cy="293" r="20" fill="#FF8A55"/><circle cx="512" cy="293" r="20" fill="#FF8A55" opacity=".75"/><circle cx="594" cy="293" r="20" fill="#FF8A55" opacity=".5"/></g>
  <circle cx="512" cy="736" r="118" fill="#0A1626"/>
  <circle cx="512" cy="736" r="108" fill="url(#glassD)"/>
  <circle cx="512" cy="736" r="62" fill="url(#dl)"/>
  <circle cx="512" cy="736" r="62" fill="none" stroke="#FFE3C4" stroke-opacity=".7" stroke-width="4"/>
  <circle cx="512" cy="736" r="118" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="6"/>
  <circle cx="512" cy="736" r="146" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3" stroke-dasharray="3 15"/>
  <path d="M440 690 A86 86 0 0 1 500 652" stroke="#fff" stroke-opacity=".6" stroke-width="12" stroke-linecap="round" fill="none"/>
  <circle cx="530" cy="716" r="9" fill="#fff"/>
  ${finish(rx)}`);

const monoB = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-200 -200 1424 1424" width="1024" height="1024"><circle cx="512" cy="512" r="210" fill="#fff"/><ellipse cx="512" cy="512" rx="360" ry="120" transform="rotate(-16 512 512)" fill="none" stroke="#fff" stroke-width="22"/></svg>`;
module.exports = { A, B, C, D, monoB };
