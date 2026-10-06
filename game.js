(() => {
'use strict';
/* ---------- Setup ---------- */
const W = 1600, H = 1000, TAU = Math.PI * 2;
const $ = id => document.getElementById(id), cv = $('c'), ctx = cv.getContext('2d');
const R = (a, b) => a + Math.random() * (b - a), RI = (a, b) => Math.floor(R(a, b + 1));
const keys = {}, mouse = { x: W / 2, y: H / 2, down: false };
let scale = 1, offX = 0, offY = 0, dpr = 1, last = 0;
const G = { state: 'menu', p: null, enemies: [], bullets: [], eb: [], orbs: [], fx: [], queue: [], shake: 0, flash: 0, banner: null };
window.__G = G; // debug hook for testing

function resize() {
  dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = w * dpr; cv.height = h * dpr;
  scale = Math.min(w / W, h / H); offX = (w - W * scale) / 2; offY = (h - H * scale) / 2;
}

/* ---------- Data ---------- */
const T = {
  crawler: { r: 9, hp: 20, spd: 150, dmg: 8, col: '#ff4d6d', xp: 1, pts: 10 },
  swarm:   { r: 6, hp: 8, spd: 175, dmg: 4, col: '#5ef38c', xp: 1, pts: 5 },
  shooter: { r: 12, hp: 40, spd: 95, dmg: 6, col: '#b388ff', xp: 3, pts: 30 },
  brute:   { r: 18, hp: 130, spd: 70, dmg: 20, col: '#ff9f1c', xp: 4, pts: 50 },
  tank:    { r: 27, hp: 420, spd: 42, dmg: 30, col: '#4cc9f0', xp: 8, pts: 120 }
};
const COST = { crawler: 1, swarm: 3, shooter: 2, brute: 4, tank: 8 };
const UP = [
  { i: '\u26A1', n: 'Rapid Fire', d: '+25% fire rate', f: p => { p.rate *= 1.25; } },
  { i: '\u{1F4A5}', n: 'Heavy Rounds', d: '+40% damage', f: p => { p.dmg *= 1.4; } },
  { i: '\u{1F9F2}', n: 'Magnet', d: '+50% XP pickup radius', f: p => { p.mag += .5; } },
  { i: '\u2764\uFE0F', n: 'Reinforced Armor', d: '+30 max HP, heal 30', f: p => { p.max += 30; p.hp = Math.min(p.max, p.hp + 30); } },
  { i: '\u{1F525}', n: 'Explosive Ammo', d: 'Bullets explode on impact (stacks)', f: p => { p.expl++; } },
  { i: '\u{1F47B}', n: 'Dash Master', d: '-25% dash cooldown', f: p => { p.dashCd *= .75; } },
  { i: '\u{1F4A8}', n: 'Speed Boost', d: '+15% movement speed', f: p => { p.spd *= 1.15; } },
  { i: '\u{1F3AF}', n: 'Multishot', d: 'Chance to fire an extra bullet (stacks)', f: p => { p.multi++; } }
];

/* ---------- Helpers ---------- */
function ui(name) { ['menu', 'lvl', 'pause', 'over'].forEach(id => { $(id).hidden = id !== name; }); }
function burst(x, y, col, n, spd = 160, life = .5) {
  for (let i = 0; i < n && G.fx.length < 700; i++) {
    const a = R(0, TAU), s = R(.3, 1) * spd;
    G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: life, max: life, col, s: R(1.5, 3.5) });
  }
}
function ring(x, y, col, Rr, life = .35) { G.fx.push({ k: 'r', x, y, r: 0, R: Rr, l: life, max: life, col }); }
function banner(txt, col = '#00f0ff', t = 1.8) { G.banner = { txt, col, l: t, max: t }; }

/* ---------- Game flow ---------- */
function newGame() {
  Object.assign(G, { state: 'play', t: 0, wave: 0, kills: 0, score: 0, shake: 0, flash: 0, warn: 0, clearT: 0, spT: 0, banner: null,
    queue: [], enemies: [], bullets: [], eb: [], orbs: [], fx: [] });
  G.p = { x: W / 2, y: H / 2, r: 12, hp: 100, max: 100, spd: 260, dmg: 10, rate: 4, bspd: 760, cd: 0, dashCd: 2.2, dashRdy: 0, dashing: 0,
    dx: 1, dy: 0, ax: 1, ay: 0, inv: 0, spCd: 12, spRdy: 0, xp: 0, lvl: 1, need: 8, mag: 0, expl: 0, multi: 0 };
  ui(null);
  startWave(1);
}

function startWave(n) {
  G.wave = n; G.queue = []; G.hm = 1 + .14 * (n - 1); G.sm = Math.min(1.6, 1 + .03 * (n - 1));
  const pool = ['crawler'];
  if (n >= 2) pool.push('swarm'); if (n >= 3) pool.push('shooter'); if (n >= 4) pool.push('brute'); if (n >= 6) pool.push('tank');
  let budget = 6 + n * 3, boss = n % 5 === 0;
  if (boss) budget = Math.floor(budget / 2);
  while (budget > 0) {
    let t = pool[RI(0, pool.length - 1)];
    if (COST[t] > budget) t = 'crawler';
    budget -= COST[t];
    if (t === 'swarm') for (let i = 0; i < 8; i++) G.queue.push('swarm'); else G.queue.push(t);
  }
  if (boss) { G.warn = 2.4; banner('WARNING: OVERLORD APPROACHING', '#ff2bd6', 2.4); } else banner('WAVE ' + n);
}

function spawn(type, x, y) {
  const t = T[type];
  if (x === undefined) {
    const s = RI(0, 3);
    if (s < 2) { x = s ? W + 20 : -20; y = R(0, H); } else { y = s === 2 ? -20 : H + 20; x = R(0, W); }
  }
  const hp = t.hp * G.hm;
  G.enemies.push({ type, x, y, r: t.r, hp, max: hp, spd: t.spd * G.sm * R(.9, 1.1), dmg: t.dmg, col: t.col, xp: t.xp, pts: t.pts,
    hit: 0, cd: 0, fire: R(.5, 1.8), kx: 0, ky: 0 });
}

function spawnBoss() {
  const b = G.wave / 5, hp = 2500 * (1 + .6 * (b - 1));
  G.enemies.push({ type: 'boss', boss: true, x: W / 2, y: -80, r: 48, hp, max: hp, spd: 60, dmg: 25, col: '#ff2bd6', xp: 6, pts: 1500,
    hit: 0, cd: 0, kx: 0, ky: 0, ph: 0, a: 0, rot: 0, sp: 0, t0: 2, t1: 2, t2: 5, t3: 0 });
  G.shake = 20;
}

function hurtPlayer(d) {
  const p = G.p;
  if (p.inv > 0) return;
  p.hp -= d; p.inv = .5; G.shake = Math.max(G.shake, 10); G.flash = .25;
  burst(p.x, p.y, '#ff4d6d', 10);
  if (p.hp <= 0) {
    G.state = 'over';
    $('o-score').textContent = G.score; $('o-wave').textContent = G.wave;
    $('o-lvl').textContent = p.lvl; $('o-kills').textContent = G.kills;
    ui('over'); $('b-again').focus();
  }
}

function hitEnemy(e, dmg, kx, ky) {
  e.hp -= dmg; e.hit = .1;
  if (!e.boss) { e.kx += kx; e.ky += ky; }
  if (e.hp <= 0 && !e.dead) kill(e);
}

function kill(e) {
  e.dead = true; G.kills++; G.score += e.pts;
  burst(e.x, e.y, e.col, e.boss ? 80 : 12, e.boss ? 400 : 180, e.boss ? 1 : .5);
  if (e.boss) {
    for (let i = 0; i < 14; i++) G.orbs.push({ x: e.x + R(-50, 50), y: e.y + R(-50, 50), v: 6 });
    G.shake = 30; G.score += 2000; G.p.hp = Math.min(G.p.max, G.p.hp + 40);
    ring(e.x, e.y, '#fff', 400, .7); banner('OVERLORD DEFEATED', '#ffd166', 2.5);
  } else G.orbs.push({ x: e.x, y: e.y, v: e.xp });
}

function explode(x, y, dmg) {
  const rad = 40 + 12 * G.p.expl;
  ring(x, y, '#ffb347', rad, .25);
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < rad + e.r) hitEnemy(e, dmg * .6, 0, 0);
}

function special() {
  const p = G.p; p.spRdy = p.spCd;
  const rad = 230, dmg = 60 + p.lvl * 8;
  ring(p.x, p.y, '#00f0ff', rad, .4); burst(p.x, p.y, '#00f0ff', 40, 300, .5); G.shake = 12;
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < rad + e.r) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    hitEnemy(e, dmg, Math.cos(a) * 400, Math.sin(a) * 400);
  }
  G.eb = G.eb.filter(b => Math.hypot(b.x - p.x, b.y - p.y) > rad);
}

function fire() {
  const p = G.p, a = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  const shoot = ang => G.bullets.push({ x: p.x + Math.cos(ang) * 18, y: p.y + Math.sin(ang) * 18, vx: Math.cos(ang) * p.bspd, vy: Math.sin(ang) * p.bspd, dmg: p.dmg, life: 1.1 });
  shoot(a);
  if (p.multi && Math.random() < Math.min(.9, .25 * p.multi)) shoot(a + (Math.random() < .5 ? -.16 : .16));
  burst(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, '#fff59d', 3, 120, .12);
}

function checkLevel() {
  const p = G.p;
  if (p.xp < p.need) return;
  p.xp -= p.need; p.need = Math.round(p.need * 1.3 + 4); p.lvl++;
  G.state = 'lvl';
  const box = $('cards'); box.textContent = '';
  const choices = UP.slice().sort(() => Math.random() - .5).slice(0, 3);
  choices.forEach((u, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn card';
    const n = document.createElement('b'); n.textContent = u.i + ' ' + u.n;
    const d = document.createElement('span'); d.textContent = u.d;
    const k = document.createElement('kbd'); k.textContent = 'Press ' + (i + 1);
    b.append(n, d, k);
    b.addEventListener('click', () => { u.f(p); G.state = 'play'; ui(null); p.inv = Math.max(p.inv, 1); checkLevel(); });
    box.appendChild(b);
  });
  ui('lvl'); box.firstChild.focus();
}

/* ---------- Update ---------- */
function bossAI(e, dt) {
  const p = G.p, ph = e.hp > e.max * .75 ? 0 : e.hp > e.max * .5 ? 1 : e.hp > e.max * .25 ? 2 : 3;
  if (ph > e.ph) { e.ph = ph; G.shake = 20; ring(e.x, e.y, '#fff', 300, .5); banner('PHASE ' + (ph + 1), '#ff2bd6', 1.4); }
  let tx = p.x, ty = p.y, sp = e.spd;
  if (ph >= 2) { e.a += dt * (.5 + .2 * ph); tx = W / 2 + Math.cos(e.a) * 450; ty = H / 2 + Math.sin(e.a * 1.3) * 250; sp = 140; }
  const d = Math.hypot(tx - e.x, ty - e.y) || 1;
  if (ph >= 2 || d > 300) { e.x += (tx - e.x) / d * sp * dt; e.y += (ty - e.y) / d * sp * dt; }
  const bl = (a, s) => G.eb.push({ x: e.x, y: e.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r: 6, dmg: 12, life: 7 });
  if ((e.t0 -= dt) <= 0) { e.t0 = [2.6, 2.2, 1.9, 1.6][ph]; e.rot += .3; const n = 12 + ph * 4; for (let i = 0; i < n; i++) bl(e.rot + i / n * TAU, 220); }
  if (ph >= 1 && (e.t1 -= dt) <= 0) { e.t1 = 1.4; const a = Math.atan2(p.y - e.y, p.x - e.x); for (let i = -1; i <= 1; i++) bl(a + i * .22, 340); }
  if (ph >= 2 && (e.t2 -= dt) <= 0) { e.t2 = 5; for (let i = 0; i < 3; i++) spawn('crawler', e.x + R(-60, 60), e.y + R(-60, 60)); }
  if (ph === 3 && (e.t3 -= dt) <= 0) { e.t3 = .11; e.sp += .55; bl(e.sp, 250); }
}

function update(dt) {
  const p = G.p; G.t += dt;
  const k = c => keys[c[0]] || keys[c[1]];
  let mx = (k(['ArrowRight', 'KeyD']) ? 1 : 0) - (k(['ArrowLeft', 'KeyA']) ? 1 : 0), my = (k(['ArrowDown', 'KeyS']) ? 1 : 0) - (k(['ArrowUp', 'KeyW']) ? 1 : 0);
  const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
  if (keys.Space && p.dashRdy <= 0) {
    p.dashRdy = p.dashCd; p.dashing = .16; p.inv = Math.max(p.inv, .25);
    p.dx = ml ? mx : p.ax; p.dy = ml ? my : p.ay;
  }
  if (keys.KeyE && p.spRdy <= 0) special();
  if (p.dashing > 0) { p.dashing -= dt; p.x += p.dx * 900 * dt; p.y += p.dy * 900 * dt; burst(p.x, p.y, '#00f0ff', 1, 20, .25); }
  else { p.x += mx * p.spd * dt; p.y += my * p.spd * dt; }
  p.x = Math.max(p.r, Math.min(W - p.r, p.x)); p.y = Math.max(p.r, Math.min(H - p.r, p.y));
  const aa = Math.atan2(mouse.y - p.y, mouse.x - p.x); p.ax = Math.cos(aa); p.ay = Math.sin(aa);
  p.dashRdy = Math.max(0, p.dashRdy - dt); p.spRdy = Math.max(0, p.spRdy - dt); p.inv = Math.max(0, p.inv - dt);
  p.cd -= dt; if ((mouse.down || keys.KeyZ) && p.cd <= 0) { p.cd = 1 / p.rate; fire(); }

  // waves
  if (G.warn > 0) { G.warn -= dt; if (G.warn <= 0) spawnBoss(); }
  else if (G.queue.length) {
    G.spT -= dt;
    if (G.spT <= 0) { G.spT = Math.max(.2, .7 - .03 * G.wave); spawn(G.queue.pop()); }
  } else if (!G.enemies.length) {
    G.clearT += dt;
    if (G.clearT > 2) { G.clearT = 0; G.score += G.wave * 100; p.hp = Math.min(p.max, p.hp + 10); startWave(G.wave + 1); }
  }

  // bullets
  for (const b of G.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.x > W || b.y < 0 || b.y > H) { b.dead = true; continue; }
    for (const e of G.enemies) {
      if (e.dead || Math.hypot(e.x - b.x, e.y - b.y) > e.r + 4) continue;
      b.dead = true; burst(b.x, b.y, e.col, 4, 140, .25);
      hitEnemy(e, b.dmg, b.vx * .12, b.vy * .12);
      if (p.expl) explode(b.x, b.y, b.dmg);
      break;
    }
  }
  // enemies
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hit = Math.max(0, e.hit - dt); e.cd -= dt;
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.pow(.02, dt); e.ky *= Math.pow(.02, dt);
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (e.boss) bossAI(e, dt);
    else if (e.type === 'shooter') {
      const dir = d > 320 ? 1 : d < 230 ? -1 : 0;
      e.x += dx / d * e.spd * dir * dt + -dy / d * e.spd * .5 * dt; e.y += dy / d * e.spd * dir * dt + dx / d * e.spd * .5 * dt;
      if ((e.fire -= dt) <= 0) { e.fire = 1.9; G.eb.push({ x: e.x, y: e.y, vx: dx / d * 280, vy: dy / d * 280, r: 5, dmg: e.dmg + 4, life: 5 }); }
    } else { e.x += dx / d * e.spd * dt; e.y += dy / d * e.spd * dt; }
    if (d < e.r + p.r && e.cd <= 0) { e.cd = .6; hurtPlayer(e.dmg); }
  }
  // enemy bullets
  for (const b of G.eb) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) { b.dead = true; continue; }
    if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) { b.dead = true; hurtPlayer(b.dmg); }
  }
  // xp orbs
  const pr = 70 * (1 + p.mag);
  for (const o of G.orbs) {
    const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (d < pr) { o.x += dx / d * 450 * dt; o.y += dy / d * 450 * dt; }
    if (d < p.r + 8) { o.dead = true; p.xp += o.v; burst(p.x, p.y, '#00f0ff', 6, 100, .3); }
  }
  // fx
  for (const f of G.fx) {
    f.l -= dt;
    if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vy *= .96; } else f.r = f.R * (1 - f.l / f.max);
  }
  G.bullets = G.bullets.filter(b => !b.dead); G.eb = G.eb.filter(b => !b.dead);
  G.enemies = G.enemies.filter(e => !e.dead); G.orbs = G.orbs.filter(o => !o.dead); G.fx = G.fx.filter(f => f.l > 0);
  G.shake = Math.max(0, G.shake - 50 * dt); G.flash = Math.max(0, G.flash - dt);
  if (G.banner && (G.banner.l -= dt) <= 0) G.banner = null;
  checkLevel();
}

/* ---------- Render ---------- */
function glow(col, b) { ctx.shadowColor = col; ctx.shadowBlur = b; }
function circ(x, y, r, col) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function bar(x, y, w, h, f, col, label) {
  ctx.fillStyle = '#10162e'; ctx.fillRect(x, y, w, h); ctx.fillStyle = col; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, f)), h);
  ctx.strokeStyle = '#2a3a63'; ctx.strokeRect(x, y, w, h);
  if (label) { ctx.fillStyle = '#fff'; ctx.font = '13px monospace'; ctx.textAlign = 'left'; ctx.fillText(label, x + 6, y + h - 5); }
}

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#060813'; ctx.fillRect(0, 0, cv.width, cv.height);
  const sx = G.shake ? R(-G.shake, G.shake) : 0, sy = G.shake ? R(-G.shake, G.shake) : 0;
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (offX + sx * scale), dpr * (offY + sy * scale));
  ctx.fillStyle = '#0a0d1c'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(0,240,255,.07)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= W; x += 80) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y <= H; y += 80) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.strokeStyle = G.warn > 0 && Math.floor(G.t * 6) % 2 ? '#ff2bd6' : '#00f0ff'; ctx.lineWidth = 4; glow(ctx.strokeStyle, 14); ctx.strokeRect(2, 2, W - 4, H - 4); glow('transparent', 0);
  const p = G.p; if (!p) return;

  for (const o of G.orbs) { const s = 6 + Math.sin(G.t * 8 + o.x) * 1.5; glow('#00f0ff', 10); ctx.fillStyle = '#00f0ff'; ctx.beginPath(); ctx.moveTo(o.x, o.y - s); ctx.lineTo(o.x + s, o.y); ctx.lineTo(o.x, o.y + s); ctx.lineTo(o.x - s, o.y); ctx.fill(); }
  glow('transparent', 0);
  for (const e of G.enemies) {
    const col = e.hit > 0 ? '#fff' : e.col;
    if (e.boss) {
      glow(col, 30); circ(e.x, e.y, e.r, col); glow('transparent', 0); circ(e.x, e.y, e.r * .6, '#1a0620');
      circ(e.x - 16, e.y - 6, 7, '#ff2bd6'); circ(e.x + 16, e.y - 6, 7, '#ff2bd6');
    } else { circ(e.x, e.y, e.r, col); if (e.max > 60) { ctx.fillStyle = '#000'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 4); ctx.fillStyle = '#5ef38c'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * e.hp / e.max, 4); } }
  }
  glow('#fff59d', 10); for (const b of G.bullets) circ(b.x, b.y, 4, '#fff59d');
  glow('#ff4d6d', 10); for (const b of G.eb) circ(b.x, b.y, b.r, '#ff4d6d'); glow('transparent', 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const f of G.fx) {
    ctx.globalAlpha = Math.max(0, f.l / f.max);
    if (f.k === 'p') { ctx.fillStyle = f.col; ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); }
    else { ctx.strokeStyle = f.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (G.state !== 'over') {
    const blink = p.inv > 0 && p.dashing <= 0 && Math.floor(G.t * 20) % 2;
    ctx.globalAlpha = blink ? .35 : 1;
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 6; glow('#00f0ff', 16); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.ax * 24, p.y + p.ay * 24); ctx.stroke();
    circ(p.x, p.y, p.r, p.dashing > 0 ? '#fff' : '#00f0ff'); glow('transparent', 0); ctx.globalAlpha = 1;
  }

  // HUD (no shake)
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offX, dpr * offY);
  if (G.flash > 0) { ctx.fillStyle = 'rgba(255,40,80,' + G.flash * .8 + ')'; ctx.fillRect(0, 0, W, H); }
  bar(20, 20, 300, 22, p.hp / p.max, '#ff4d6d', 'HP ' + Math.ceil(p.hp) + '/' + p.max);
  bar(0, H - 14, W, 14, p.xp / p.need, '#00f0ff');
  bar(20, H - 70, 150, 14, 1 - p.dashRdy / p.dashCd, '#ffd166', 'DASH [SPACE]');
  bar(180, H - 70, 150, 14, 1 - p.spRdy / p.spCd, '#b388ff', 'NOVA [E]');
  ctx.fillStyle = '#dfe8ff'; ctx.font = '20px monospace'; ctx.textAlign = 'left';
  ctx.fillText('LEVEL ' + p.lvl, 20, 66);
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + G.score.toLocaleString(), W - 20, 34); ctx.fillText('WAVE ' + G.wave, W - 20, 62);
  ctx.fillText('ENEMIES ' + (G.enemies.length + G.queue.length), W - 20, 90);
  const boss = G.enemies.find(e => e.boss);
  if (boss) { ctx.textAlign = 'center'; ctx.fillStyle = '#ff2bd6'; ctx.fillText('OVERLORD', W / 2, 36); bar(W / 2 - 350, 46, 700, 16, boss.hp / boss.max, '#ff2bd6'); }
  if (G.banner) {
    ctx.globalAlpha = Math.min(1, G.banner.l / .4); ctx.textAlign = 'center'; ctx.font = 'bold 44px monospace';
    glow(G.banner.col, 16); ctx.fillStyle = G.banner.col; ctx.fillText(G.banner.txt, W / 2, H * .3); glow('transparent', 0); ctx.globalAlpha = 1;
  }
}

/* ---------- Loop ---------- */
function frame(ts) {
  const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
  if (G.state === 'play') update(dt);
  render();
  requestAnimationFrame(frame);
}

/* ---------- Input & UI ---------- */
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; ui('pause'); $('b-resume').focus(); }
  else if (G.state === 'pause') { G.state = 'play'; ui(null); }
}
function toMenu() { G.state = 'menu'; G.p = null; G.enemies = []; G.bullets = []; G.eb = []; G.orbs = []; G.fx = []; G.banner = null; ui('menu'); $('b-start').focus(); }

window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) { if (G.state === 'play') e.preventDefault(); }
  if (e.code === 'KeyP' && !e.repeat) togglePause();
  if (G.state === 'lvl' && /^Digit[123]$/.test(e.code)) { const b = $('cards').children[+e.code.slice(5) - 1]; if (b) b.click(); }
  keys[e.code] = G.state === 'play' || e.code === 'KeyP' ? true : keys[e.code];
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; if (G.state === 'play') togglePause(); });
cv.addEventListener('mousemove', e => { mouse.x = (e.clientX - offX) / scale; mouse.y = (e.clientY - offY) / scale; });
cv.addEventListener('mousedown', e => { if (e.button === 0) mouse.down = true; });
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('resize', resize);

$('b-start').addEventListener('click', newGame);
$('b-again').addEventListener('click', newGame);
$('b-resume').addEventListener('click', togglePause);
$('b-pmenu').addEventListener('click', toMenu);
$('b-omenu').addEventListener('click', toMenu);
$('b-how').addEventListener('click', e => { const h = $('how'); h.hidden = !h.hidden; e.currentTarget.setAttribute('aria-expanded', String(!h.hidden)); });

resize(); ui('menu'); $('b-start').focus();
requestAnimationFrame(frame);
})();
