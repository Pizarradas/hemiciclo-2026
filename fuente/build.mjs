import fs from 'node:fs';
import { execSync } from 'node:child_process';
const sass = '/root/syx/node_modules/.bin/sass';
execSync(`${sass} --load-path=node_modules src/hemi.scss dist/hemi.css --no-source-map --style=compressed`);
execSync(`${sass} /root/syx/scss/styles-theme-hemiciclo.scss dist/theme.css --no-source-map --style=compressed`);
let html = fs.readFileSync('src/index.html', 'utf8');
html = html.replace('/*@@THEME_CSS@@*/', () => fs.readFileSync('dist/theme.css', 'utf8'))
  .replace('/*@@APP_CSS@@*/', () => fs.readFileSync('dist/hemi.css', 'utf8'))
  .replace('/*@@APP_JS@@*/', () => fs.readFileSync('src/app.js', 'utf8'))
  .replace('/*@@SYX_TABS@@*/', () => '/* syx-design-system/js/syx-tabs.js */\n' + fs.readFileSync('node_modules/syx-design-system/js/syx-tabs.js', 'utf8').replace('export function initTabs', 'function initTabs').replace(/<\/script/gi, '<\\/script'));
fs.writeFileSync('dist/hemiciclo.html', html);
for (const f of ['theme.css','hemi.css','hemiciclo.html']) console.log(f, fs.statSync('dist/'+f).size);
