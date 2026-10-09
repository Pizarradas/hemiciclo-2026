(function () {
  'use strict';

  // ════════════════════════════════════════════════════════════════════════
  // DATOS · escrutinio definitivo del 23J (con CERA). Fuentes al pie.
  // Orden del hemiciclo, de izquierda a derecha según se mira desde la tribuna.
  // El color de cada partido es un dato (su identidad), no parte del tema.
  // ════════════════════════════════════════════════════════════════════════
  var PARTIES = [
    { id: 'bildu', name: 'EH Bildu', seats: 6, votes: 335129, pct: 1.36, d: 1, color: '#2E9E86' },
    { id: 'bng', name: 'BNG', seats: 1, votes: 153995, pct: 0.62, d: 0, color: '#79AFD9' },
    { id: 'erc', name: 'ERC', seats: 7, votes: 466020, pct: 1.89, d: -6, color: '#EFA530' },
    { id: 'sumar', name: 'Sumar', seats: 31, votes: 3044996, pct: 12.33, d: -7, color: '#D2337C' },
    { id: 'psoe', name: 'PSOE', seats: 121, votes: 7821718, pct: 31.68, d: 1, color: '#D8261D' },
    { id: 'pnv', name: 'PNV', seats: 5, votes: 277289, pct: 1.12, d: -1, color: '#2F7D3E' },
    { id: 'junts', name: 'Junts', seats: 7, votes: 395429, pct: 1.6, d: -1, color: '#13AFC4' },
    { id: 'cc', name: 'CC', seats: 1, votes: 116363, pct: 0.47, d: 0, color: '#E3BC12' },
    { id: 'upn', name: 'UPN', seats: 1, votes: 52188, pct: 0.21, d: -1, color: '#5A6CB0' },
    { id: 'pp', name: 'PP', seats: 137, votes: 8160837, pct: 33.06, d: 48, color: '#1E76C6' },
    { id: 'vox', name: 'Vox', seats: 33, votes: 3057000, pct: 12.38, d: -19, color: '#5AAD2A' }
  ];
  var BY_ID = {};
  PARTIES.forEach(function (p) { BY_ID[p.id] = p; });
  var CS_COLOR = '#EB6A12';
  var TOTAL = 350;
  var MAJORITY = 176;
  var VALID = 24688087;
  var BLANK = 200673;
  var byVotes = PARTIES.slice().sort(function (a, b) { return b.votes - a.votes; });

  var nf = new Intl.NumberFormat('es-ES');
  var nf1 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  var nf2 = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var signed = function (n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '±0'; };

  // Reparto proporcional puro (ilustrativo): restos mayores, circunscripción única,
  // sin barrera, sobre votos a candidaturas (válidos menos blancos).
  var PROP = (function () {
    var pool = VALID - BLANK;
    var listed = PARTIES.reduce(function (a, p) { return a + p.votes; }, 0);
    var rows = PARTIES.map(function (p) { return { id: p.id, v: p.votes }; }).concat([{ id: 'otros', v: pool - listed }]);
    var q = pool / TOTAL;
    rows.forEach(function (r) { r.n = Math.floor(r.v / q); r.rest = r.v / q - r.n; });
    var left = TOTAL - rows.reduce(function (a, r) { return a + r.n; }, 0);
    rows.slice().sort(function (a, b) { return b.rest - a.rest; }).slice(0, left).forEach(function (r) { r.n++; });
    var out = {};
    rows.forEach(function (r) { out[r.id] = r.n; });
    return out;
  })();

  // ════════════════════════════════════════════════════════════════════════
  // TOKENS DEL TEMA → colores que entienden SVG animado y ECharts
  // El tema declara en oklch(); ni GSAP ni ECharts lo interpolan. Se pinta un
  // píxel y se lee.
  // ════════════════════════════════════════════════════════════════════════
  var probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  probe.canvas.width = probe.canvas.height = 1;
  function token(name) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = raw || '#000';
    probe.fillRect(0, 0, 1, 1);
    var d = probe.getImageData(0, 0, 1, 1).data;
    return 'rgb(' + d[0] + ',' + d[1] + ',' + d[2] + ')';
  }
  var T = {};
  function readTheme() {
    T.ink = token('--hemi-ink');
    T.soft = token('--hemi-ink-soft');
    T.faint = token('--hemi-ink-faint');
    T.rule = token('--semantic-color-border-default');
    T.subtle = token('--semantic-color-border-subtle');
    T.strong = token('--semantic-color-border-strong');
    T.bg = token('--hemi-bg');
    T.marker = token('--hemi-marker');
    T.empty = token('--hemi-seat-empty');
    T.inkDark = token('--hemi-ink-dark');
    T.inkLight = token('--hemi-ink-light');
    T.slab = token('--hemi-iso-slab');
    T.onEmphasis = token('--hemi-emphasis-fg');
    T.emphasisBg = token('--hemi-emphasis-bg');
    var cs = getComputedStyle(document.documentElement);
    T.fontBody = cs.getPropertyValue('--semantic-font-family-primary').trim() || 'sans-serif';
    T.fontMono = cs.getPropertyValue('--semantic-font-family-mono').trim() || 'monospace';
  }

  // Tinta legible sobre un relleno de partido: la de más contraste (WCAG).
  function lum(rgb) {
    var m = rgb.match(/\d+/g).map(function (v) { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  }
  function hexToRgb(h) { var n = parseInt(h.slice(1), 16); return 'rgb(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ')'; }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function inkOn(hex) { var bg = hexToRgb(hex); return contrast(bg, T.inkDark) >= contrast(bg, T.inkLight) ? T.inkDark : T.inkLight; }

  var reducedMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduced = reducedMQ.matches;

  // ════════════════════════════════════════════════════════════════════════
  // ISOMETRÍA · kit iso-flat (ISOMETRIC-P), proyección isométrica real
  // Ejes del mundo: x abajo-derecha, y abajo-izquierda, z arriba.
  // sx = (x − y)·cos30·u   sy = ((x + y)·0.5 − z)·u
  // Tres tonos por material con shade() del kit (top cálido +12 L, left base,
  // right frío −16 L ×0.85 S), luz arriba-izquierda.
  // ════════════════════════════════════════════════════════════════════════
  var C30 = 0.8660254;
  function isoP(x, y, z, u) { return [(x - y) * C30 * u, ((x + y) * 0.5 - z) * u]; }
  function isoPts(list, u) {
    return list.map(function (p) { var q = isoP(p[0], p[1], p[2], u); return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' ');
  }
  // Caras visibles de un prisma alineado con los ejes: (x,y,z) esquina mínima.
  function boxFaces(x, y, z, w, d, h, u) {
    var X = x + w, Y = y + d, Z = z + h;
    return {
      left: isoPts([[x, Y, z], [X, Y, z], [X, Y, Z], [x, Y, Z]], u),
      right: isoPts([[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], u),
      top: isoPts([[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], u)
    };
  }
  function hexToHsl(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    var r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
    var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l);
    var f = function (n) { return Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))); };
    return '#' + [f(0), f(8), f(4)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }
  function towards(h, target, amt) { var d = ((target - h + 540) % 360) - 180; return h + Math.sign(d) * Math.min(Math.abs(d), amt); }
  function shade(hex) {
    var hsl = hexToHsl(hex);
    return {
      top: hslToHex(towards(hsl[0], 50, 6), hsl[1], hsl[2] + 12),
      left: hex.toLowerCase(),
      right: hslToHex(towards(hsl[0], 230, 6), hsl[1] * 0.85, hsl[2] - 16)
    };
  }
  function rgbToHex(rgb) {
    var m = rgb.match(/\d+/g);
    return '#' + m.slice(0, 3).map(function (v) { return (+v).toString(16).padStart(2, '0'); }).join('');
  }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  // ════════════════════════════════════════════════════════════════════════
  // EL HEMICICLO EN VOLUMEN · 350 escaños sobre gradas, que GSAP recolorea
  // La cámara mira desde la tribuna: el arco se abre hacia el lector.
  // ════════════════════════════════════════════════════════════════════════
  var ROWS = 11, R0 = 0.4;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var HU = 20;                    // px por unidad del mundo
  var RW = 10;                    // radio exterior en unidades
  var SEAT = 0.42, SEAT_H = 0.36, TIER = 0.2;
  var RT = [Math.SQRT1_2, -Math.SQRT1_2];  // derecha en pantalla
  var FW = [Math.SQRT1_2, Math.SQRT1_2];   // hacia el lector
  function polar(a, R) { return [R * (Math.cos(a) * RT[0] - Math.sin(a) * FW[0]), R * (Math.cos(a) * RT[1] - Math.sin(a) * FW[1])]; }

  var seats = (function () {
    var radii = [], sum = 0;
    for (var i = 0; i < ROWS; i++) { var r = R0 + (1 - R0) * i / (ROWS - 1); radii.push(r); sum += r; }
    var counts = radii.map(function (r) { return Math.round(TOTAL * r / sum); });
    var diff = TOTAL - counts.reduce(function (a, b) { return a + b; }, 0);
    for (var k = ROWS - 1; diff !== 0; k = (k - 1 + ROWS) % ROWS) { counts[k] += diff > 0 ? 1 : -1; diff += diff > 0 ? -1 : 1; }
    var out = [];
    radii.forEach(function (r, row) {
      var n = counts[row];
      for (var j = 0; j < n; j++) {
        var a = Math.PI * (1 - j / (n - 1));
        var p = polar(a, r * RW);
        out.push({ a: a, r: r, row: row, px: p[0], py: p[1], tz: row * TIER });
      }
    });
    out.sort(function (p, q) { return q.a - p.a || p.r - q.r; });
    return out;
  })();
  // Frontera entre el asiento i y el i+1 (orden izquierda → derecha)
  function boundary(i) { return (seats[i].a + seats[i + 1].a) / 2; }

  var seatFaces = [];   // por asiento: { g, top, left, right }
  var majority = {};    // línea en el suelo, poste y rótulo
  var majAngle = { a: Math.PI / 2, o: 0 };
  var slabParts = {};

  function buildHemicycle() {
    var svg = document.getElementById('hemicycle');
    svg.innerHTML = '';
    el('title', { id: 'hemicycle-title' }, svg).textContent = 'El hemiciclo del Congreso en isométrica';
    el('desc', { id: 'hemicycle-desc' }, svg).textContent = 'Los 350 escaños sobre once gradas, coloreados según el paso del recorrido. La cifra y la leyenda bajo la ilustración dicen lo mismo en texto.';
    svg.setAttribute('aria-labelledby', 'hemicycle-title hemicycle-desc stage-number stage-caption');

    // Losa: medio disco con un frente recto para la tribuna
    var RS = RW + 1.1, FRONT = 3.2, TH = 0.55;
    var arc = [];
    for (var i = 0; i <= 48; i++) { var a = Math.PI * i / 48; var p = polar(a, RS); arc.push([p[0], p[1], 0]); }
    var rEnd = polar(0, RS), lEnd = polar(Math.PI, RS);
    var rFront = [rEnd[0] + FRONT * FW[0], rEnd[1] + FRONT * FW[1]];
    var lFront = [lEnd[0] + FRONT * FW[0], lEnd[1] + FRONT * FW[1]];
    var slab = el('g', { id: 'losa', 'data-iso-part': 'losa', class: 'iso-slab' }, svg);
    slabParts.front = el('polygon', { class: 'face-left', points: isoPts([[lFront[0], lFront[1], 0], [rFront[0], rFront[1], 0], [rFront[0], rFront[1], -TH], [lFront[0], lFront[1], -TH]], HU) }, slab);
    slabParts.top = el('polygon', { class: 'face-top', points: isoPts(arc.concat([[lFront[0], lFront[1], 0], [rFront[0], rFront[1], 0]]).concat([]), HU) }, slab);
    // el polígono superior: arco (0→π) y luego frente izquierdo → frente derecho
    slabParts.top.setAttribute('points', isoPts(arc.concat([[lFront[0], lFront[1], 0], [rFront[0], rFront[1], 0]]), HU));

    // Línea de mayoría en el suelo (bajo los escaños)
    majority.line = el('polyline', { class: 'iso-majority-line', fill: 'none', 'stroke-width': 1.6, 'stroke-dasharray': '5 4' }, svg);

    // Escaños, de atrás hacia delante (orden del pintor por x + y, luego z)
    var order = seats.map(function (s, i) { return i; }).sort(function (i, j) {
      var a = seats[i], b = seats[j];
      return (a.px + a.py) - (b.px + b.py) || a.tz - b.tz;
    });
    var layer = el('g', { class: 'iso-seats' }, svg);
    majority.layer = layer;
    seatFaces = new Array(seats.length);
    order.forEach(function (i) {
      var s = seats[i], x = s.px - SEAT / 2, y = s.py - SEAT / 2;
      var g = el('g', { id: 'escano-' + (i + 1), 'data-iso-part': 'escano-' + (i + 1), class: 'iso-seat' }, layer);
      g.__depth = s.px + s.py;
      var rec = { g: g };
      if (s.tz > 0) {
        var pf = boxFaces(x, y, 0, SEAT, SEAT, s.tz, HU);
        var ped = el('g', { class: 'iso-pedestal' }, g);
        rec.pl = el('polygon', { class: 'face-left', points: pf.left }, ped);
        rec.pr = el('polygon', { class: 'face-right', points: pf.right }, ped);
      }
      var f = boxFaces(x, y, s.tz, SEAT, SEAT, SEAT_H, HU);
      var blkG = el('g', { class: 'iso-seat__block' }, g);
      rec.blk = blkG;
      rec.left = el('polygon', { class: 'face-left', points: f.left }, blkG);
      rec.right = el('polygon', { class: 'face-right', points: f.right }, blkG);
      rec.top = el('polygon', { class: 'face-top', points: f.top }, blkG);
      seatFaces[i] = rec;
    });

    // Tribuna (mesa de la presidencia), delante del arco
    var tc = [1.9 * FW[0], 1.9 * FW[1]];
    var tg = el('g', { id: 'tribuna', 'data-iso-part': 'tribuna', class: 'iso-podium' }, svg);
    var tf = boxFaces(tc[0] - 0.9, tc[1] - 0.9, 0, 1.8, 1.8, 0.9, HU);
    slabParts.podL = el('polygon', { class: 'face-left', points: tf.left }, tg);
    slabParts.podR = el('polygon', { class: 'face-right', points: tf.right }, tg);
    slabParts.podT = el('polygon', { class: 'face-top', points: tf.top }, tg);

    // Poste de la mayoría (encima de todo, con su rótulo)
    // va dentro de la capa de escaños: se reordena por profundidad cuando gira
    var post = el('g', { id: 'poste-176', 'data-iso-part': 'poste-176', class: 'iso-post' }, layer);
    majority.post = post;
    majority.pl = el('polygon', { class: 'face-left' }, post);
    majority.pr = el('polygon', { class: 'face-right' }, post);
    majority.pt = el('polygon', { class: 'face-top' }, post);
    majority.label = el('text', { 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 15 }, post);
    majority.label.textContent = '176';

    // viewBox ajustado a la escena
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    arc.concat([[lFront[0], lFront[1], -TH], [rFront[0], rFront[1], -TH]]).forEach(function (p) {
      var q = isoP(p[0], p[1], p[2], HU); minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]);
    });
    var topZ = (ROWS - 1) * TIER + SEAT_H + 4.2;
    var back = polar(Math.PI / 2, RS + 0.4);
    minY = Math.min(minY, isoP(back[0], back[1], topZ, HU)[1]);
    svg.setAttribute('viewBox', [minX - 6, minY - 6, maxX - minX + 12, maxY - minY + 12].map(function (v) { return v.toFixed(1); }).join(' '));
    paintStatic();
  }

  // Colores del tema para la losa, las gradas y la tribuna (vía shade() desde el token)
  // Los neutros salen del tema: cada tono es una variable CSS de la propia
  // ilustración (tres tonos con shade() desde el token) y las caras la leen
  // por style="fill:var(--…)". Cambiar de tema solo reescribe las variables.
  function isoVars(svg, name, hex) {
    var c = shade(hex);
    ['top', 'left', 'right'].forEach(function (f) { svg.style.setProperty('--hemi-iso-' + name + '-' + f, c[f]); });
  }
  function fillVar(node, name, face) { node.setAttribute('style', 'fill:var(--hemi-iso-' + name + '-' + face + ')'); }
  function paintStatic() {
    var svg = document.getElementById('hemicycle');
    isoVars(svg, 'losa', rgbToHex(T.slab));
    isoVars(svg, 'grada', rgbToHex(T.empty));
    isoVars(svg, 'tribuna', rgbToHex(T.ink));
    isoVars(svg, 'mayoria', rgbToHex(T.marker));
    svg.style.setProperty('--hemi-iso-tinta', rgbToHex(T.ink));
    fillVar(slabParts.top, 'losa', 'top');
    fillVar(slabParts.front, 'losa', 'right');
    fillVar(slabParts.podT, 'tribuna', 'top');
    fillVar(slabParts.podL, 'tribuna', 'left');
    fillVar(slabParts.podR, 'tribuna', 'right');
    seatFaces.forEach(function (r) { if (r.pl) { fillVar(r.pl, 'grada', 'left'); fillVar(r.pr, 'grada', 'right'); } });
    fillVar(majority.pl, 'mayoria', 'left');
    fillVar(majority.pr, 'mayoria', 'right');
    fillVar(majority.pt, 'mayoria', 'top');
    majority.line.setAttribute('style', 'stroke:var(--hemi-iso-tinta)');
    majority.label.setAttribute('style', 'fill:var(--hemi-iso-tinta)');
    majority.label.setAttribute('font-family', T.fontMono);
  }

  function drawMajority() {
    var a = majAngle.a;
    var p0 = polar(a, R0 * RW - 0.9), p1 = polar(a, RW + 0.7);
    majority.line.setAttribute('points', isoPts([[p0[0], p0[1], 0.01], [p1[0], p1[1], 0.01]], HU));
    var w = 0.22, H = (ROWS - 1) * TIER + SEAT_H + 2.6;
    var f = boxFaces(p1[0] - w / 2, p1[1] - w / 2, 0, w, w, H, HU);
    majority.pl.setAttribute('points', f.left);
    majority.pr.setAttribute('points', f.right);
    majority.pt.setAttribute('points', f.top);
    var lt = isoP(p1[0], p1[1], H, HU);
    majority.label.setAttribute('x', lt[0].toFixed(2));
    majority.label.setAttribute('y', (lt[1] - 8).toFixed(2));
    [majority.line, majority.post].forEach(function (n) { n.setAttribute('opacity', majAngle.o.toFixed(3)); });
    // Orden del pintor: el poste va justo antes del primer escaño que está delante
    var key = p1[0] + p1[1], layer = majority.layer, next = null;
    for (var c = layer.firstChild; c; c = c.nextSibling) { if (c !== majority.post && c.__depth > key) { next = c; break; } }
    if (majority.post.nextSibling !== next) layer.insertBefore(majority.post, next);
  }

  // ── Los pasos: cada uno es una secuencia de bloques de izquierda a derecha ──
  function blk(color, n, extra) { return Object.assign({ color: color, n: n }, extra || {}); }
  function party(id, n) { var p = BY_ID[id]; return blk(p.color, n == null ? p.seats : n, { name: p.name }); }
  function STEPS() {
    var grey = rgbToHex(T.strong), empty = rgbToHex(T.empty), marker = rgbToHex(T.marker);
    return {
      result: {
        blocks: PARTIES.map(function (p) { return party(p.id); }),
        number: 137, caption: 'escaños del PP. La mayoría absoluta está en 176.'
      },
      proportional: {
        blocks: ['bildu', 'bng', 'erc', 'sumar', 'psoe'].map(function (id) { return party(id, PROP[id]); })
          .concat([blk(grey, PROP.otros, { name: 'Otras' })])
          .concat(['pnv', 'junts', 'cc', 'upn', 'pp', 'vox'].map(function (id) { return party(id, PROP[id]); })),
        number: PROP.pp, caption: 'escaños tendría el PP con un reparto proporcional puro. Tiene 137.'
      },
      y2019: {
        blocks: [party('bildu', 5), party('bng', 1), blk(grey, 2, { name: 'CUP' }), party('erc', 13),
          blk(BY_ID.sumar.color, 38, { name: 'UP + Más País + Compromís' }), party('psoe', 120),
          blk(grey, 2, { name: 'PRC + Teruel Existe' }), party('pnv', 6), blk(BY_ID.junts.color, 8, { name: 'JxCat' }),
          blk(BY_ID.cc.color, 2, { name: 'CC-NC' }), blk(CS_COLOR, 10, { name: 'Cs' }),
          blk(BY_ID.upn.color, 2, { name: 'Navarra Suma' }), party('pp', 89), party('vox', 52)],
        number: 89, caption: 'escaños tenía el PP tras las elecciones de noviembre de 2019.'
      },
      feijoo: {
        blocks: [blk(empty, 174, { name: 'No', quiet: true }), blk(marker, 4, { name: 'Faltaron', lift: true }),
          party('cc'), party('upn'), party('vox'), party('pp')],
        line: boundary(173), number: 172, caption: 'síes para Feijóo. Le faltaron 4 para la mayoría absoluta.'
      },
      sanchez: {
        blocks: ['bildu', 'bng', 'erc', 'sumar', 'psoe', 'pnv', 'junts', 'cc'].map(function (id) { return party(id); })
          .concat([blk(empty, 171, { name: 'No', quiet: true })]),
        line: boundary(175), number: 179, caption: 'síes para Sánchez. Investido en primera votación.'
      },
      reset: {
        blocks: [blk(empty, 350, { name: 'Escaños por repartir', hollow: true })],
        number: 350, caption: 'escaños en juego el 29 de noviembre de 2026.'
      }
    };
  }

  var current = 'result';
  var readoutState = { v: 0 };
  var shadeCache = {};
  function tones(hex) { return shadeCache[hex] || (shadeCache[hex] = shade(hex)); }

  function applyStep(key, instant) {
    current = key;
    var st = STEPS()[key];
    var list = [];
    st.blocks.forEach(function (b) { for (var i = 0; i < b.n; i++) list.push(b); });
    var anim = window.gsap && !(instant || reduced);
    seatFaces.forEach(function (rec, i) {
      var b = list[i], c = tones(b.color);
      var delay = (i / TOTAL) * 0.7;
      var faces = [[rec.top, c.top], [rec.left, c.left], [rec.right, c.right]];
      // Los que faltaron se levantan sobre su grada; los vacíos del 29N, se desvanecen
      var lift = b.lift ? -HU * 0.9 : 0;
      var op = b.hollow ? 0.28 : 1;
      if (anim) {
        faces.forEach(function (fc) { gsap.to(fc[0], { attr: { fill: fc[1] }, duration: 0.5, delay: delay, ease: 'power2.out', overwrite: true }); });
        gsap.to(rec.blk, { y: lift, opacity: op, duration: 0.6, delay: delay, ease: b.lift ? 'back.out(2.2)' : 'power2.out', overwrite: true });
      } else {
        faces.forEach(function (fc) { fc[0].setAttribute('fill', fc[1]); });
        if (window.gsap) gsap.set(rec.blk, { y: lift, opacity: op });
        else { rec.blk.style.transform = 'translateY(' + lift + 'px)'; rec.blk.style.opacity = op; }
      }
    });

    var target = { a: st.line != null ? st.line : majAngle.a, o: st.line != null ? 1 : 0 };
    if (anim) gsap.to(majAngle, { a: target.a, o: target.o, duration: 0.9, ease: 'power3.inOut', onUpdate: drawMajority, overwrite: true });
    else { majAngle.a = target.a; majAngle.o = target.o; drawMajority(); }

    var num = document.getElementById('stage-number');
    var cap = document.getElementById('stage-caption');
    cap.textContent = st.caption;
    if (anim) {
      gsap.to(readoutState, { v: st.number, duration: 0.8, ease: 'power3.out', overwrite: true, onUpdate: function () { num.textContent = Math.round(readoutState.v); } });
      gsap.fromTo(cap, { y: 8 }, { y: 0, duration: 0.4, ease: 'power2.out' });
    } else { readoutState.v = st.number; num.textContent = st.number; }

    var seen = {};
    document.getElementById('stage-legend').innerHTML = st.blocks.filter(function (b) {
      if (seen[b.name]) return false; seen[b.name] = 1; return true;
    }).slice().sort(function (a, b) { return b.n - a.n; }).map(function (b) {
      var sw = b.hollow ? 'background:transparent;border:1.5px solid currentColor' : '--hemi-swatch-color:' + b.color;
      return '<li class="hemi-legend__item"><span class="hemi-swatch" style="' + sw + '"></span>' + b.name + ' <strong>' + b.n + '</strong></li>';
    }).join('');

    document.querySelectorAll('.hemi-step').forEach(function (n) { n.classList.toggle('is-active', n.dataset.step === key); });
  }

  // ════════════════════════════════════════════════════════════════════════
  // LA URNA · 29N. Urna transparente; los sobres caen por la ranura y se apilan
  // ════════════════════════════════════════════════════════════════════════
  var URNA_U = 30;
  var urna = {};
  function buildUrn() {
    var svg = document.getElementById('urna');
    if (!svg) return;
    svg.innerHTML = '';
    el('title', { id: 'urna-title' }, svg).textContent = 'Urna electoral';
    el('desc', { id: 'urna-desc' }, svg).textContent = 'Urna transparente en isométrica; los sobres caen por la ranura y se apilan dentro.';
    var u = URNA_U, B = 3.2, H = 3.4;
    // Cara trasera del vidrio (vista a través del frontal)
    var back = el('g', { id: 'urna-fondo', 'data-iso-part': 'urna-fondo', class: 'iso-urn-back' }, svg);
    urna.back = [
      el('polygon', { points: isoPts([[0, 0, 0], [B, 0, 0], [B, 0, H], [0, 0, H]], u) }, back),
      el('polygon', { points: isoPts([[0, 0, 0], [0, B, 0], [0, B, H], [0, 0, H]], u) }, back),
      el('polygon', { points: isoPts([[0, 0, 0], [B, 0, 0], [B, B, 0], [0, B, 0]], u) }, back)
    ];
    // Pila de sobres (crece en el bucle)
    urna.pile = el('g', { id: 'urna-pila', 'data-iso-part': 'urna-pila', class: 'iso-urn-pile' }, svg);
    urna.sheets = [];
    for (var i = 0; i < 9; i++) {
      var f = boxFaces(0.45, 0.6, 0.02 + i * 0.13, 2.3, 2, 0.1, u);
      var g = el('g', { class: 'iso-urn-sheet' }, urna.pile);
      urna.sheets.push({ g: g, left: el('polygon', { points: f.left }, g), right: el('polygon', { points: f.right }, g), top: el('polygon', { points: f.top }, g) });
    }
    // Frente del vidrio
    var front = el('g', { id: 'urna-vidrio', 'data-iso-part': 'urna-vidrio', class: 'iso-urn-glass' }, svg);
    var gf = boxFaces(0, 0, 0, B, B, H, u);
    urna.glassL = el('polygon', { class: 'face-left', points: gf.left }, front);
    urna.glassR = el('polygon', { class: 'face-right', points: gf.right }, front);
    // Tapa con ranura
    var lid = el('g', { id: 'urna-tapa', 'data-iso-part': 'urna-tapa', class: 'iso-urn-lid' }, svg);
    var lf = boxFaces(-0.15, -0.15, H, B + 0.3, B + 0.3, 0.35, u);
    urna.lidL = el('polygon', { class: 'face-left', points: lf.left }, lid);
    urna.lidR = el('polygon', { class: 'face-right', points: lf.right }, lid);
    urna.lidT = el('polygon', { class: 'face-top', points: lf.top }, lid);
    urna.slot = el('polygon', { class: 'iso-urn-slot', points: isoPts([[0.55, 1.5, H + 0.351], [2.65, 1.5, H + 0.351], [2.65, 1.72, H + 0.351], [0.55, 1.72, H + 0.351]], u) }, lid);
    // Sobre que cae (de canto, paralelo al eje x, centrado en la ranura)
    // Recorte: el sobre solo se ve por encima del plano de la tapa (entra por la ranura)
    var defs = el('defs', {}, svg);
    var clip = el('clipPath', { id: 'urna-clip', clipPathUnits: 'userSpaceOnUse' }, defs);
    var a1 = isoP(-4, 1.61, H + 0.35, u), a2 = isoP(B + 4, 1.61, H + 0.35, u);
    var cp = [a1, a2, [a2[0], a2[1] - 400], [a1[0], a1[1] - 400]].map(function (q) { return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' ');
    el('polygon', { points: cp }, clip);
    var dropClip = el('g', { 'clip-path': 'url(#urna-clip)' }, svg);
    var dropPart = el('g', { id: 'sobre', 'data-iso-part': 'sobre', class: 'iso-urn-envelope' }, dropClip);
    urna.drop = el('g', { class: 'iso-urn-envelope__move' }, dropPart);
    var ef = boxFaces(0.8, 1.56, H + 0.5, 1.6, 0.1, 1.15, u);
    urna.dropL = el('polygon', { class: 'face-left', points: ef.left }, urna.drop);
    urna.dropR = el('polygon', { class: 'face-right', points: ef.right }, urna.drop);
    urna.dropT = el('polygon', { class: 'face-top', points: ef.top }, urna.drop);
    // viewBox
    var corners = [[-0.15, B + 0.15, 0], [B + 0.15, -0.15, 0], [B + 0.15, B + 0.15, 0], [-0.2, -0.2, H + 0.5 + 1.15 + 1.2]];
    var xs = [], ys = [];
    corners.forEach(function (p) { var q = isoP(p[0], p[1], p[2], u); xs.push(q[0]); ys.push(q[1]); });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    svg.setAttribute('viewBox', [minX - 4, minY - 4, maxX - minX + 8, maxY - minY + 8].map(function (v) { return v.toFixed(1); }).join(' '));
    paintUrn();
    urnRest();
  }
  function paintUrn() {
    if (!urna.back) return;
    var svg = document.getElementById('urna');
    isoVars(svg, 'papel', rgbToHex(T.onEmphasis));
    isoVars(svg, 'voto', rgbToHex(T.marker));
    svg.style.setProperty('--hemi-iso-ranura', rgbToHex(T.emphasisBg));
    var glass = function (p, face, op, sw) {
      p.setAttribute('style', 'fill:var(--hemi-iso-papel-' + face + ');fill-opacity:' + op + ';stroke:var(--hemi-iso-papel-top);stroke-opacity:' + (sw > 1 ? 0.85 : 0.35) + ';stroke-width:' + sw + ';stroke-linejoin:round');
    };
    urna.back.forEach(function (p) { glass(p, 'right', 0.07, 1); });
    glass(urna.glassL, 'left', 0.1, 1.5);
    glass(urna.glassR, 'right', 0.1, 1.5);
    urna.sheets.forEach(function (sh) { fillVar(sh.top, 'voto', 'top'); fillVar(sh.left, 'voto', 'left'); fillVar(sh.right, 'voto', 'right'); });
    fillVar(urna.lidT, 'papel', 'top'); fillVar(urna.lidL, 'papel', 'left'); fillVar(urna.lidR, 'papel', 'right');
    urna.slot.setAttribute('style', 'fill:var(--hemi-iso-ranura)');
    fillVar(urna.dropT, 'voto', 'top'); fillVar(urna.dropL, 'voto', 'left'); fillVar(urna.dropR, 'voto', 'right');
  }
  // Estado en reposo: urna con cinco sobres dentro y uno a punto de entrar
  function urnRest() {
    urna.sheets.forEach(function (s, i) { s.g.style.opacity = i < 5 ? 1 : 0; });
  }
  var urnTl = null;
  function animateUrn() {
    if (!urna.drop || !window.gsap) return;
    var fall = URNA_U * 1.75; // la altura que cae, en px (eje z proyectado: 0, −u)
    urnTl = gsap.timeline({ repeat: -1, paused: true, repeatDelay: 0.4 });
    urnTl.set(urna.sheets.map(function (s) { return s.g; }), { opacity: 0 });
    urna.sheets.forEach(function (s, i) {
      urnTl.fromTo(urna.drop, { y: -24, opacity: 0 }, { y: -12, opacity: 1, duration: 0.25, ease: 'power1.out' })
        .to(urna.drop, { y: fall, duration: 0.5, ease: 'power2.in' })
        .set(urna.drop, { opacity: 0 })
        .fromTo(s.g, { y: -10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'back.out(2)' }, '<')
        .to({}, { duration: 0.15 });
    });
    urnTl.to(urna.sheets.map(function (s) { return s.g; }), { opacity: 0, duration: 0.5, stagger: 0.03 }, '+=0.8');
    return urnTl;
  }

  // ════════════════════════════════════════════════════════════════════════
  // PALOTES · 350 marcas de recuento, en grupos de cinco
  // ════════════════════════════════════════════════════════════════════════
  var tallyLines = [];
  function buildTally() {
    var svg = document.querySelector('.hemi-tally');
    if (!svg) return;
    var W = Math.max(280, svg.clientWidth || 320);
    var GW = 26, GH = 34, groups = 70;
    var perRow = Math.max(1, Math.floor(W / GW));
    var rows = Math.ceil(groups / perRow);
    var gw = W / perRow;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + rows * GH);
    svg.style.blockSize = rows * GH + 'px';
    svg.innerHTML = '';
    tallyLines = [];
    for (var g = 0; g < groups; g++) {
      var x0 = (g % perRow) * gw + gw * 0.12, y0 = Math.floor(g / perRow) * GH + 5, h = GH - 12, step = gw * 0.16;
      for (var k = 0; k < 5; k++) {
        var l = document.createElementNS(SVGNS, 'line');
        if (k < 4) { l.setAttribute('x1', x0 + k * step); l.setAttribute('y1', y0); l.setAttribute('x2', x0 + k * step + 1); l.setAttribute('y2', y0 + h); }
        else { l.setAttribute('x1', x0 - step * 0.5); l.setAttribute('y1', y0 + h * 0.8); l.setAttribute('x2', x0 + step * 3.6); l.setAttribute('y2', y0 + h * 0.2); }
        l.setAttribute('stroke', 'currentColor');
        l.setAttribute('stroke-width', k < 4 ? 2.2 : 2.6);
        l.setAttribute('stroke-linecap', 'round');
        l.setAttribute('pathLength', 1);
        l.setAttribute('stroke-dasharray', 1);
        l.setAttribute('stroke-dashoffset', 0);
        svg.appendChild(l);
        tallyLines.push(l);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // PANELES POR PARTIDO
  // ════════════════════════════════════════════════════════════════════════
  var PANEL_TEXT = {
    pp: 'Primera fuerza y la mayor subida de la noche. Ganó en votos y en escaños, pero no sumó apoyos para gobernar.',
    psoe: 'Segunda fuerza, un escaño más que en 2019. Formó gobierno de coalición con Sumar.',
    vox: 'Tercera fuerza pese a perder 19 escaños. Votó sí a Feijóo.',
    sumar: 'La coalición a la izquierda del PSOE: 31 escaños, siete menos que la suma de sus partidos en 2019.'
  };
  function buildPanels() {
    var track = document.getElementById('panels-track');
    var html = ['pp', 'psoe', 'vox', 'sumar'].map(function (id, i) {
      var p = BY_ID[id];
      var seatPct = p.seats / TOTAL * 100;
      return '<article class="hemi-panel" data-party="' + id + '" style="--hemi-panel-bg:' + p.color + ';--hemi-panel-fg:' + inkOn(p.color) + '">' +
        '<div class="hemi-panel__top"><span>' + (i + 1) + '.ª fuerza · ' + nf2.format(p.pct) + ' % del voto</span><span>' + signed(p.d) + ' vs 2019</span></div>' +
        '<div><h3 class="hemi-panel__name">' + p.name + '</h3><span class="hemi-panel__numeral" data-count="' + p.seats + '">' + p.seats + '</span></div>' +
        '<div class="hemi-panel__facts"><p>' + PANEL_TEXT[id] + '</p>' +
        bar('Voto', p.pct) + bar('Escaños', seatPct) + '</div></article>';
    });
    var dec = ['erc', 'junts', 'bildu', 'pnv', 'bng', 'cc', 'upn'].map(function (id) { return BY_ID[id]; });
    html.push('<article class="hemi-panel" data-party="decisivos">' +
      '<div class="hemi-panel__top"><span>Siete partidos</span><span>28 escaños</span></div>' +
      '<div><h3 class="hemi-panel__name">Los que decidieron</h3><span class="hemi-panel__numeral" data-count="27">27</span></div>' +
      '<div class="hemi-panel__facts"><p>Síes de ERC, Junts, EH Bildu, PNV, BNG y CC a Sánchez. Sin ellos no hay investidura. UPN y CC votaron sí a Feijóo.</p>' +
      '<ul class="hemi-panel__list">' + dec.map(function (p) { return '<li><span>' + p.name + '</span><strong>' + p.seats + '</strong></li>'; }).join('') + '</ul></div></article>');
    track.innerHTML = html.join('');
    function bar(label, v) {
      return '<div class="hemi-panel__bar"><span>' + label + '</span><span class="hemi-panel__meter" style="transform:scaleX(' + (v / 40).toFixed(3) + ')"></span><span>' + nf1.format(v) + ' %</span></div>';
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // GRÁFICOS (ECharts)
  // ════════════════════════════════════════════════════════════════════════
  function tooltipBase() {
    return {
      backgroundColor: T.bg, borderColor: T.ink, borderWidth: 2, padding: [8, 12],
      textStyle: { color: T.ink, fontFamily: T.fontBody, fontSize: 13 },
      extraCssText: 'border-radius:0;box-shadow:none;'
    };
  }
  function axisText(size) { return { color: T.soft, fontFamily: T.fontMono, fontSize: size || 11 }; }

  function propOption() {
    var cats = byVotes.map(function (p) { return p.name; });
    var votes = byVotes.map(function (p) { return p.pct; });
    var seatsPct = byVotes.map(function (p) { return +(p.seats / TOTAL * 100).toFixed(2); });
    return {
      animation: !reduced, animationDuration: 1000, animationEasing: 'cubicOut',
      grid: { left: 70, right: 56, top: 36, bottom: 30 },
      legend: {
        top: 0, left: 0, itemWidth: 12, itemHeight: 12, icon: 'circle',
        textStyle: { color: T.soft, fontFamily: T.fontBody, fontSize: 12 },
        data: ['% del voto', '% de los escaños']
      },
      tooltip: Object.assign(tooltipBase(), {
        trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: T.subtle, opacity: 0.6 } },
        formatter: function (items) {
          var i = items[0].dataIndex, p = byVotes[i], gap = seatsPct[i] - votes[i];
          return '<strong>' + p.name + '</strong><br>Voto: ' + nf2.format(votes[i]) + ' %<br>Escaños: ' + nf2.format(seatsPct[i]) + ' % (' + p.seats + ')<br>' +
            (gap >= 0 ? 'Prima de ' : 'Pérdida de ') + nf1.format(Math.abs(gap)) + ' puntos';
        }
      }),
      xAxis: { type: 'value', min: 0, max: 40, interval: 10, axisLabel: Object.assign(axisText(), { formatter: '{value} %' }), splitLine: { lineStyle: { color: T.subtle } }, axisLine: { show: false } },
      yAxis: { type: 'category', data: cats, inverse: true, axisLabel: { color: T.ink, fontFamily: T.fontBody, fontSize: 13, fontWeight: 700 }, axisTick: { show: false }, axisLine: { lineStyle: { color: T.ink, width: 2 } } },
      series: [
        {
          type: 'custom', silent: true, z: 1,
          renderItem: function (params, api) {
            var a = api.coord([api.value(0), params.dataIndex]), b = api.coord([api.value(1), params.dataIndex]);
            var up = api.value(1) >= api.value(0);
            return { type: 'line', shape: { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, style: { stroke: up ? T.ink : T.strong, lineWidth: 4 } };
          },
          encode: { x: [0, 1], y: 2 },
          data: byVotes.map(function (p, i) { return [votes[i], seatsPct[i], i]; })
        },
        { name: '% del voto', type: 'scatter', z: 2, symbolSize: 14, itemStyle: { color: T.bg, borderColor: T.ink, borderWidth: 2.5 }, data: votes },
        {
          name: '% de los escaños', type: 'scatter', z: 3, symbolSize: 16,
          itemStyle: { color: T.ink, borderColor: T.bg, borderWidth: 2 },
          label: {
            show: true, position: 'right', distance: 10, color: T.ink, fontFamily: T.fontMono, fontSize: 12, fontWeight: 600,
            formatter: function (prm) { var i = prm.dataIndex; if (i > 3) return ''; var gap = seatsPct[i] - votes[i]; return (gap >= 0 ? '+' : '−') + nf1.format(Math.abs(gap)); }
          },
          data: seatsPct
        }
      ]
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // ESCENARIOS · cinco institutos (septiembre–octubre de 2026). Fuentes al pie.
  // ════════════════════════════════════════════════════════════════════════
  var XTRA = {
    podemos: { name: 'Podemos', color: '#6F3A8E' },
    salf: { name: 'SALF', color: '#B08A2E' },
    aa: { name: 'Adelante Andalucía', color: '#3D9A5B' },
    alianca: { name: 'Aliança.cat', color: '#2B4A7E' }
  };
  function pinfo(id) { return BY_ID[id] || XTRA[id]; }
  var POLLSTERS = [
    {
      id: 'cis', name: 'CIS', media: 'Centro de Investigaciones Sociológicas', field: '1–4 sep 2026', n: '4.042 entrevistas', symbol: 'circle',
      vote: { psoe: 31.0, pp: 25.5, vox: 16.6, sumar: 5.7, podemos: 3.7, erc: 2.5, salf: 1.8, bildu: 1.3, junts: 0.7, pnv: 0.7, bng: 0.7, cc: 0.2, upn: 0.1 },
      note: 'Barómetro público con estimación propia. No publica escaños.'
    },
    {
      id: '40db', name: '40dB', media: 'El País y Cadena SER', field: '25–28 sep 2026', n: '2.000 entrevistas', symbol: 'rect',
      vote: { pp: 31.6, psoe: 27.4, vox: 18.4, sumar: 5.6, podemos: 2.7, salf: 2.0 },
      note: 'Barómetro mensual. Este sondeo no proyecta escaños.'
    },
    {
      id: 'gad3', name: 'GAD3', media: 'ABC', field: '1–3 sep 2026', n: '1.010 entrevistas', symbol: 'triangle',
      vote: { pp: 31.1, psoe: 26.1, vox: 19.2, sumar: 7.0, podemos: 3.1, erc: 2.3, salf: 1.5, bildu: 1.5, junts: 1.2, aa: 1.0, pnv: 0.9, bng: 0.9, cc: 0.3, upn: 0.2 },
      seats: { pp: 133, psoe: 105, vox: 69, sumar: 9, podemos: 2, erc: 10, junts: 4, bildu: 7, pnv: 6, bng: 2, cc: 1, upn: 1, aa: 1 },
      note: 'Campo anterior al anuncio del adelanto.'
    },
    {
      id: 'sigma', name: 'Sigma Dos', media: 'El Mundo', field: '22 sep–1 oct 2026', n: '2.116 entrevistas · ±2,1 %', symbol: 'diamond',
      vote: { pp: 32.6, psoe: 25.6, vox: 18.3, sumar: 6.6, podemos: 3.3, erc: 2.5, bildu: 1.3, junts: 1.1, pnv: 1.0, alianca: 1.0, bng: 0.9, aa: 0.8, cc: 0.5, upn: 0.2 },
      seats: { pp: 140, psoe: 103, vox: 63, sumar: 9, podemos: 2, erc: 8, bildu: 6, junts: 4, pnv: 6, alianca: 3, bng: 2, aa: 2, cc: 1, upn: 1 }
    },
    {
      id: 'socio', name: 'SocioMétrica', media: 'El Español', field: '1–3 oct 2026', n: '1.000 entrevistas en línea · ±3,1 %', symbol: 'pin',
      vote: { pp: 33.4, psoe: 26.5, vox: 18.1, sumar: 5.3, podemos: 3.1, salf: 2.2, erc: 2.2, bildu: 1.3, junts: 1.2, aa: 1.0, pnv: 1.0, bng: 0.9, cc: 0.6, upn: 0.2 },
      seats: { pp: 143, psoe: 106, vox: 62, sumar: 6, podemos: 2, erc: 8, bildu: 7, junts: 5, pnv: 6, bng: 2, aa: 1, cc: 1, upn: 1 }
    }
  ];
  var RIGHT = ['pp', 'vox'];
  var INV23 = ['psoe', 'sumar', 'podemos', 'erc', 'junts', 'bildu', 'pnv', 'bng', 'cc'];
  var SEAT_ORDER = ['bildu', 'bng', 'erc', 'podemos', 'sumar', 'psoe', 'aa', 'pnv', 'junts', 'cc', 'alianca', 'upn', 'salf', 'pp', 'vox'];
  function sumOf(obj, ids) { return ids.reduce(function (a, id) { return a + (obj[id] || 0); }, 0); }
  var selectedPoll = 'sigma';

  function pollVerdict(p) {
    var v = p.vote, lead = v.pp >= v.psoe ? ['PP', v.pp - v.psoe] : ['PSOE', v.psoe - v.pp];
    if (!p.seats) {
      return 'Gana el ' + lead[0] + ' por ' + nf1.format(lead[1]) + ' puntos. En votos, PP y Vox suman el ' + nf1.format(sumOf(v, RIGHT)) +
        ' %; PSOE, Sumar y Podemos, el ' + nf1.format(sumOf(v, ['psoe', 'sumar', 'podemos'])) + ' %.';
    }
    var r = sumOf(p.seats, RIGHT), l = sumOf(p.seats, INV23);
    return 'Gana el ' + lead[0] + ' por ' + nf1.format(lead[1]) + ' puntos. PP y Vox suman ' + r + ' escaños' + (r >= MAJORITY ? ', mayoría absoluta' : ', sin mayoría') +
      '; el bloque de la investidura de 2023 se queda en ' + l + '.';
  }

  function seatStrip(p) {
    var html = SEAT_ORDER.filter(function (id) { return p.seats[id]; }).map(function (id) {
      var i = pinfo(id), n = p.seats[id];
      return '<span class="hemi-strip__seg" style="--hemi-strip-w:' + (n / TOTAL * 100).toFixed(3) + '%;--hemi-strip-c:' + i.color + '" title="' + i.name + ': ' + n + '"></span>';
    }).join('');
    return '<div class="hemi-strip" role="img" aria-label="Reparto de escaños de ' + p.name + ' de izquierda a derecha">' + html +
      '<span class="hemi-strip__majority" aria-hidden="true"><span>176</span></span></div>';
  }

  function blocRow(label, n, detail) {
    var ok = n >= MAJORITY;
    return '<li class="hemi-bloc"><span class="hemi-bloc__label">' + label + '<small>' + detail + '</small></span>' +
      '<span class="hemi-bloc__value">' + n + '</span>' +
      '<span class="atom-pill ' + (ok ? 'atom-pill--success' : 'atom-pill--neutral') + '">' + (ok ? 'Mayoría absoluta' : 'Faltan ' + (MAJORITY - n)) + '</span></li>';
  }

  function voteRows(p) {
    var ids = ['pp', 'psoe', 'vox', 'sumar', 'podemos'];
    return '<ul class="hemi-votes">' + ids.map(function (id) {
      var v = p.vote[id], ref = id === 'podemos' ? null : BY_ID[id] && BY_ID[id].pct;
      var diff = ref != null && id !== 'sumar' ? v - ref : null;
      return '<li class="hemi-votes__row"><span class="hemi-votes__name"><span class="hemi-swatch" style="--hemi-swatch-color:' + pinfo(id).color + '"></span>' + pinfo(id).name + '</span>' +
        '<span class="hemi-votes__bar"><span style="--hemi-vote-w:' + (v / 40 * 100).toFixed(2) + '%;--hemi-strip-c:' + pinfo(id).color + '"></span></span>' +
        '<span class="hemi-votes__pct">' + nf1.format(v) + ' %</span>' +
        '<span class="hemi-votes__diff">' + (diff == null ? '' : (diff >= 0 ? '+' : '−') + nf1.format(Math.abs(diff)) + ' vs 23J') + '</span></li>';
    }).join('') + '</ul>';
  }

  function buildPolls() {
    var tabs = document.getElementById('polls-tabs'), panels = document.getElementById('polls-panels');
    if (!tabs) return;
    tabs.innerHTML = POLLSTERS.map(function (p) {
      var sel = p.id === selectedPoll;
      return '<button class="mol-tabs__tab" type="button" role="tab" id="tab-' + p.id + '" aria-selected="' + sel + '" aria-controls="panel-' + p.id + '"' + (sel ? '' : ' tabindex="-1"') + '>' + p.name + '</button>';
    }).join('');
    panels.innerHTML = POLLSTERS.map(function (p) {
      var sel = p.id === selectedPoll;
      var body = '<div class="hemi-poll">' +
        '<div class="hemi-poll__head"><span class="hemi-label">' + p.media + ' · campo ' + p.field + ' · ' + p.n + '</span>' +
        '<p class="hemi-poll__verdict">' + pollVerdict(p) + '</p></div>' +
        '<div class="hemi-poll__grid"><div class="hemi-poll__col"><span class="hemi-label">Estimación de voto</span>' + voteRows(p) + '</div>' +
        '<div class="hemi-poll__col">' + (p.seats
          ? '<span class="hemi-label">Escaños proyectados</span>' + seatStrip(p) +
            '<ul class="hemi-blocs">' +
            blocRow('PP + Vox', sumOf(p.seats, RIGHT), 'PP ' + p.seats.pp + ' · Vox ' + p.seats.vox) +
            blocRow('Bloque de la investidura de 2023', sumOf(p.seats, INV23), 'PSOE, Sumar, Podemos, ERC, Junts, Bildu, PNV, BNG y CC') +
            blocRow('PP en solitario', p.seats.pp, 'sin apoyos') +
            '</ul>'
          : '<span class="hemi-label">Escaños</span><p class="hemi-prose">' + p.name + ' no proyecta escaños en este sondeo. El escenario se lee en votos.</p>') +
        (p.note ? '<p class="hemi-note">' + p.note + '</p>' : '') + '</div></div></div>';
      return '<div class="mol-tabs__panel" role="tabpanel" id="panel-' + p.id + '" aria-labelledby="tab-' + p.id + '" tabindex="0"' + (sel ? '' : ' hidden') + '>' + body + '</div>';
    }).join('');
    // La pestaña activa resalta su instituto en el gráfico de rango.
    // syx-tabs.js cambia aria-selected; se escucha ese cambio, no el clic.
    new MutationObserver(onPollChange).observe(tabs, { attributes: true, subtree: true, attributeFilter: ['aria-selected'] });
  }
  function onPollChange() {
    var t = document.querySelector('#polls-tabs [aria-selected="true"]');
    if (!t) return;
    var id = t.id.replace('tab-', '');
    if (id === selectedPoll) return;
    selectedPoll = id;
    CHARTS.forEach(function (x) { if ((x.id === 'chart-range' || x.id === 'chart-majority') && x.inst) x.inst.setOption(x.opt(), true); });
    if (window.gsap && !reduced) {
      var panel = document.getElementById('panel-' + id);
      gsap.from(panel.querySelectorAll('.hemi-strip__seg, .hemi-votes__bar span'), { scaleX: 0, transformOrigin: 'left center', duration: 0.6, ease: 'power3.out', stagger: 0.02 });
    }
  }

  // ── Rango entre institutos ─────────────────────────────────────────────
  // Por partido: banda mínimo–máximo en su color, media con su cifra, rombo
  // hueco del 23J y flecha del giro. Cada instituto es una línea (su «huella»)
  // que une sus cinco estimaciones; la del instituto activo va en rotulador.
  var RANGE_PARTIES = ['pp', 'psoe', 'vox', 'sumar', 'podemos'];
  function rangeStats() {
    return RANGE_PARTIES.map(function (id, i) {
      var vals = POLLSTERS.map(function (p) { return p.vote[id]; }).filter(function (v) { return v != null; });
      var mean = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
      var ref = ['pp', 'psoe', 'vox'].indexOf(id) >= 0 ? BY_ID[id].pct : null;
      return { id: id, i: i, min: Math.min.apply(null, vals), max: Math.max.apply(null, vals), mean: mean, ref: ref, color: pinfo(id).color };
    });
  }
  function selectPoll(id) {
    var t = document.getElementById('tab-' + id);
    if (t && t.getAttribute('aria-selected') !== 'true') t.click();
  }
  function rangeOption() {
    var st = rangeStats();
    var el = document.getElementById('chart-range');
    var narrow = (el && el.clientWidth || 600) < 520;
    var fs = narrow ? 11 : 13;
    var series = [];
    // 1 · Bandas de consenso
    series.push({
      name: 'banda', type: 'custom', silent: true, z: 1,
      renderItem: function (params, api) {
        var d = st[params.dataIndex];
        var a = api.coord([d.min, d.i]), b = api.coord([d.max, d.i]);
        var h = api.size([0, 1])[1] * 0.46;
        return { type: 'group', children: [
          { type: 'rect', shape: { x: a[0] - 6, y: a[1] - h / 2, width: Math.max(12, b[0] - a[0] + 12), height: h },
            style: { fill: d.color, opacity: 0.16 } },
          { type: 'rect', shape: { x: a[0] - 6, y: a[1] - h / 2, width: Math.max(12, b[0] - a[0] + 12), height: h },
            style: { fill: 'none', stroke: d.color, lineWidth: 1.5 } }
        ] };
      },
      data: st.map(function (d) { return [d.min, d.i]; })
    });
    // 2 · Giro desde el 23J hasta la media (flecha)
    series.push({
      name: 'giro', type: 'custom', silent: true, z: 3,
      renderItem: function (params, api) {
        var d = st[params.dataIndex];
        if (d.ref == null) return { type: 'group', children: [] };
        var h = api.size([0, 1])[1] * 0.46;
        var p0 = api.coord([d.ref, d.i]), p1 = api.coord([d.mean, d.i]);
        var y = p0[1] + h / 2 + 10, dir = p1[0] > p0[0] ? 1 : -1;
        var diff = d.mean - d.ref;
        return { type: 'group', children: [
          { type: 'line', shape: { x1: p0[0], y1: y, x2: p1[0] - dir * 6, y2: y }, style: { stroke: T.ink, lineWidth: 1.5 } },
          { type: 'polygon', shape: { points: [[p1[0], y], [p1[0] - dir * 8, y - 4.5], [p1[0] - dir * 8, y + 4.5]] }, style: { fill: T.ink } },
          { type: 'text', style: { text: (diff >= 0 ? '+' : '−') + nf1.format(Math.abs(diff)) + (narrow ? '' : ' desde el 23J'), x: (p0[0] + p1[0]) / 2, y: y + 5,
            textAlign: 'center', textVerticalAlign: 'top', fill: T.soft, font: '500 ' + (fs - 2) + 'px ' + T.fontMono } }
        ] };
      },
      data: st.map(function (d) { return [d.mean, d.i]; })
    });
    // 3 · Media: barra gruesa en el color del partido con su cifra
    series.push({
      name: 'Media', type: 'custom', z: 6,
      renderItem: function (params, api) {
        var d = st[params.dataIndex];
        var h = api.size([0, 1])[1] * 0.46, p = api.coord([d.mean, d.i]);
        return { type: 'group', children: [
          { type: 'rect', shape: { x: p[0] - 2.5, y: p[1] - h / 2 - 6, width: 5, height: h + 12 }, style: { fill: d.color, stroke: T.bg, lineWidth: 1.5 } },
          { type: 'text', style: { text: nf1.format(d.mean) + ' %', x: p[0], y: p[1] - h / 2 - 9, textAlign: 'center', textVerticalAlign: 'bottom',
            fill: T.ink, font: '800 ' + (fs + 5) + 'px ' + T.fontBody } }
        ] };
      },
      tooltip: { formatter: function (prm) { var d = st[prm.dataIndex]; return '<strong>' + pinfo(d.id).name + '</strong><br>Media de los institutos: ' + nf1.format(d.mean) + ' %<br>Rango: ' + nf1.format(d.min) + '–' + nf1.format(d.max) + ' %' + (d.ref != null ? '<br>23J: ' + nf2.format(d.ref) + ' %' : ''); } },
      data: st.map(function (d) { return [d.mean, d.i]; })
    });
    // 4 · 23J
    series.push({
      name: 'Resultado 23J', type: 'scatter', symbol: 'diamond', symbolSize: 13, z: 5,
      itemStyle: { color: T.bg, borderColor: T.ink, borderWidth: 2 },
      tooltip: { formatter: function (prm) { return '<strong>23J · ' + pinfo(RANGE_PARTIES[prm.value[1]]).name + '</strong><br>' + nf2.format(prm.value[0]) + ' %'; } },
      data: st.filter(function (d) { return d.ref != null; }).map(function (d) { return [d.ref, d.i]; })
    });
    // 5 · Huellas de los institutos
    POLLSTERS.forEach(function (p) {
      var on = p.id === selectedPoll;
      series.push({
        name: p.name, id: 'poll-' + p.id, type: 'line', symbol: p.symbol, symbolSize: on ? 15 : 9, z: on ? 8 : 4,
        lineStyle: { color: on ? T.ink : T.strong, width: on ? 2.5 : 1, type: on ? 'solid' : [3, 3], opacity: on ? 1 : 0.55 },
        itemStyle: { color: on ? T.marker : T.bg, borderColor: T.ink, borderWidth: on ? 2 : 1.2, opacity: on ? 1 : 0.85 },
        emphasis: { focus: 'series', lineStyle: { width: 2.5, opacity: 1 }, itemStyle: { opacity: 1 } },
        blur: { lineStyle: { opacity: 0.12 }, itemStyle: { opacity: 0.25 } },
        label: { show: false },
        tooltip: { formatter: function (prm) { return '<strong>' + p.name + '</strong> · ' + p.media + '<br>' + pinfo(RANGE_PARTIES[prm.value[1]]).name + ': ' + nf1.format(prm.value[0]) + ' %<br><span style="opacity:.7">Pulsa para ver su escenario</span>'; } },
        cursor: 'pointer',
        data: RANGE_PARTIES.map(function (id, i) { return p.vote[id] != null ? [p.vote[id], i] : null; }).filter(Boolean)
      });
    });
    return {
      animation: !reduced, animationDuration: 900, animationEasing: 'cubicOut',
      grid: { left: narrow ? 64 : 84, right: narrow ? 22 : 40, top: 64, bottom: 34 },
      legend: {
        top: 0, left: 0, itemWidth: 14, itemHeight: 12, itemGap: narrow ? 8 : 16,
        data: POLLSTERS.map(function (p) { return p.name; }).concat(['Resultado 23J']),
        textStyle: { color: T.soft, fontFamily: T.fontBody, fontSize: narrow ? 11 : 12 }
      },
      tooltip: Object.assign(tooltipBase(), { trigger: 'item' }),
      xAxis: { type: 'value', min: 0, max: 35, interval: narrow ? 10 : 5, axisLabel: Object.assign(axisText(), { formatter: '{value} %' }), splitLine: { lineStyle: { color: T.subtle } } },
      yAxis: { type: 'category', inverse: true, data: RANGE_PARTIES.map(function (id) { return pinfo(id).name; }),
        axisLabel: { color: T.ink, fontFamily: T.fontBody, fontSize: fs + 1, fontWeight: 800 }, axisTick: { show: false }, axisLine: { lineStyle: { color: T.ink, width: 2 } } },
      series: series
    };
  }

  // ── ¿Quién llega a 176? ─────────────────────────────────────────────────
  var SEAT_POLLS = POLLSTERS.filter(function (p) { return p.seats; });
  var BLOC_SEGS = [
    { bloc: 'der', id: 'pp', name: 'PP' }, { bloc: 'der', id: 'vox', name: 'Vox' },
    { bloc: 'izq', id: 'psoe', name: 'PSOE' }, { bloc: 'izq', id: 'sumar', name: 'Sumar' }, { bloc: 'izq', id: 'podemos', name: 'Podemos' },
    { bloc: 'izq', ids: ['erc', 'junts', 'bildu', 'pnv', 'bng', 'cc'], name: 'ERC, Junts, Bildu, PNV, BNG y CC' }
  ];
  function majorityOption() {
    var el = document.getElementById('chart-majority');
    var narrow = (el && el.clientWidth || 600) < 520;
    var cats = SEAT_POLLS.map(function (p) { return p.name; });
    var totals = { der: SEAT_POLLS.map(function (p) { return sumOf(p.seats, RIGHT); }), izq: SEAT_POLLS.map(function (p) { return sumOf(p.seats, INV23); }) };
    var lastOf = { der: 'Vox', izq: 'ERC, Junts, Bildu, PNV, BNG y CC' };
    var series = BLOC_SEGS.map(function (seg) {
      var color = seg.ids ? T.strong : pinfo(seg.id).color;
      return {
        name: seg.name, type: 'bar', stack: seg.bloc, barWidth: narrow ? 12 : 16, barGap: '35%',
        itemStyle: { color: color, borderColor: T.bg, borderWidth: 1 },
        emphasis: { focus: 'series' },
        data: SEAT_POLLS.map(function (p) {
          var v = seg.ids ? sumOf(p.seats, seg.ids) : (p.seats[seg.id] || 0);
          return { value: v, itemStyle: { opacity: p.id === selectedPoll ? 1 : 0.45 } };
        }),
        label: seg.name === lastOf[seg.bloc] ? {
          show: true, position: 'right', distance: 8, color: T.ink, fontFamily: T.fontBody, fontWeight: 800, fontSize: narrow ? 12 : 14,
          formatter: function (prm) {
            var n = totals[seg.bloc][prm.dataIndex];
            if (narrow) return n + (n >= MAJORITY ? ' ✓' : ' (−' + (MAJORITY - n) + ')');
            return (seg.bloc === 'der' ? 'PP + Vox ' : 'Bloque 2023 ') + n + (n >= MAJORITY ? '  ✓' : '  · faltan ' + (MAJORITY - n));
          }
        } : { show: false }
      };
    });
    series[0].markArea = {
      silent: true, itemStyle: { color: T.marker, opacity: 0.16 },
      label: { show: true, position: 'insideTopRight', color: T.ink, fontFamily: T.fontMono, fontSize: narrow ? 9 : 11, fontWeight: 700, formatter: narrow ? 'MAYORÍA' : 'MAYORÍA ABSOLUTA' },
      data: [[{ xAxis: MAJORITY }, { xAxis: narrow ? 240 : 260 }]]
    };
    series[0].markLine = {
      silent: true, symbol: 'none', lineStyle: { color: T.ink, type: [5, 4], width: 2 },
      label: { formatter: '176', position: 'end', color: T.ink, fontFamily: T.fontMono, fontWeight: 700 },
      data: [{ xAxis: MAJORITY }]
    };
    return {
      animation: !reduced, animationDuration: 900, animationDelay: function (i) { return i * 60; },
      grid: { left: narrow ? 84 : 110, right: narrow ? 52 : 16, top: 40, bottom: 28 },
      legend: { top: 0, left: 0, itemWidth: 12, itemHeight: 12, itemGap: 12, textStyle: { color: T.soft, fontFamily: T.fontBody, fontSize: 11 } },
      tooltip: Object.assign(tooltipBase(), {
        trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: T.subtle, opacity: 0.5 } },
        formatter: function (items) {
          var i = items[0].dataIndex, p = SEAT_POLLS[i];
          return '<strong>' + p.name + '</strong> · ' + p.media + '<br>PP + Vox: <strong>' + totals.der[i] + '</strong><br>Bloque de la investidura de 2023: <strong>' + totals.izq[i] + '</strong>';
        }
      }),
      xAxis: { type: 'value', min: 0, max: narrow ? 240 : 260, interval: narrow ? 100 : 50, axisLabel: Object.assign(axisText(), { formatter: function (v) { return narrow && v === 200 ? '' : v; } }), splitLine: { lineStyle: { color: T.subtle } } },
      yAxis: { type: 'category', inverse: true, data: cats, axisLabel: { color: T.ink, fontFamily: T.fontBody, fontWeight: 800, fontSize: narrow ? 12 : 14,
      }, axisTick: { show: false }, axisLine: { lineStyle: { color: T.ink, width: 2 } } },
      series: series
    };
  }

  var CHARTS = [{ id: 'chart-prop', opt: propOption }, { id: 'chart-range', opt: rangeOption }, { id: 'chart-majority', opt: majorityOption }];
  function renderChart(c, replay) {
    if (!window.echarts) return;
    if (!c.inst) c.inst = echarts.init(c.el, null, { renderer: 'canvas' });
    if (replay) c.inst.clear();
    c.inst.setOption(c.opt(), true);
  }

  // ════════════════════════════════════════════════════════════════════════
  // TABLA, CUENTA ATRÁS, CONTADOR DE ESCRUTINIO
  // ════════════════════════════════════════════════════════════════════════
  function buildTable() {
    document.getElementById('results-body').innerHTML = byVotes.map(function (p) {
      return '<tr><th class="atom-table__td" scope="row"><span class="hemi-table-swatch"><span class="hemi-swatch" style="--hemi-swatch-color:' + p.color + '"></span>' + p.name + '</span></th>' +
        '<td class="atom-table__td hemi-num">' + nf.format(p.votes) + '</td><td class="atom-table__td hemi-num">' + nf2.format(p.pct) + '</td>' +
        '<td class="atom-table__td hemi-num">' + p.seats + '</td><td class="atom-table__td hemi-num">' + signed(p.d) + '</td></tr>';
    }).join('');
  }

  function countdown() {
    var now = new Date();
    var day = new Date(2026, 10, 29);
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var days = Math.round((day - today) / 86400000);
    var n = document.getElementById('countdown'), u = document.getElementById('countdown-unit');
    if (days > 1) { n.textContent = days; u.textContent = 'días'; }
    else if (days === 1) { n.textContent = '1'; u.textContent = 'día'; }
    else if (days === 0) { n.textContent = 'Hoy'; u.textContent = 'se vota'; }
    else { n.textContent = '29N'; u.textContent = 'ya se votó'; }
    n.dataset.count = days > 1 ? days : '';
  }

  function scrutiny() {
    var el = document.getElementById('scrutiny'), bar = document.getElementById('scrutiny-bar');
    var tick = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
      el.textContent = nf2.format(p * 100) + ' %';
      bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    };
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
    tick();
  }

  // Titular a sangre: cada línea se escala hasta llenar el ancho exacto
  function fitHero() {
    var title = document.querySelector('.hemi-hero__title');
    if (!title) return;
    var W = title.parentElement.clientWidth - parseFloat(getComputedStyle(title.parentElement).paddingLeft) - parseFloat(getComputedStyle(title.parentElement).paddingRight);
    title.querySelectorAll('.hemi-hero__line > span').forEach(function (sp) {
      sp.style.removeProperty('--hemi-fit');
      var w = sp.getBoundingClientRect().width;
      if (!w) return;
      var ratio = Math.min(W / w, 1.35);
      sp.style.setProperty('--hemi-fit', (ratio * 0.995).toFixed(4) + 'em');
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // MONTAJE
  // ════════════════════════════════════════════════════════════════════════
  function boot() {
    readTheme();
    fitHero();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitHero(); if (window.ScrollTrigger) ScrollTrigger.refresh(); });
    buildHemicycle();
    applyStep('result', true);
    buildUrn();
    buildTally();
    buildPanels();
    buildTable();
    buildPolls();
    countdown();
    scrutiny();
    CHARTS.forEach(function (c) { c.el = document.getElementById(c.id); renderChart(c); });
    CHARTS.forEach(function (c) {
      if (!c.inst) return;
      if (c.id === 'chart-range') c.inst.on('click', function (prm) { if (prm.seriesId && prm.seriesId.indexOf('poll-') === 0) selectPoll(prm.seriesId.slice(5)); });
      if (c.id === 'chart-majority') c.inst.on('click', function (prm) { var p = SEAT_POLLS[prm.dataIndex]; if (p) selectPoll(p.id); });
    });

    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        CHARTS.forEach(function (c) {
          if (!c.inst) return;
          c.inst.resize();
          if (c.id === 'chart-range' || c.id === 'chart-majority') c.inst.setOption(c.opt(), true);
        });
        buildTally();
        fitHero();
      }, 150);
    });

    var retheme = function () {
      readTheme();
      shadeCache = {};
      paintStatic();
      paintUrn();
      applyStep(current, true);
      buildPanels();
      CHARTS.forEach(function (c) { renderChart(c); });
    };
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);

    // Pasos: con GSAP, ScrollTrigger; sin él, IntersectionObserver
    var steps = Array.prototype.slice.call(document.querySelectorAll('.hemi-step'));
    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      steps.forEach(function (el) {
        ScrollTrigger.create({
          trigger: el, start: 'top 62%', end: 'bottom 62%',
          onToggle: function (self) { if (self.isActive && current !== el.dataset.step) applyStep(el.dataset.step); }
        });
      });
      motion();
    } else if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) applyStep(e.target.dataset.step, true); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (el) { io.observe(el); });
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // MOVIMIENTO (GSAP) — solo sin prefers-reduced-motion
  // ════════════════════════════════════════════════════════════════════════
  function formatCount(el, v) {
    var dec = +(el.dataset.decimals || 0);
    var f = dec ? new Intl.NumberFormat('es-ES', { minimumFractionDigits: dec, maximumFractionDigits: dec }) : nf;
    return f.format(dec ? v : Math.round(v)) + (el.dataset.suffix || '');
  }
  function countUp(el, delay, dur) {
    var target = parseFloat(el.dataset.count);
    if (isNaN(target)) return;
    var o = { v: 0 };
    gsap.to(o, {
      v: target, duration: dur || 1.4, delay: delay || 0, ease: 'power3.out',
      onUpdate: function () { el.textContent = formatCount(el, o.v); },
      onComplete: function () { el.textContent = formatCount(el, target); }
    });
  }

  function motion() {
    var mm = gsap.matchMedia();
    // Paneles (primero: su pin desplaza todo lo que viene después): recorrido lateral desde 64rem y con movimiento permitido
    mm.add('(min-width: 64rem) and (prefers-reduced-motion: no-preference)', function () {
      var section = document.getElementById('panels');
      var track = document.getElementById('panels-track');
      var prog = document.getElementById('panels-progress');
      var panels = track.children.length;
      var header = function () { return document.querySelector('.hemi-header').offsetHeight; };
      var distance = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      section.classList.add('is-pinned');
      var tween = gsap.to(track, {
        x: function () { return -distance(); }, ease: 'none',
        scrollTrigger: {
          trigger: section, start: function () { return 'top ' + header(); }, end: function () { return '+=' + distance(); },
          pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) { prog.textContent = Math.min(panels, 1 + Math.floor(self.progress * panels * 0.999)) + ' / ' + panels; }
        }
      });
      gsap.utils.toArray('.hemi-panel__numeral').forEach(function (el) {
        ScrollTrigger.create({ trigger: el, containerAnimation: tween, start: 'left 90%', once: true, onEnter: function () { countUp(el, 0, 1.1); } });
      });
      return function () { section.classList.remove('is-pinned'); gsap.set(track, { clearProps: 'x' }); };
    });
    mm.add('(prefers-reduced-motion: no-preference)', function () {
      // Carga: el titular sube línea a línea, el rotulador tacha la palabra clave
      var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
      tl.from('.hemi-hero__line > span', { yPercent: 105, duration: 1, stagger: 0.14 })
        .from('.hemi-marker__ink', { scaleX: 0, duration: 0.8, ease: 'power3.inOut' }, '-=0.45')
        .from('.hemi-hero__foot', { y: 24, duration: 0.7 }, '-=0.6');
      document.querySelectorAll('.hemi-scoreboard [data-count]').forEach(function (el, i) { countUp(el, 0.7 + i * 0.1); });

      // Hemiciclo: los 350 escaños caen sobre sus gradas, de atrás hacia delante
      var seatEls = Array.prototype.slice.call(document.querySelectorAll('#hemicycle .iso-seat'));
      gsap.from(seatEls, {
        y: -46, opacity: 0, duration: 0.55, ease: 'back.out(1.4)', stagger: 0.0028, clearProps: 'transform',
        scrollTrigger: { trigger: '#hemicycle', start: 'top 85%', once: true }
      });
      gsap.from('#tribuna', { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', clearProps: 'transform', scrollTrigger: { trigger: '#hemicycle', start: 'top 85%', once: true } });

      // Urna: los sobres caen solo mientras se ve
      var tlU = animateUrn();
      if (tlU) ScrollTrigger.create({ trigger: '#urna', start: 'top 95%', end: 'bottom 5%', onToggle: function (self) { if (self.isActive) tlU.play(); else tlU.pause(); } });

      // Palotes: 350 marcas que se trazan con el scroll
      gsap.fromTo(tallyLines, { attr: { 'stroke-dashoffset': 1 } }, {
        attr: { 'stroke-dashoffset': 0 }, ease: 'none', stagger: 0.02,
        scrollTrigger: { trigger: '.hemi-tally', start: 'top 92%', end: 'bottom 40%', scrub: 0.5 }
      });

      // Títulos de sección
      gsap.utils.toArray('.hemi-reveal').forEach(function (el) {
        gsap.from(el, { yPercent: 40, duration: 0.9, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
      });

      // Gráficos: se vuelven a dibujar al entrar (ya están completos en reposo)
      CHARTS.forEach(function (c) {
        ScrollTrigger.create({ trigger: c.el, start: 'top 80%', once: true, onEnter: function () { renderChart(c, true); } });
      });

      // Cuenta atrás
      var cd = document.getElementById('countdown');
      ScrollTrigger.create({ trigger: cd, start: 'top 85%', once: true, onEnter: function () { countUp(cd, 0, 1.6); } });

      // Calendario
      gsap.fromTo('.hemi-timeline__rail', { scaleY: 0.04 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '#timeline', start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
      gsap.from('.hemi-timeline__item', { x: -14, duration: 0.5, stagger: 0.06, ease: 'power2.out', scrollTrigger: { trigger: '#timeline', start: 'top 82%' } });
    });


  }

  window.addEventListener('load', function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
