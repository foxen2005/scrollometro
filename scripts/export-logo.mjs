// Logo del Scrollómetro (idea de Jean, 2026-10-31): el pulgar "Fresquito" inclinado, chispas,
// fondo celeste y lentes pixelados estilo "deal with it". Genera el SVG y los PNG del ícono.
// Uso: node scripts/export-logo.mjs   (desde la raíz del proyecto; necesita Chrome)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const INK = '#23192e';
const SKY = '#8fd3ff';
const S = `stroke="${INK}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"`;

const sparkle = (x, y, k = 1) =>
  `<path transform="translate(${x} ${y}) scale(${k})" d="M0 0 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" fill="#ffd24a" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;

/** Lentes pixelados: celdas de 4 unidades. Barra superior, dos lentes escalonados, patilla y brillos. */
function glasses() {
  const p = 4;
  const cells = [];
  const white = [];
  for (let x = 0; x < 30; x++) cells.push([x, 0]);                 // barra superior
  for (const lx of [1, 16]) {
    for (let x = lx; x < lx + 12; x++) cells.push([x, 1], [x, 2]);  // lente
    for (let x = lx + 1; x < lx + 11; x++) cells.push([x, 3]);
    for (let x = lx + 2; x < lx + 10; x++) cells.push([x, 4]);
    white.push([lx + 2, 1], [lx + 3, 2], [lx + 6, 1], [lx + 7, 2], [lx + 8, 3]); // brillos en diagonal
  }
  cells.push([30, 0], [31, -1], [32, -1], [33, -2]);                // patilla hacia arriba
  const rect = ([x, y], fill) => `<rect x="${x * p - 0.3}" y="${y * p - 0.3}" width="${p + 0.6}" height="${p + 0.6}" fill="${fill}"/>`;
  return cells.map((c) => rect(c, INK)).join('') + white.map((c) => rect(c, '#ffffff')).join('');
}

/** Pulgar en coordenadas locales (mismo dibujo que la mascota, cuerpo alargado para salir por abajo). */
function thumb() {
  return `
    <path d="M52 420 V82 Q52 22 100 22 Q148 22 148 82 V420" fill="#ffcfa3" ${S}/>
    <path d="M70 84 Q70 40 100 40 Q130 40 130 84 Q130 96 118 96 H82 Q70 96 70 84Z" fill="#ffeadb" ${S}/>
    <ellipse cx="72" cy="150" rx="8" ry="5" fill="#ff8fab" opacity=".7"/><ellipse cx="128" cy="150" rx="8" ry="5" fill="#ff8fab" opacity=".7"/>
    <circle cx="80" cy="124" r="9" fill="${INK}"/><circle cx="83" cy="121" r="3" fill="#fff"/>
    <circle cx="120" cy="124" r="9" fill="${INK}"/><circle cx="123" cy="121" r="3" fill="#fff"/>
    <path d="M86 166 Q102 186 118 166 Z" fill="${INK}" ${S}/><path d="M95 175 Q102 171 109 175 Q102 181 95 175Z" fill="#ff7a8a"/>
    <path d="M72 206 q14 6 28 0 M100 216 q14 6 28 0" ${S} fill="none" opacity=".6"/>
    <g transform="translate(36 136) rotate(-4)">${glasses()}</g>`;
}

/** Composición 512×512. `zoom` achica todo hacia el centro (ícono adaptativo: zona segura). */
function logo({ background = true, zoom = 1, mono = false } = {}) {
  const body = `
    <g transform="translate(256 256) scale(${zoom}) translate(-256 -256)">
      ${sparkle(392, 92, 2.2)}
      ${sparkle(64, 322, 2)}
      <g transform="translate(268 300) rotate(-20) scale(2.25) translate(-100 -130)">${thumb()}</g>
    </g>`;
  const filter = mono ? `<filter id="m"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
    <defs>${filter}<clipPath id="c"><rect width="512" height="512"/></clipPath></defs>
    ${background ? `<rect width="512" height="512" fill="${SKY}"/>` : ''}
    <g clip-path="url(#c)" ${mono ? 'filter="url(#m)"' : ''}>${body}</g>
  </svg>`;
}

const root = resolve(process.argv[2] ?? '.');
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const work = join(tmpdir(), 'scrollometro-logo');
mkdirSync(work, { recursive: true });

function png(svg, out) {
  const html = join(work, 'logo.html');
  writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  execFileSync(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
    '--window-size=1024,1024', `--screenshot=${out}`, pathToFileURL(html).href], { stdio: 'ignore' });
  console.log(out);
}

writeFileSync(join(root, 'assets', 'logo.svg'), logo());
png(logo(), join(root, 'assets', 'icon.png'));
png(logo(), join(root, 'assets', 'logo.png'));
// Adaptativo: fondo celeste aparte y el dibujo achicado para que la cara quede en la zona segura (66 %)
png(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${SKY}"/></svg>`, join(root, 'assets', 'android-icon-background.png'));
png(logo({ background: false, zoom: 0.72 }), join(root, 'assets', 'android-icon-foreground.png'));
png(logo({ background: false, zoom: 0.72, mono: true }), join(root, 'assets', 'android-icon-monochrome.png'));
