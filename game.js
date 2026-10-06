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
  tank:    { r: 27, hp: 420, spd: 42, dmg: 30, col: '#4cc9f0', xp: 8, pts: 120 },
  exploder:   { r: 12, hp: 30, spd: 135, dmg: 0, col: '#ff5a1f', xp: 3, pts: 35 },
  teleporter: { r: 11, hp: 38, spd: 85, dmg: 9, col: '#00e5a0', xp: 4, pts: 45 },
  shield:     { r: 15, hp: 80, spd: 78, dmg: 12, col: '#7aa2ff', xp: 5, pts: 55 }
};
const PUP = { heart: { i: '\u2764\uFE0F', c: '#ff4d6d' }, speed: { i: '\u26A1', c: '#ffd166' }, dmg: { i: '\u{1F525}', c: '#ff7b3a' },
  bomb: { i: '\u{1F4A5}', c: '#ffb347' }, magnet: { i: '\u{1F9F2}', c: '#00f0ff' }, slow: { i: '\u23F1\uFE0F', c: '#b388ff' } };
const PUP_BAG = ['heart', 'heart', 'speed', 'dmg', 'bomb', 'magnet', 'slow'];
const ELITE = ['armored', 'swift', 'volatile'];
const REW = [
  { i: '\u{1F4A0}', n: 'Titan Core', d: 'RARE: +60% damage', f: q => { q.dmg *= 1.6; } },
  { i: '\u{1F6E1}\uFE0F', n: 'Phase Armor', d: 'RARE: +60 max HP and full heal', f: q => { q.max += 60; q.hp = q.max; } },
  { i: '\u{1F300}', n: 'Nova Overdrive', d: 'ABILITY: bigger nova, 40% faster cooldown', f: q => { q.novaPlus++; q.spCd *= .6; } },
  { i: '\u{1FA7A}', n: 'Second Wind', d: 'ABILITY: revive once at 50% HP', f: q => { q.revive++; } },
  { i: '\u{1F680}', n: 'Overdrive', d: 'TEMPORARY: 30s of +60% damage and +40% speed', f: q => { q.buff.dmg = 30; q.buff.speed = 30; } },
  { i: '\u{1F52B}', n: 'Prototype Weapon', d: 'PERMANENT: swap to a random evolved weapon', f: q => {
    const ids = Object.keys(WPN).filter(k => k !== 'pistol' && k !== q.weapon); q.weapon = ids[RI(0, ids.length - 1)];
    banner('NEW WEAPON: ' + WPN[q.weapon].n, '#ffd166', 2.5); } }
];
const COST = { crawler: 1, swarm: 3, shooter: 2, brute: 4, tank: 8, exploder: 2, teleporter: 3, shield: 4 };
const BUILDS = { crit: { n: 'CRIT', c: '#ffd166' }, blast: { n: 'BLAST', c: '#ff7b3a' }, tank: { n: 'TANK', c: '#4cc9f0' } };
const UP = [
  { i: '\u26A1', n: 'Rapid Fire', d: '+25% fire rate', f: p => { p.rate *= 1.25; } },
  { i: '\u{1F4A5}', n: 'Heavy Rounds', d: '+40% damage', f: p => { p.dmg *= 1.4; } },
  { i: '\u{1F9F2}', n: 'Magnet', d: '+50% XP pickup radius', f: p => { p.mag += .5; } },
  { i: '\u2764\uFE0F', n: 'Reinforced Armor', d: '+30 max HP, heal 30', b: 'tank', f: p => { p.max += 30; p.hp = Math.min(p.max, p.hp + 30); } },
  { i: '\u{1F525}', n: 'Explosive Ammo', d: 'Bullets explode on impact (stacks)', b: 'blast', f: p => { p.expl++; } },
  { i: '\u{1F47B}', n: 'Dash Master', d: '-25% dash cooldown', f: p => { p.dashCd *= .75; } },
  { i: '\u{1F4A8}', n: 'Speed Boost', d: '+15% movement speed', f: p => { p.spd *= 1.15; } },
  { i: '\u{1F3AF}', n: 'Multishot', d: 'Chance to fire an extra bullet (stacks)', b: 'crit', f: p => { p.multi++; } },
  { i: '\u{1F4CC}', n: 'Piercing Rounds', d: 'Bullets pierce +1 enemy (stacks)', b: 'crit', f: p => { p.pierce++; } },
  { i: '\u{1F3B2}', n: 'Critical Chance', d: '+12% chance to crit (max 80%)', b: 'crit', ok: p => p.crit < .8, f: p => { p.crit = Math.min(.8, p.crit + .12); } },
  { i: '\u{1F5E1}\uFE0F', n: 'Critical Damage', d: 'Crits deal +60% more damage', b: 'crit', f: p => { p.critDmg += .6; } },
  { i: '\u{1F4A3}', n: 'Blast Radius', d: 'Explosions are 30% wider', b: 'blast', f: p => { p.blastR += .3; } },
  { i: '\u2622\uFE0F', n: 'Blast Payload', d: 'Explosions deal +50% damage', b: 'blast', f: p => { p.blastD += .5; } },
  { i: '\u{1F6E1}\uFE0F', n: 'Armor Plating', d: 'Take 10% less damage (max 60%)', b: 'tank', ok: p => p.armor < .6, f: p => { p.armor = Math.min(.6, p.armor + .1); } },
  { i: '\u{1F49A}', n: 'Regeneration', d: 'Heal 1.5 HP per second', b: 'tank', f: p => { p.regen += 1.5; } }
];
const SYN = [
  { id: 'deadeye', b: 'crit', at: 3, n: 'DEADEYE', d: 'Every 5th shot is a guaranteed crit', c: '#ffd166', test: bp => bp.crit >= 3 },
  { id: 'exec', b: 'crit', at: 5, n: 'EXECUTIONER', d: 'Crits finish enemies under 25% HP and refund 1s of Nova cooldown', c: '#ffd166', test: bp => bp.crit >= 5 },
  { id: 'chain', b: 'blast', at: 3, n: 'CHAIN REACTION', d: 'Enemies killed by an explosion explode too', c: '#ff7b3a', test: bp => bp.blast >= 3 },
  { id: 'napalm', b: 'blast', at: 5, n: 'NAPALM', d: 'Explosions set enemies on fire', c: '#ff7b3a', test: bp => bp.blast >= 5 },
  { id: 'bulwark', b: 'tank', at: 3, n: 'BULWARK', d: 'Getting hit unleashes a knockback shockwave', c: '#4cc9f0', test: bp => bp.tank >= 3 },
  { id: 'immovable', b: 'tank', at: 5, n: 'IMMOVABLE', d: 'Standing still: take 50% less damage, deal +40% damage', c: '#4cc9f0', test: bp => bp.tank >= 5 },
  { id: 'volatile', n: 'VOLATILE CRITS', d: 'HYBRID (Crit 3 + Blast 3): crits explode', c: '#ff2bd6', test: bp => bp.crit >= 3 && bp.blast >= 3 },
  { id: 'reactive', n: 'REACTIVE PLATING', d: 'HYBRID (Tank 3 + Blast 3): Bulwark is 50% bigger and explosive', c: '#ff2bd6', test: bp => bp.tank >= 3 && bp.blast >= 3 }
];
const WPN = {
  pistol:  { n: 'PISTOL', rate: 1, dmg: 1, spd: 1, spread: 0, r: 4, col: '#fff59d' },
  minigun: { n: 'MINIGUN', rate: 2.4, dmg: .65, spd: 1, spread: .1, r: 3, col: '#ffa94d' },
  cluster: { n: 'CLUSTER CANNON', rate: .5, dmg: 1.6, spd: .7, spread: 0, r: 8, col: '#ff2bd6' },
  rail:    { n: 'RAILGUN', rate: .4, dmg: 4, spd: 2.4, spread: 0, r: 5, col: '#9ffcff' }
};
const EVO = [
  { id: 'minigun', d: 'Hose enemies down: huge fire rate, slight spread.', need: { 'Rapid Fire': 2, 'Heavy Rounds': 1 } },
  { id: 'cluster', d: 'Slow shells burst into a blast plus 6 bomblets.', need: { 'Multishot': 1, 'Explosive Ammo': 2 } },
  { id: 'rail', d: 'Piercing beam that punches through every enemy.', need: { 'Heavy Rounds': 2, 'Piercing Rounds': 1 } }
];

/* ---------- Audio (Web Audio, no files) ---------- */
let ac, muted = false, best = 0, lastHit = 0, mTimer = null, mStep = 0;
try { muted = localStorage.getItem('ns.muted') === '1'; best = Number(localStorage.getItem('ns.best')) || 0; } catch (e) {}
function tone(f, d, type = 'square', v = .04, when = 0, slide = 0) {
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + when;
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + d);
  } catch (e) {}
}
const sfx = {
  shoot: w => tone(w === 'rail' ? 200 : w === 'cluster' ? 120 : w === 'minigun' ? 420 : 520, .06, 'square', .02, 0, -200),
  hit: () => tone(220, .05, 'square', .02),
  crit: () => { tone(880, .07, 'square', .025, 0, 400); tone(1320, .09, 'triangle', .02, .04); },
  syn: () => [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .05, i * .07)),
  kill: () => tone(300, .12, 'triangle', .04, 0, -200),
  boom: () => tone(80, .3, 'sawtooth', .06, 0, -40),
  hurt: () => tone(110, .25, 'sawtooth', .06, 0, -60),
  pick: () => { tone(660, .08, 'triangle', .04); tone(990, .1, 'triangle', .04, .07); },
  dash: () => tone(300, .15, 'sawtooth', .03, 0, 500),
  nova: () => tone(90, .5, 'sawtooth', .07, 0, 300),
  lvl: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .15, 'square', .04, i * .09)),
  warn: () => [0, .35, .7].forEach(t => tone(440, .25, 'sawtooth', .05, t, 150)),
  over: () => [330, 262, 196, 130].forEach((f, i) => tone(f, .25, 'sawtooth', .05, i * .15))
};
const BASS = [55, 55, 82.4, 55, 73.4, 55, 98, 82.4];
function musicStart() {
  if (mTimer) return;
  mTimer = setInterval(() => {
    if (muted || G.state !== 'play') return;
    const boss = G.enemies.some(e => e.boss), f = BASS[mStep % 8] * (boss ? 1.5 : 1);
    tone(f, .18, 'sawtooth', .035);
    if (mStep % 2 === 0) tone(f * 4, .06, 'square', .012, .02);
    if (mStep % 4 === 0) tone(60, .12, 'sine', .08, 0, -30);
    mStep++;
  }, 190);
}
function musicStop() { clearInterval(mTimer); mTimer = null; }
function setMute(m) {
  muted = m;
  try { localStorage.setItem('ns.muted', m ? '1' : '0'); } catch (e) {}
  document.querySelectorAll('.mute').forEach(b => { b.textContent = muted ? 'Sound: off' : 'Sound: on'; });
}
const STREAKS = { 10: 'KILLING SPREE', 25: 'RAMPAGE', 50: 'UNSTOPPABLE', 100: 'GODLIKE' };

/* ---------- Helpers ---------- */
function ui(name) { ['menu', 'lvl', 'pause', 'over'].forEach(id => { $(id).hidden = id !== name; }); }
function burst(x, y, col, n, spd = 160, life = .5) {
  for (let i = 0; i < n && G.fx.length < 700; i++) {
    const a = R(0, TAU), s = R(.3, 1) * spd;
    G.fx.push({ k: 'p', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, l: life, max: life, col, s: R(1.5, 3.5) });
  }
}
function ring(x, y, col, Rr, life = .35) { G.fx.push({ k: 'r', x, y, r: 0, R: Rr, l: life, max: life, col }); }
function banner(txt, col = '#00f0ff', t = 1.8, sub = '') { G.banner = { txt, col, l: t, max: t, sub }; }

/* ---------- Game flow ---------- */
function newGame() {
  Object.assign(G, { state: 'play', t: 0, wave: 0, kills: 0, score: 0, shake: 0, flash: 0, warn: 0, clearT: 0, spT: 0, banner: null,
    queue: [], enemies: [], bullets: [], eb: [], orbs: [], fx: [], pups: [], slowT: 0, reward: false, dn: [], combo: 0, comboT: 0, expDepth: 0, chainD: 0 });
  G.p = { x: W / 2, y: H / 2, r: 12, hp: 100, max: 100, spd: 260, dmg: 10, rate: 4, bspd: 760, cd: 0, dashCd: 2.2, dashRdy: 0, dashing: 0,
    dx: 1, dy: 0, ax: 1, ay: 0, inv: 0, spCd: 12, spRdy: 0, xp: 0, lvl: 1, need: 8, mag: 0, expl: 0, multi: 0, pierce: 0, weapon: 'pistol', ups: {}, revive: 0, novaPlus: 0, magT: 0, buff: { speed: 0, dmg: 0 },
    crit: 0, critDmg: 2, blastR: 1, blastD: 1, armor: 0, regen: 0, bp: { crit: 0, blast: 0, tank: 0 }, syn: {}, shots: 0, still: 0 };
  ui(null);
  musicStart();
  startWave(1);
}

function startWave(n) {
  G.wave = n; G.queue = []; G.hm = 1 + .14 * (n - 1); G.sm = Math.min(1.6, 1 + .03 * (n - 1));
  const pool = ['crawler'];
  if (n >= 2) pool.push('swarm'); if (n >= 3) pool.push('shooter'); if (n >= 4) pool.push('brute'); if (n >= 6) pool.push('tank');
  if (n >= 3) pool.push('exploder'); if (n >= 5) pool.push('teleporter'); if (n >= 7) pool.push('shield');
  let budget = 6 + n * 3, boss = n % 5 === 0;
  if (boss) budget = Math.floor(budget / 2);
  while (budget > 0) {
    let t = pool[RI(0, pool.length - 1)];
    if (COST[t] > budget) t = 'crawler';
    budget -= COST[t];
    if (t === 'swarm') for (let i = 0; i < 8; i++) G.queue.push('swarm'); else G.queue.push(t);
  }
  if (boss) { sfx.warn(); G.warn = 2.4; banner('WARNING: OVERLORD APPROACHING', '#ff2bd6', 2.4); } else banner('WAVE ' + n);
}

function spawn(type, x, y) {
  const t = T[type];
  if (x === undefined) {
    const s = RI(0, 3);
    if (s < 2) { x = s ? W + 20 : -20; y = R(0, H); } else { y = s === 2 ? -20 : H + 20; x = R(0, W); }
  }
  let hp = t.hp * G.hm, r = t.r, spd = t.spd * G.sm * R(.9, 1.1), xp = t.xp, pts = t.pts;
  const mod = type !== 'swarm' && Math.random() < Math.min(.25, .05 * (G.wave - 3)) ? ELITE[RI(0, 2)] : null;
  if (mod) { xp *= 3; pts *= 3; if (mod === 'armored') { hp *= 2.5; r *= 1.25; } if (mod === 'swift') spd *= 1.6; }
  G.enemies.push({ type, elite: mod, x, y, r, hp, max: hp, spd, dmg: t.dmg, col: t.col, xp, pts, hit: 0, cd: 0, fire: R(.5, 1.8), tp: R(1.5, 3), kx: 0, ky: 0 });
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
  if (p.syn.immovable && p.still > .4) d *= .5;
  d = Math.max(1, d * (1 - p.armor));
  sfx.hurt(); p.hp -= d; p.inv = .5; G.shake = Math.max(G.shake, 10); G.flash = .25;
  burst(p.x, p.y, '#ff4d6d', 10);
  if (p.syn.bulwark) bulwarkWave();
  if (p.hp <= 0 && p.revive > 0) { p.revive--; p.hp = p.max * .5; p.inv = 2; ring(p.x, p.y, '#7be0a0', 300, .6); banner('SECOND WIND', '#7be0a0', 1.5); return; }
  if (p.hp <= 0) {
    G.state = 'over'; musicStop(); sfx.over();
    const isNew = G.score > best;
    if (isNew) { best = G.score; try { localStorage.setItem('ns.best', String(best)); } catch (e) {} }
    $('o-best').textContent = (isNew ? 'NEW HIGH SCORE! ' : '') + best;
    $('o-score').textContent = G.score; $('o-wave').textContent = G.wave;
    $('o-lvl').textContent = p.lvl; $('o-kills').textContent = G.kills;
    ui('over'); $('b-again').focus();
  }
}

function hitEnemy(e, dmg, kx, ky, crit, quiet) {
  const p = G.p;
  if (crit && p.syn.exec && !e.boss && e.hp - dmg < e.max * .25) { dmg = Math.max(dmg, e.hp); p.spRdy = Math.max(0, p.spRdy - 1); }
  e.hp -= dmg; e.hit = .1;
  if (!quiet && dmg >= 1 && G.dn.length < 70) G.dn.push({ x: e.x + R(-8, 8), y: e.y - e.r, t: .7, txt: Math.round(dmg) + (crit ? '!' : ''), big: dmg >= 40 || crit, crit: !!crit });
  if (G.t - lastHit > .06) { lastHit = G.t; if (crit) sfx.crit(); else sfx.hit(); }
  if (!e.boss) { e.kx += kx; e.ky += ky; }
  if (e.hp <= 0 && !e.dead) kill(e);
}

function kill(e) {
  e.dead = true; G.kills++;
  G.combo++; G.comboT = 2.5;
  G.score += Math.round(e.pts * (1 + Math.min(1, Math.floor(G.combo / 10) * .1)));
  if (STREAKS[G.combo]) { banner(STREAKS[G.combo] + '!', '#ffd166', 1.4); sfx.pick(); }
  G.fx.push({ k: 'g', x: e.x, y: e.y, r: e.r, l: .25, max: .25 });
  if (e.boss) sfx.boom(); else sfx.kill();
  burst(e.x, e.y, e.col, e.boss ? 80 : 12, e.boss ? 400 : 180, e.boss ? 1 : .5);
  if (e.type === 'exploder' || e.elite === 'volatile') blast(e.x, e.y, e.type === 'exploder' ? 90 : 110, 25);
  if (G.expDepth > 0 && G.p.syn.chain && G.chainD < 5 && !e.boss) {
    G.chainD++; explode(e.x, e.y, G.p.dmg * 2.5, 80 * G.p.blastR, 1); G.chainD--;
  }
  if (!e.boss && (e.elite || Math.random() < .05)) G.pups.push({ x: e.x, y: e.y, k: PUP_BAG[RI(0, PUP_BAG.length - 1)], life: 12 });
  if (e.boss) {
    for (let i = 0; i < 14; i++) G.orbs.push({ x: e.x + R(-50, 50), y: e.y + R(-50, 50), v: 6 });
    G.shake = 30; G.score += 2000; G.p.hp = Math.min(G.p.max, G.p.hp + 40); G.reward = true;
    ring(e.x, e.y, '#fff', 400, .7); banner('OVERLORD DEFEATED', '#ffd166', 2.5);
  } else G.orbs.push({ x: e.x, y: e.y, v: e.xp });
}

function blast(x, y, rad, dmg) {
  const p = G.p;
  sfx.boom(); ring(x, y, '#ff7b3a', rad, .3); burst(x, y, '#ff7b3a', 20, 260, .4); G.shake = Math.max(G.shake, 8);
  if (Math.hypot(p.x - x, p.y - y) < rad + p.r) hurtPlayer(dmg);
  G.expDepth++;
  for (const e of G.enemies) if (!e.dead && !e.boss && Math.hypot(e.x - x, e.y - y) < rad + e.r) hitEnemy(e, 60, 0, 0);
  G.expDepth--;
}

function applyPup(k) {
  const p = G.p; sfx.pick();
  ring(p.x, p.y, PUP[k].c, 120, .4);
  if (k === 'heart') p.hp = Math.min(p.max, p.hp + 30);
  if (k === 'speed') p.buff.speed = 7;
  if (k === 'dmg') p.buff.dmg = 8;
  if (k === 'magnet') p.magT = 2;
  if (k === 'slow') G.slowT = 5;
  if (k === 'bomb') {
    ring(p.x, p.y, '#ffb347', 900, .5); G.shake = 20; G.eb = [];
    for (const e of G.enemies) if (!e.dead) hitEnemy(e, 150, 0, 0);
  }
}

function explode(x, y, dmg, rad = (40 + 12 * G.p.expl) * G.p.blastR, mult = .6) {
  const p = G.p;
  ring(x, y, '#ffb347', rad, .25);
  G.expDepth++;
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - x, e.y - y) < rad + e.r) {
    if (p.syn.napalm) e.burn = 3;
    hitEnemy(e, dmg * mult * p.blastD, 0, 0);
  }
  G.expDepth--;
}

function bulwarkWave() {
  const p = G.p, big = !!p.syn.reactive, rad = 170 * (big ? 1.5 : 1), dmg = (30 + p.lvl * 6) * (big ? 1.5 : 1);
  ring(p.x, p.y, '#4cc9f0', rad, .35); burst(p.x, p.y, '#4cc9f0', 18, 260, .4);
  G.eb = G.eb.filter(b => Math.hypot(b.x - p.x, b.y - p.y) > rad * .6);
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < rad + e.r) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    hitEnemy(e, dmg, Math.cos(a) * 500, Math.sin(a) * 500);
    if (big && !e.dead) explode(e.x, e.y, dmg, undefined, .5);
  }
}

function updateSyn() {
  const p = G.p, got = [];
  for (const s of SYN) if (!p.syn[s.id] && s.test(p.bp)) { p.syn[s.id] = 1; got.push(s); }
  if (!got.length) return;
  banner('SYNERGY: ' + got.map(s => s.n).join(' + '), got[0].c, 3, got.map(s => s.d).join('  |  '));
  sfx.syn(); G.shake = Math.max(G.shake, 12); ring(p.x, p.y, got[0].c, 320, .6); burst(p.x, p.y, got[0].c, 40, 300, .6);
}

function pickUps(n) {
  const p = G.p, pool = UP.filter(u => !u.ok || u.ok(p)).map(u => ({ u, w: 1 + (u.b && p.bp[u.b] >= 1 ? 1 + p.bp[u.b] * .5 : 0) })), out = [];
  while (out.length < n && pool.length) {
    let r = Math.random() * pool.reduce((t, x) => t + x.w, 0), i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0].u);
  }
  return out;
}

function special() {
  const p = G.p; p.spRdy = p.spCd; sfx.nova();
  const rad = 230 * (1 + .5 * p.novaPlus), dmg = 60 + p.lvl * 8;
  ring(p.x, p.y, '#00f0ff', rad, .4); burst(p.x, p.y, '#00f0ff', 40, 300, .5); G.shake = 12;
  for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < rad + e.r) {
    const a = Math.atan2(e.y - p.y, e.x - p.x);
    hitEnemy(e, dmg, Math.cos(a) * 400, Math.sin(a) * 400);
  }
  G.eb = G.eb.filter(b => Math.hypot(b.x - p.x, b.y - p.y) > rad);
}

function fire() {
  const p = G.p, w = WPN[p.weapon], a = Math.atan2(mouse.y - p.y, mouse.x - p.x);
  p.shots++;
  const sure = p.syn.deadeye && p.shots % 5 === 0, still = p.syn.immovable && p.still > .4 ? 1.4 : 1;
  const shoot = ang => {
    ang += R(-w.spread, w.spread); const s = p.bspd * w.spd, cr = sure || Math.random() < p.crit;
    G.bullets.push({ x: p.x + Math.cos(ang) * 18, y: p.y + Math.sin(ang) * 18, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s,
      dmg: p.dmg * w.dmg * still * (p.buff.dmg > 0 ? 1.6 : 1) * (cr ? p.critDmg : 1), life: p.weapon === 'rail' ? .8 : 1.1, r: w.r * (cr ? 1.35 : 1), col: cr ? '#ffd166' : w.col,
      crit: cr, cl: p.weapon === 'cluster', rail: p.weapon === 'rail', pierce: p.weapon === 'rail' ? 99 : p.pierce });
  };
  p.cd = 1 / (p.rate * w.rate);
  sfx.shoot(p.weapon);
  shoot(a);
  if (p.multi && Math.random() < Math.min(.9, .25 * p.multi)) shoot(a + (Math.random() < .5 ? -.16 : .16));
  if (p.weapon === 'rail' || p.weapon === 'cluster') G.shake = Math.max(G.shake, 4);
  burst(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, w.col, 3, 120, .12);
}

function checkLevel() {
  const p = G.p;
  if (p.xp < p.need) return;
  p.xp -= p.need; p.need = Math.round(p.need * 1.3 + 4); p.lvl++; sfx.lvl();
  const ready = p.weapon === 'pistol' ? EVO.filter(e => Object.keys(e.need).every(k => (p.ups[k] || 0) >= e.need[k])) : [];
  const evos = ready.map(e => ({ i: '\u2B50', n: 'EVOLVE: ' + WPN[e.id].n, d: e.d, evo: true, f: q => {
    q.weapon = e.id; G.shake = 25; ring(q.x, q.y, '#ffd166', 300, .6); burst(q.x, q.y, '#ffd166', 50, 300, .7);
    banner('WEAPON EVOLVED: ' + WPN[e.id].n, '#ffd166', 2.5); } }));
  const choices = evos.concat(pickUps(3 - evos.length));
  showCards('LEVEL UP: choose one', choices);
}

function openReward() {
  showCards('OVERLORD DEFEATED: claim a reward', REW.slice().sort(() => Math.random() - .5).slice(0, 3).map(r => Object.assign({ rw: true }, r)));
}

function showCards(title, choices) {
  const p = G.p, box = $('cards');
  G.state = 'lvl'; box.textContent = ''; $('lvl-title').textContent = title;
  choices.forEach((u, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn card' + (u.evo ? ' evo' : '');
    const n = document.createElement('b'); n.textContent = u.i + ' ' + u.n;
    const d = document.createElement('span'); d.textContent = u.d;
    const k = document.createElement('kbd'); k.textContent = 'Press ' + (i + 1);
    b.append(n, d);
    if (u.b) {
      const t = document.createElement('small'), nx = SYN.find(s => s.b === u.b && !p.syn[s.id]), need = nx ? nx.at : 0;
      t.textContent = BUILDS[u.b].n + ' BUILD ' + (nx ? (p.bp[u.b] + 1) + '/' + need + ' \u2192 ' + nx.n : 'MAXED'); t.style.color = BUILDS[u.b].c; b.append(t);
    }
    b.append(k);
    b.addEventListener('click', () => { u.f(p); if (!u.evo && !u.rw) { p.ups[u.n] = (p.ups[u.n] || 0) + 1; if (u.b) { p.bp[u.b]++; updateSyn(); } } G.state = 'play'; ui(null); p.inv = Math.max(p.inv, 1); checkLevel(); });
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
    p.dashRdy = p.dashCd; p.dashing = .16; sfx.dash(); p.inv = Math.max(p.inv, .25);
    p.dx = ml ? mx : p.ax; p.dy = ml ? my : p.ay;
  }
  if (keys.KeyE && p.spRdy <= 0) special();
  if (p.dashing > 0) { p.dashing -= dt; p.x += p.dx * 900 * dt; p.y += p.dy * 900 * dt; burst(p.x, p.y, '#00f0ff', 1, 20, .25); }
  else { const sp = p.spd * (p.buff.speed > 0 ? 1.4 : 1); p.x += mx * sp * dt; p.y += my * sp * dt; }
  p.x = Math.max(p.r, Math.min(W - p.r, p.x)); p.y = Math.max(p.r, Math.min(H - p.r, p.y));
  if (ml === 0 && p.dashing <= 0) p.still += dt; else p.still = 0;
  if (p.regen && p.hp < p.max) p.hp = Math.min(p.max, p.hp + p.regen * dt);
  const aa = Math.atan2(mouse.y - p.y, mouse.x - p.x); p.ax = Math.cos(aa); p.ay = Math.sin(aa);
  p.dashRdy = Math.max(0, p.dashRdy - dt); p.spRdy = Math.max(0, p.spRdy - dt); p.inv = Math.max(0, p.inv - dt);
  p.buff.speed = Math.max(0, p.buff.speed - dt); p.buff.dmg = Math.max(0, p.buff.dmg - dt); p.magT = Math.max(0, p.magT - dt); G.slowT = Math.max(0, G.slowT - dt);
  if ((G.comboT -= dt) <= 0) G.combo = 0;
  p.cd -= dt; if ((mouse.down || keys.KeyZ) && p.cd <= 0) fire();

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
      if (e.dead || (b.hits && b.hits.has(e)) || Math.hypot(e.x - b.x, e.y - b.y) > e.r + (b.r || 4)) continue;
      burst(b.x, b.y, e.col, 4, 140, .25);
      let dm = b.dmg;
      if (e.type === 'shield') {
        const f = Math.atan2(p.y - e.y, p.x - e.x), tr = Math.atan2(-b.vy, -b.vx); let df = Math.abs(f - tr); if (df > Math.PI) df = TAU - df;
        if (df < .9) { dm *= .15; burst(b.x, b.y, '#bcd0ff', 6, 200, .2); }
      }
      hitEnemy(e, dm, b.vx * .12, b.vy * .12, b.crit && dm === b.dmg);
      if (b.cl) {
        explode(b.x, b.y, b.dmg, 110 * p.blastR, 1);
        for (let i = 0; i < 6; i++) { const an = i / 6 * TAU + R(0, 1); G.bullets.push({ x: b.x, y: b.y, vx: Math.cos(an) * 380, vy: Math.sin(an) * 380, dmg: b.dmg * .4, life: .35, r: 4, col: '#ffa94d', hits: new Set([e]) }); }
      } else if (b.crit && p.syn.volatile) explode(b.x, b.y, b.dmg, undefined, .8);
      else if (p.expl) explode(b.x, b.y, b.dmg);
      if (b.pierce > 0) { b.pierce--; (b.hits = b.hits || new Set()).add(e); } else { b.dead = true; break; }
    }
  }
  // enemies (slow-mo affects enemies and their bullets only)
  const rdt = dt; if (G.slowT > 0) dt *= .45;
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.hit = Math.max(0, e.hit - dt); e.cd -= dt;
    if (e.burn > 0) {
      e.burn -= dt; e.bt = (e.bt || 0) - dt;
      if (Math.random() < dt * 10) burst(e.x, e.y, '#ff7b3a', 1, 40, .3);
      if (e.bt <= 0) { e.bt = .5; hitEnemy(e, p.dmg * .5, 0, 0, false, true); }
      if (e.dead) continue;
    }
    e.x += e.kx * dt; e.y += e.ky * dt; e.kx *= Math.pow(.02, dt); e.ky *= Math.pow(.02, dt);
    const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (e.boss) bossAI(e, dt);
    else if (e.type === 'shooter') {
      const dir = d > 320 ? 1 : d < 230 ? -1 : 0;
      e.x += dx / d * e.spd * dir * dt + -dy / d * e.spd * .5 * dt; e.y += dy / d * e.spd * dir * dt + dx / d * e.spd * .5 * dt;
      if ((e.fire -= dt) <= 0) { e.fire = 1.9; G.eb.push({ x: e.x, y: e.y, vx: dx / d * 280, vy: dy / d * 280, r: 5, dmg: e.dmg + 4, life: 5 }); }
    } else if (e.type === 'teleporter') {
      e.x += dx / d * e.spd * dt; e.y += dy / d * e.spd * dt;
      if ((e.tp -= dt) <= 0) {
        ring(e.x, e.y, '#00e5a0', 40, .3); const an = R(0, TAU), rr = R(160, 260);
        e.x = Math.max(20, Math.min(W - 20, p.x + Math.cos(an) * rr)); e.y = Math.max(20, Math.min(H - 20, p.y + Math.sin(an) * rr));
        e.tp = R(2.2, 3.5); ring(e.x, e.y, '#00e5a0', 40, .3);
      }
    } else { e.x += dx / d * e.spd * dt; e.y += dy / d * e.spd * dt; }
    if (e.type === 'exploder') { if (d < e.r + p.r + 6) kill(e); }
    else if (d < e.r + p.r && e.cd <= 0) { e.cd = .6; hurtPlayer(e.dmg); }
  }
  // enemy bullets
  for (const b of G.eb) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) { b.dead = true; continue; }
    if (Math.hypot(b.x - p.x, b.y - p.y) < b.r + p.r) { b.dead = true; hurtPlayer(b.dmg); }
  }
  dt = rdt;
  // xp orbs
  const pr = 70 * (1 + p.mag);
  for (const o of G.orbs) {
    const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
    if (d < pr || p.magT > 0) { o.x += dx / d * 450 * dt; o.y += dy / d * 450 * dt; }
    if (d < p.r + 8) { o.dead = true; p.xp += o.v; burst(p.x, p.y, '#00f0ff', 6, 100, .3); }
  }
  for (const u of G.pups) {
    u.life -= dt;
    if (u.life <= 0) u.dead = true;
    else if (Math.hypot(u.x - p.x, u.y - p.y) < p.r + 16) { u.dead = true; applyPup(u.k); }
  }
  for (const d of G.dn) { d.y -= 40 * dt; d.t -= dt; }
  G.dn = G.dn.filter(d => d.t > 0);
  // fx
  for (const f of G.fx) {
    f.l -= dt;
    if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; f.vy *= .96; } else if (f.k === 'r') f.r = f.R * (1 - f.l / f.max);
  }
  G.bullets = G.bullets.filter(b => !b.dead); G.eb = G.eb.filter(b => !b.dead);
  G.enemies = G.enemies.filter(e => !e.dead); G.orbs = G.orbs.filter(o => !o.dead); G.pups = G.pups.filter(u => !u.dead); G.fx = G.fx.filter(f => f.l > 0);
  G.shake = Math.max(0, G.shake - 50 * dt); G.flash = Math.max(0, G.flash - dt);
  if (G.banner && (G.banner.l -= dt) <= 0) G.banner = null;
  checkLevel();
  if (G.reward && G.state === 'play') { G.reward = false; openReward(); }
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
  for (const u of G.pups) {
    if (u.life < 3 && Math.floor(G.t * 8) % 2) continue;
    glow(PUP[u.k].c, 14); circ(u.x, u.y, 14, '#10162e'); ctx.strokeStyle = PUP[u.k].c; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(u.x, u.y, 14, 0, TAU); ctx.stroke(); glow('transparent', 0);
    ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(PUP[u.k].i, u.x, u.y + 6);
  }
  for (const e of G.enemies) {
    const col = e.hit > 0 ? '#fff' : e.col;
    if (e.boss) {
      glow(col, 30); circ(e.x, e.y, e.r, col); glow('transparent', 0); circ(e.x, e.y, e.r * .6, '#1a0620');
      circ(e.x - 16, e.y - 6, 7, '#ff2bd6'); circ(e.x + 16, e.y - 6, 7, '#ff2bd6');
    } else {
      circ(e.x, e.y, e.r, col);
      if (e.elite) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3; glow('#ffd166', 12); ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke(); glow('transparent', 0); }
      if (e.burn > 0) { ctx.strokeStyle = '#ff7b3a'; ctx.lineWidth = 2; glow('#ff7b3a', 10); ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 2, 0, TAU); ctx.stroke(); glow('transparent', 0); }
      if (e.type === 'shield') { const f = Math.atan2(G.p.y - e.y, G.p.x - e.x); ctx.strokeStyle = '#bcd0ff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8, f - .9, f + .9); ctx.stroke(); }
      if (e.type === 'exploder' && Math.floor(G.t * 8) % 2) circ(e.x, e.y, e.r * .5, '#fff');
      if (e.max > 60) { ctx.fillStyle = '#000'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2, 4); ctx.fillStyle = '#5ef38c'; ctx.fillRect(e.x - e.r, e.y - e.r - 8, e.r * 2 * e.hp / e.max, 4); } }
  }
  for (const b of G.bullets) {
    glow(b.col || '#fff59d', 12);
    if (b.rail) { ctx.strokeStyle = b.col; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(b.x - b.vx * .03, b.y - b.vy * .03); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    else circ(b.x, b.y, b.r || 4, b.col || '#fff59d');
  }
  glow('#ff4d6d', 10); for (const b of G.eb) circ(b.x, b.y, b.r, '#ff4d6d'); glow('transparent', 0);
  ctx.globalCompositeOperation = 'lighter';
  for (const f of G.fx) {
    ctx.globalAlpha = Math.max(0, f.l / f.max);
    if (f.k === 'p') { ctx.fillStyle = f.col; ctx.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); }
    else if (f.k === 'g') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (1 + (1 - f.l / f.max) * .8), 0, TAU); ctx.fill(); }
    else { ctx.strokeStyle = f.col; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.stroke(); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'center';
  for (const d of G.dn) { ctx.globalAlpha = Math.min(1, d.t / .3); ctx.font = d.crit ? 'bold 28px monospace' : d.big ? 'bold 22px monospace' : '14px monospace'; ctx.fillStyle = d.big ? '#ffd166' : '#fff'; ctx.fillText(d.txt, d.x, d.y); }
  ctx.globalAlpha = 1;
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
  { const fx = []; if (p.buff.speed > 0) fx.push('SPEED ' + Math.ceil(p.buff.speed) + 's'); if (p.buff.dmg > 0) fx.push('DAMAGE ' + Math.ceil(p.buff.dmg) + 's');
    if (G.slowT > 0) fx.push('SLOW-MO ' + Math.ceil(G.slowT) + 's'); if (p.revive > 0) fx.push('SECOND WIND'); if (p.syn.immovable && p.still > .4) fx.push('IMMOVABLE');
    ctx.font = '15px monospace'; ctx.fillStyle = '#ffd166'; ctx.fillText(fx.join('  '), 20, 92); ctx.font = '20px monospace'; ctx.fillStyle = '#dfe8ff'; }
  { ctx.font = '14px monospace'; ctx.textAlign = 'left'; let bx = 20;
    for (const k in BUILDS) { const t = BUILDS[k].n + ' ' + p.bp[k] + '   '; ctx.fillStyle = p.bp[k] ? BUILDS[k].c : '#46527a'; ctx.fillText(t, bx, 116); bx += ctx.measureText(t).width; }
    let sx2 = 20, sy2 = 136; ctx.fillStyle = '#ffd166';
    for (const sy of SYN) if (p.syn[sy.id]) { const t = sy.n + '  '; const w2 = ctx.measureText(t).width; if (sx2 + w2 > 460) { sx2 = 20; sy2 += 18; } ctx.fillStyle = sy.c; ctx.fillText(t, sx2, sy2); sx2 += w2; }
    ctx.font = '20px monospace'; ctx.fillStyle = '#dfe8ff'; }
  ctx.textAlign = 'center'; ctx.fillStyle = p.weapon === 'pistol' ? '#dfe8ff' : '#ffd166'; ctx.fillText('WEAPON: ' + WPN[p.weapon].n, W / 2, H - 28); ctx.textAlign = 'left'; ctx.fillStyle = '#dfe8ff';
  ctx.textAlign = 'right';
  ctx.fillText('SCORE ' + G.score.toLocaleString(), W - 20, 34); ctx.fillText('WAVE ' + G.wave, W - 20, 62);
  ctx.fillText('ENEMIES ' + (G.enemies.length + G.queue.length), W - 20, 90);
  if (G.combo >= 3) {
    const m = Math.round(Math.min(1, Math.floor(G.combo / 10) * .1) * 100);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 24px monospace'; ctx.fillText('COMBO x' + G.combo + (m ? ' (+' + m + '% score)' : ''), W - 20, 122);
    ctx.fillRect(W - 20 - 200 * Math.max(0, G.comboT / 2.5), 130, 200 * Math.max(0, G.comboT / 2.5), 4);
    ctx.font = '20px monospace'; ctx.fillStyle = '#dfe8ff';
  }
  const boss = G.enemies.find(e => e.boss);
  if (boss) { ctx.textAlign = 'center'; ctx.fillStyle = '#ff2bd6'; ctx.fillText('OVERLORD', W / 2, 36); bar(W / 2 - 350, 46, 700, 16, boss.hp / boss.max, '#ff2bd6'); }
  if (G.banner) {
    ctx.globalAlpha = Math.min(1, G.banner.l / .4); ctx.textAlign = 'center'; ctx.font = 'bold 44px monospace';
    glow(G.banner.col, 16); ctx.fillStyle = G.banner.col; ctx.fillText(G.banner.txt, W / 2, H * .3); glow('transparent', 0);
    if (G.banner.sub) { ctx.font = '20px monospace'; ctx.fillStyle = '#dfe8ff'; ctx.fillText(G.banner.sub, W / 2, H * .3 + 34); }
    ctx.globalAlpha = 1;
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
function fillBuild() {
  const p = G.p, box = $('p-build'); box.textContent = '';
  const add = (txt, col) => { const e = document.createElement('p'); e.textContent = txt; if (col) e.style.color = col; box.appendChild(e); };
  add('BUILD: ' + Object.keys(BUILDS).map(k => BUILDS[k].n + ' ' + p.bp[k]).join('  |  '), '#dfe8ff');
  const act = SYN.filter(s => p.syn[s.id]);
  if (act.length) act.forEach(s => add(s.n + ': ' + s.d, s.c)); else add('No synergies yet. Take 3 cards of one build (CRIT, BLAST or TANK).', '#7f8bb3');
  add('Crit ' + Math.round(p.crit * 100) + '% (x' + p.critDmg.toFixed(1) + ')  |  Blast radius +' + Math.round((p.blastR - 1) * 100) + '%, damage +' + Math.round((p.blastD - 1) * 100) + '%  |  Armor ' + Math.round(p.armor * 100) + '%  |  Regen ' + p.regen + '/s', '#7f8bb3');
}
function togglePause() {
  if (G.state === 'play') { G.state = 'pause'; fillBuild(); ui('pause'); $('b-resume').focus(); }
  else if (G.state === 'pause') { G.state = 'play'; ui(null); }
}
function toMenu() { G.state = 'menu'; G.p = null; G.enemies = []; G.bullets = []; G.eb = []; G.orbs = []; G.fx = []; G.pups = []; G.dn = []; G.banner = null; musicStop(); $('m-best').textContent = best; ui('menu'); $('b-start').focus(); }

window.addEventListener('keydown', e => {
  if (e.code === 'Space' || e.code.startsWith('Arrow')) { if (G.state === 'play') e.preventDefault(); }
  if (e.code === 'KeyP' && !e.repeat) togglePause();
  if (e.code === 'KeyM' && !e.repeat) setMute(!muted);
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

document.querySelectorAll('.mute').forEach(b => b.addEventListener('click', () => setMute(!muted)));
setMute(muted); $('m-best').textContent = best;
$('b-start').addEventListener('click', newGame);
$('b-again').addEventListener('click', newGame);
$('b-resume').addEventListener('click', togglePause);
$('b-pmenu').addEventListener('click', toMenu);
$('b-omenu').addEventListener('click', toMenu);
$('b-how').addEventListener('click', e => { const h = $('how'); h.hidden = !h.hidden; e.currentTarget.setAttribute('aria-expanded', String(!h.hidden)); });

window.__T = { hitEnemy, kill, explode, hurtPlayer, bulwarkWave, updateSyn, pickUps, spawn, update, fire, newGame, UP, SYN, BUILDS };
resize(); ui('menu'); $('b-start').focus();
requestAnimationFrame(frame);
})();
