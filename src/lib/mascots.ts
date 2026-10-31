// Mascotas en SVG (200×220), mismos dibujos que maqueta/index.html. Se renderizan con <SvgXml>.
import type { MascotKey } from '../../modules/scroll-tracker';

const INK = '#23192e';
const S = `stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"`;

function eyes(s: number, lx: number, rx: number, y: number) {
  const ball = (x: number, r = 9) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + 3}" cy="${y - 3}" r="3" fill="#fff"/>`;
  if (s === 0) return ball(lx) + ball(rx);
  if (s === 1) return ball(lx, 8) + ball(rx, 8) +
    `<path d="M${lx - 11} ${y - 14} L${lx + 7} ${y - 19}" ${S} fill="none"/><path d="M${rx - 7} ${y - 19} L${rx + 11} ${y - 14}" ${S} fill="none"/>`;
  if (s === 2) return [lx, rx].map((x) =>
    `<path d="M${x - 11} ${y - 2} Q${x} ${y + 8} ${x + 11} ${y - 2}" ${S} fill="none"/><path d="M${x - 8} ${y + 9} Q${x} ${y + 13} ${x + 8} ${y + 9}" stroke="${INK}" stroke-width="2.5" fill="none" opacity=".5"/>`).join('');
  return `<path d="M${lx - 8} ${y - 8} L${lx + 8} ${y + 8} M${lx + 8} ${y - 8} L${lx - 8} ${y + 8}" ${S}/>` +
    `<circle cx="${rx}" cy="${y}" r="12" fill="#fff" ${S}/><circle cx="${rx + 4}" cy="${y + 3}" r="3.5" fill="${INK}"/>`;
}

function mouth(s: number, cx: number, y: number) {
  if (s === 0) return `<path d="M${cx - 16} ${y} Q${cx} ${y + 22} ${cx + 16} ${y} Z" fill="${INK}" ${S}/><path d="M${cx - 7} ${y + 9} Q${cx} ${y + 5} ${cx + 7} ${y + 9} Q${cx} ${y + 15} ${cx - 7} ${y + 9}Z" fill="#ff7a8a"/>`;
  if (s === 1) return `<path d="M${cx - 16} ${y + 4} q5 -7 10 0 t10 0 t10 0" ${S} fill="none"/>`;
  if (s === 2) return `<ellipse cx="${cx}" cy="${y + 4}" rx="9" ry="10" fill="${INK}"/><path d="M${cx - 6} ${y + 8} Q${cx - 6} ${y + 24} ${cx} ${y + 24} Q${cx + 6} ${y + 24} ${cx + 6} ${y + 8}Z" fill="#ff7a8a" stroke="${INK}" stroke-width="3"/>`;
  return `<path d="M${cx - 18} ${y + 2} L${cx - 10} ${y + 8} L${cx - 2} ${y + 2} L${cx + 6} ${y + 8} L${cx + 14} ${y + 2} L${cx + 18} ${y + 5}" ${S} fill="none"/>`;
}

const cheeks = (s: number, lx: number, rx: number, y: number) =>
  s < 2 ? `<ellipse cx="${lx - 8}" cy="${y}" rx="8" ry="5" fill="#ff8fab" opacity=".7"/><ellipse cx="${rx + 8}" cy="${y}" rx="8" ry="5" fill="#ff8fab" opacity=".7"/>` : '';
const drop = (x: number, y: number, k = 1) =>
  `<path d="M${x} ${y} q${8 * k} ${12 * k} 0 ${18 * k} q${-8 * k} ${-6 * k} 0 ${-18 * k}z" fill="#8fd3ff" stroke="${INK}" stroke-width="3"/>`;
const sparkle = (x: number, y: number) =>
  `<path d="M${x} ${y} l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#ffd24a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;

function thumb(s: number) {
  const skin = ['#ffcfa3', '#ffbe8f', '#f5ae8c', '#b5d99c'][s];
  let out = `<path d="M52 222 V82 Q52 22 100 22 Q148 22 148 82 V222" fill="${skin}" ${S}/>
    <path d="M70 84 Q70 40 100 40 Q130 40 130 84 Q130 96 118 96 H82 Q70 96 70 84Z" fill="#ffeadb" ${S}/>
    <path d="M72 196 q14 6 28 0 M100 206 q14 6 28 0" ${S} fill="none" opacity=".6"/>`;
  out += cheeks(s, 80, 120, 146) + eyes(s, 80, 120, 128) + mouth(s, 100, 154);
  if (s === 0) out += sparkle(166, 30) + sparkle(30, 70);
  if (s === 1) out += drop(160, 66) + drop(36, 96, 0.8);
  if (s === 2) out += `<g transform="rotate(-24 100 66)"><rect x="74" y="58" width="52" height="17" rx="8.5" fill="#ffd9a8" stroke="${INK}" stroke-width="3"/><circle cx="94" cy="66.5" r="1.8" fill="${INK}"/><circle cx="106" cy="66.5" r="1.8" fill="${INK}"/></g>` + drop(162, 80) +
    `<text x="150" y="40" font-size="26" font-weight="800" fill="${INK}">z</text><text x="168" y="22" font-size="18" font-weight="800" fill="${INK}">z</text>`;
  if (s === 3) out += `<path d="M62 112 L98 104" ${S} fill="none"/><path d="M70 104 l4 12 M82 101 l4 12 M92 99 l4 12" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="168" cy="48" r="5" fill="${INK}"/><ellipse cx="164" cy="41" rx="5" ry="3" fill="#fff" stroke="${INK}" stroke-width="2"/><ellipse cx="173" cy="41" rx="5" ry="3" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M150 70 q10 -6 6 -14 q-4 -8 8 -10" stroke="${INK}" stroke-width="2" stroke-dasharray="3 4" fill="none"/>`;
  return out;
}

function snail(s: number) {
  const body = ['#d7ee8c', '#d7ee8c', '#ffb38a', '#c4d9ff'][s];
  let out = `<path d="M14 206 Q14 182 44 180 H146 Q152 180 152 166 V124 Q152 96 174 96 Q196 96 196 124 V184 Q196 206 172 206 Z" fill="${body}" ${S}/>
    <path d="M166 100 L158 62 M184 100 L190 62" ${S}/>
    <circle cx="88" cy="124" r="58" fill="#ffb86b" ${S}/>
    <path d="M90 126 a8 8 0 1 1 8 -8 a17 17 0 1 1 -17 17 a28 28 0 1 1 28 -28 a40 40 0 1 1 -40 40" ${S} fill="none"/>`;
  const ex = [158, 190], ey = 56;
  ex.forEach((x) => (out += `<circle cx="${x}" cy="${ey}" r="12" fill="#fff" ${S}/>`));
  if (s === 0) ex.forEach((x) => (out += `<circle cx="${x}" cy="${ey - 2}" r="6" fill="${INK}"/><circle cx="${x + 2}" cy="${ey - 4}" r="2" fill="#fff"/>`));
  if (s === 1) ex.forEach((x) => (out += `<circle cx="${x - 5}" cy="${ey + 3}" r="4.5" fill="${INK}"/><path d="M${x - 12} ${ey - 1} H${x + 12}" ${S}/><path d="M${x - 12} ${ey - 1} A12 12 0 0 1 ${x + 12} ${ey - 1}Z" fill="${body}"/>`));
  if (s === 2) {
    out += `<circle cx="158" cy="${ey + 3}" r="4.5" fill="${INK}"/><circle cx="190" cy="${ey + 3}" r="4.5" fill="${INK}"/>`;
    out += `<path d="M146 ${ey - 6} L170 ${ey + 1} M202 ${ey - 6} L178 ${ey + 1}" ${S}/>`;
    out += `<text x="104" y="40" font-size="30">💢</text>`;
  }
  if (s === 3) ex.forEach((x) => (out += `<circle cx="${x}" cy="${ey + 2}" r="5" fill="${INK}"/><path d="M${x} ${ey + 12} q-4 20 2 40" stroke="#5cb8ff" stroke-width="5" stroke-linecap="round" fill="none"/>`));
  if (s === 0) out += `<ellipse cx="174" cy="144" rx="5" ry="7" fill="${INK}"/>` + sparkle(120, 30);
  if (s === 1) out += `<path d="M164 146 H184" ${S}/>`;
  if (s === 2) out += `<path d="M162 152 Q174 140 186 152" ${S} fill="none"/>`;
  if (s === 3) out += `<path d="M160 154 q4 -12 14 -12 q10 0 14 12" fill="${INK}" ${S}/>`;
  if (s < 2) out += `<ellipse cx="164" cy="134" rx="6" ry="4" fill="#ff8fab" opacity=".7"/><ellipse cx="188" cy="134" rx="6" ry="4" fill="#ff8fab" opacity=".7"/>`;
  return out;
}

function brain(s: number) {
  const c = ['#ffb3c7', '#ffa3b5', '#ff9a7a', '#e8b867'][s];
  const lobes: [number, number, number][] = [[68, 92, 38], [108, 76, 40], [146, 98, 34], [58, 132, 34], [100, 138, 44], [146, 136, 34]];
  const y0 = s === 3 ? 10 : 22;
  let out = '';
  if (s === 3) out += `<path d="M178 196 L204 182" stroke="${INK}" stroke-width="12" stroke-linecap="round"/><ellipse cx="100" cy="198" rx="80" ry="17" fill="#3a3646" ${S}/><ellipse cx="100" cy="186" rx="62" ry="10" fill="#fff6d6" stroke="${INK}" stroke-width="3"/>`;
  out += `<g transform="translate(0 ${y0 - 22})">`;
  out += lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${S}/>`).join('');
  out += lobes.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - 2.6}" fill="${c}"/>`).join('');
  out += `<path d="M76 70 q10 -10 20 0 t20 0 M128 100 q8 8 16 0 M46 114 q8 -8 16 0 M150 128 q6 -8 12 0" stroke="${INK}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".55"/>`;
  out += cheeks(s, 84, 124, 140) + eyes(s, 84, 124, 122) + mouth(s, 104, 148);
  if (s === 0) out += sparkle(170, 34);
  if (s === 1) out += drop(166, 56);
  if (s === 2) out += `<path d="M76 38 q-8 -10 0 -18 t0 -18 M106 30 q-8 -10 0 -18 t0 -18 M136 38 q-8 -10 0 -18 t0 -18" stroke="#8a8494" stroke-width="5" stroke-linecap="round" fill="none"/>`;
  out += `</g>`;
  return out;
}

export const MASCOTS: Record<MascotKey, { name: string; draw: (s: number) => string; stages: string[]; lines: string[]; shareKick: string }> = {
  pulgar: {
    name: 'Pulgar',
    draw: thumb,
    stages: ['Fresquito', 'Sudando la gota', 'Pide vacaciones', 'Pulgar zombie'],
    lines: ['¡Listo pa’l día! 💪', 'Uff… ¿otro video más?', 'No siento la uña. Ayuda.', 'Braaains… digo, reels…'],
    shareKick: 'HOY MI PULGAR RECORRIÓ',
  },
  caracol: {
    name: 'Caracol',
    draw: snail,
    stages: ['Impresionado', 'Celoso', 'Ofendido', 'Llorando en baba'],
    lines: ['Wow, ¡qué rapidez!', 'Yo hago eso en 3 días…', 'No te hablo.', 'Nunca seré tan rápido 😭'],
    shareKick: 'HOY HUMILLÉ A UN CARACOL',
  },
  cerebro: {
    name: 'Cerebro',
    draw: brain,
    stages: ['Fresco', 'Tibio', 'Humeando', 'Frito'],
    lines: ['Todo bajo control 😌', 'Se está poniendo tibio esto…', '¿Huele a quemado o soy yo?', 'Listo pa’ la marraqueta 🍳'],
    shareKick: 'HOY MI CEREBRO SCROLLEÓ',
  },
};

export const mascotXml = (k: MascotKey, s: number) =>
  `<svg viewBox="0 0 210 222" xmlns="http://www.w3.org/2000/svg">${MASCOTS[k].draw(s)}</svg>`;
