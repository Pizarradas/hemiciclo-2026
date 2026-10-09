// Empaqueta la landing para verla sin conexión: librerías y fuentes locales.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const OUT = process.argv[2] || 'offline/hemiciclo-23j';
const V = process.argv[3] || '/root/vendor/node_modules';
execSync('node build.mjs', { stdio: 'inherit' });
fs.rmSync(OUT, { recursive: true, force: true });
for (const d of ['vendor', 'fonts', 'fuente']) fs.mkdirSync(path.join(OUT, d), { recursive: true });

// Librerías
const libs = {
  'echarts.min.js': `${V}/echarts/dist/echarts.min.js`,
  'gsap.min.js': `${V}/gsap/dist/gsap.min.js`,
  'ScrollTrigger.min.js': `${V}/gsap/dist/ScrollTrigger.min.js`,
};
for (const [f, src] of Object.entries(libs)) fs.copyFileSync(src, path.join(OUT, 'vendor', f));
fs.copyFileSync(`${V}/echarts/LICENSE`, path.join(OUT, 'vendor', 'LICENSE-echarts.txt'));
fs.copyFileSync(`${V}/gsap/README.md`, path.join(OUT, 'vendor', 'README-gsap.md'));

// Fuentes (latin) + @font-face
const faces = [
  ['Big Shoulders Display', 'big-shoulders-display', [700, 900], ['normal']],
  ['Big Shoulders Stencil Display', 'big-shoulders-stencil-display', [800, 900], ['normal']],
  ['Public Sans', 'public-sans', [400, 600, 700], ['normal', 'italic']],
  ['IBM Plex Mono', 'ibm-plex-mono', [400, 500], ['normal']],
];
let css = '/* Fuentes servidas en local (SIL Open Font License, vía @fontsource) */\n';
for (const [fam, pkg, weights, styles] of faces) {
  for (const w of weights) for (const st of styles) {
    const file = `${pkg}-latin-${w}-${st}.woff2`;
    fs.copyFileSync(`${V}/@fontsource/${pkg}/files/${file}`, path.join(OUT, 'fonts', file));
    css += `@font-face{font-family:"${fam}";font-style:${st};font-weight:${w};font-display:swap;src:url("fonts/${file}") format("woff2");}\n`;
  }
  const lic = ['LICENSE', 'OFL.txt'].map((f) => `${V}/@fontsource/${pkg}/${f}`).find(fs.existsSync);
  if (lic) fs.copyFileSync(lic, path.join(OUT, 'fonts', `LICENSE-${pkg}.txt`));
}

// HTML: sin CDN ni Google Fonts
let html = fs.readFileSync('dist/hemiciclo.html', 'utf8');
html = html
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, `<style>\n${css}</style>`)
  .replace('https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.1/echarts.min.js', 'vendor/echarts.min.js')
  .replace('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js', 'vendor/gsap.min.js')
  .replace('https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js', 'vendor/ScrollTrigger.min.js');
if (/googleapis|cdnjs/.test(html)) throw new Error('Quedan recursos remotos en el HTML');
const doc = `<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n`;
const [head, ...body] = html.split('\n<div class="hemi-page">');
html = doc + head + '\n<style>body{margin:0}</style>\n</head>\n<body>\n<div class="hemi-page">' + body.join('\n<div class="hemi-page">') + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(OUT, 'index.html'), html);

// Fuentes del proyecto, para reconstruir
for (const f of ['src/index.html', 'src/hemi.scss', 'src/app.js', 'build.mjs', 'build-offline.mjs', 'AGENTS.md', 'SYX-VOCABULARY.md']) {
  fs.mkdirSync(path.join(OUT, 'fuente', path.dirname(f)), { recursive: true });
  fs.copyFileSync(f, path.join(OUT, 'fuente', f));
}
console.log('✓', OUT);
