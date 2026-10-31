// Formatos, equivalencias cómicas, niveles de dopamina y logros (portados de maqueta/index.html).

const nf = (x: number, d = 1) => x.toLocaleString('es-CL', { maximumFractionDigits: d });

/** Distancia en metros → "51 cm", "180 m", "1,3 km". */
export function fmtDist(m: number): string {
  if (m < 1) return `${Math.round(m * 100)} cm`;
  if (m < 1000) return `${nf(m, m < 10 ? 1 : 0)} m`;
  return `${nf(m / 1000, m < 10000 ? 2 : 1)} km`;
}

function fmtTime(sec: number): string {
  if (sec < 3600) return `${nf(sec / 60, 0)} minutos`;
  if (sec < 86400) return `${nf(sec / 3600, 1)} horas`;
  return `${nf(sec / 86400, 1)} días`;
}

export function equivalences(m: number): string[] {
  const list: string[] = [];
  if (m < 0.2) list.push('Todavía ni calientas el dedo 🫵');
  list.push(`🐌 Un caracol tardaría ${fmtTime(m / 0.001)} en recorrer esto`);
  if (m >= 12) list.push(`🚌 Son ${nf(m / 12)} micros en fila`);
  if (m >= 30) list.push(`⚽ Cruzaste ${nf(m / 105)} canchas de fútbol`);
  if (m >= 90) list.push(`🏙️ Subiste ${nf(m / 300)} veces la Gran Torre Santiago`);
  if (m >= 500) list.push(`🏔️ Vas al ${nf((m / 8849) * 100)} % del Everest`);
  if (m >= 3000) list.push(`🌲 Llevas el ${nf((m / 1030000) * 100, 2)} % del camino a Puerto Montt`);
  if (m >= 10000) list.push(`🏃 Es el ${nf((m / 42195) * 100, 0)} % de una maratón`);
  if (m < 12) list.push(`📱 Son ${nf(m / 0.15)} pantallas de celular`);
  return list;
}

/** La más llamativa (la última suele ser la más grande), para la tarjeta y el widget. */
export const bestEq = (m: number) => {
  const l = equivalences(m);
  return l[l.length - 1];
};

/** Estado de la mascota según la distancia de hoy: <100 m, <500 m, <2 km, más. */
export const stageOf = (m: number) => (m < 100 ? 0 : m < 500 ? 1 : m < 2000 ? 2 : 3);

export const DOPA: [number, string, string][] = [
  [20, '😌', 'Zen total'],
  [45, '🙂', 'Curiosito'],
  [70, '🎰', 'Enganchado'],
  [90, '🌀', 'Hipnotizado'],
  [101, '🍳', 'Cerebro frito'],
];
export const dopaLevel = (v: number) => DOPA.findIndex(([max]) => v < max);

// Lista de logros de Jean (2026-10-31), de menor a mayor. Distancias aproximadas, en metros.
export const MEDALS: [string, string, number][] = [
  ['👆', 'Primer toque', 0.01],
  ['✏️', 'Lápiz nuevo', 0.19],
  ['🎸', 'Guitarra completa', 1],
  ['🦒', 'Cuello de jirafa', 5.5],
  ['🚌', 'Bus de dos pisos', 10],
  ['🐋', 'Ballena azul', 30],
  ['🗽', 'Estatua de la Libertad', 93],
  ['⚽', 'Cancha completa', 105],
  ['🏙️', 'Gran Torre Santiago', 300],
  ['🗼', 'Torre Eiffel', 330],
  ['🌇', 'Burj Khalifa', 828],
  ['🦶', 'Kilómetro de pulgar', 1000],
  ['🌉', 'Puente Golden Gate', 2700],
  ['🗻', 'Monte Fuji', 3800],
  ['⛰️', 'Aconcagua', 6960],
  ['🏔️', 'Everest con el dedo', 8849],
  ['🤿', 'Fosa de las Marianas', 10900],
  ['🏊', 'Canal de la Mancha', 33000],
  ['🏃', 'Maratón del pulgar', 42195],
  ['🚀', 'Hasta el espacio', 100000],
  ['🌊', 'Santiago–Valpo', 116000],
  ['🚄', 'Londres–París', 344000],
  ['🚆', 'Madrid–Barcelona', 620000],
  ['🐚', 'Camino de Santiago', 800000],
  ['🌲', 'Rumbo a Puerto Montt', 1030000],
  ['🛣️', 'Ruta 66', 3940000],
  ['🦜', 'Río Amazonas', 6400000],
  ['🚂', 'Transiberiano', 9289000],
  ['🧱', 'Gran Muralla China', 21196000],
  ['🌎', 'Panamericana completa', 30000000],
  ['🌍', 'Vuelta al mundo', 40075000],
  ['🌕', 'Hasta la Luna', 384400000],
];

/** Color e inicial para cada app conocida (no usamos logos de marca). */
const KNOWN: Record<string, [string, string]> = {
  'com.zhiliaoapp.musically': ['#111111', '#ff2d6f'],
  'com.ss.android.ugc.trill': ['#111111', '#ff2d6f'],
  'com.instagram.android': ['#d62976', '#d62976'],
  'com.google.android.youtube': ['#d4002b', '#ff0033'],
  'com.twitter.android': ['#000000', '#555555'],
  'com.facebook.katana': ['#1877f2', '#1877f2'],
  'com.reddit.frontpage': ['#ff4500', '#ff4500'],
};
const PALETTE = ['#7b61ff', '#2f9e8f', '#e0702c', '#3a7bd5', '#b5468b'];
export function appColors(pkg: string): { icon: string; bar: string } {
  const k = KNOWN[pkg];
  if (k) return { icon: k[0], bar: k[1] };
  let h = 0;
  for (const ch of pkg) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = PALETTE[h % PALETTE.length];
  return { icon: c, bar: c };
}
