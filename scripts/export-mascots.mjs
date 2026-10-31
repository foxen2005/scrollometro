// Exporta las 12 mascotas (3 × 4 estados) a PNG con Chrome headless, para el widget de Android.
// Uso: node export-mascots.mjs <ruta a src/lib/mascots.ts> <carpeta de salida>
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , mascotsTs, outDir] = process.argv;
const { MASCOTS, mascotXml } = await import(pathToFileURL(mascotsTs).href);
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const W = 420, H = 444; // 2× del viewBox 210×222
mkdirSync(outDir, { recursive: true });
const work = join(tmpdir(), 'scrollometro-mascots');
mkdirSync(work, { recursive: true });

for (const k of Object.keys(MASCOTS)) {
  for (let s = 0; s < 4; s++) {
    const html = join(work, `${k}_${s}.html`);
    const svg = mascotXml(k, s).replace('<svg ', `<svg width="${W}" height="${H}" `);
    writeFileSync(html, `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
    const out = join(outDir, `mascot_${k}_${s}.png`);
    execFileSync(chrome, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
      `--window-size=${W},${H}`, `--screenshot=${out}`, pathToFileURL(html).href,
    ], { stdio: 'ignore' });
    console.log(out);
  }
}
