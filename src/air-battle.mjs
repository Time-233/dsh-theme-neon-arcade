/* Original pixel-aircraft battle. No copyrighted game assets or external code. */
export const AIR_BATTLE_LIMITS = Object.freeze({enemies: 16, playerShots: 96, enemyShots: 128, particles: 100});

export class AirBattle {
  constructor({width = 960, height = 720, seed = 82171} = {}) {
    this.width = Math.max(240, width);
    this.height = Math.max(300, height);
    this.seed = seed >>> 0 || 1;
    this.time = 0;
    this.waveClock = 1.6;
    this.shotClock = .1;
    this.enemies = [];
    this.playerShots = [];
    this.enemyShots = [];
    this.particles = [];
    this.stats = {spawned: 0, destroyed: 0, playerShots: 0, enemyShots: 0, hits: 0, respawns: 0};
    this.manual = false;
    this.returning = false;
    this.player = {x: this.width / 2, y: this.height - 75, alive: true, invulnerable: 1.4, respawnIn: 0, radius: 12};
    this.stars = Array.from({length: 76}, () => ({x: this.random(), y: this.random(), depth: this.random()}));
    this.spawnWave(true);
  }
  random() {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  setManual(value) {
    const manual = Boolean(value);
    if (manual === this.manual) return;
    this.manual = manual;
    this.returning = !manual;
  }
  movePlayer(x, y) {
    if (!this.manual || !Number.isFinite(x) || !Number.isFinite(y)) return;
    this.player.x = Math.max(22, Math.min(this.width - 22, x));
    this.player.y = Math.max(30, Math.min(this.height - 30, y));
  }
  resize(width, height = this.height) {
    width = Math.max(240, width);
    height = Math.max(300, height);
    const sx = width / this.width, sy = height / this.height;
    for (const list of [this.enemies, this.playerShots, this.enemyShots, this.particles]) {
      for (const entity of list) {
        entity.x *= sx; entity.y *= sy;
        if (entity.baseX !== undefined) entity.baseX *= sx;
        if (entity.amplitude !== undefined) entity.amplitude *= sx;
      }
    }
    this.player.x *= sx; this.player.y *= sy;
    this.width = width; this.height = height;
    if (this.manual) this.movePlayer(this.player.x, this.player.y);
  }
  spawnWave(initial = false) {
    const count = Math.min(3 + Math.floor(this.random() * 3), AIR_BATTLE_LIMITS.enemies - this.enemies.length);
    for (let i = 0; i < count; i++) {
      const baseX = 30 + ((i + .35 + this.random() * .3) / count) * (this.width - 60);
      this.enemies.push({
        x: baseX, baseX, y: initial ? 34 + this.random() * 135 : -35 - i * 32,
        speed: 48 + this.random() * 28, amplitude: 14 + this.random() * 22,
        frequency: .7 + this.random() * .7, phase: this.random() * Math.PI * 2,
        fireIn: initial ? .4 + this.random() : .7 + this.random() * 1.1,
        type: Math.floor(this.random() * 3), radius: 13, dead: false
      });
      this.stats.spawned++;
    }
  }
  burst(x, y, friendly = false) {
    const available = AIR_BATTLE_LIMITS.particles - this.particles.length;
    for (let i = 0; i < Math.min(10, available); i++) {
      const angle = this.random() * Math.PI * 2, speed = 25 + this.random() * 70;
      const life = .2 + this.random() * .32;
      this.particles.push({x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life, maxLife: life, friendly});
    }
  }
  hitPlayer() {
    if (!this.player.alive || this.player.invulnerable > 0) return;
    this.player.alive = false;
    this.player.respawnIn = .85;
    this.stats.hits++;
    this.burst(this.player.x, this.player.y, true);
  }
  // Small fixed substeps make collision results stable across renderer frame rates.
  advance(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    let remaining = Math.min(seconds, .25);
    while (remaining > 1e-8) {
      const dt = Math.min(remaining, 1 / 120);
      this.step(dt); remaining -= dt;
    }
  }
  step(dt) {
    this.time += dt;
    const p = this.player;
    if (!this.manual) {
      const x = Math.max(22, Math.min(this.width - 22,
        this.width * (.5 + .29 * Math.sin(this.time * .48) + .055 * Math.sin(this.time * 1.17))));
      const y = this.height - 75 + Math.sin(this.time * .8) * 9;
      const blend = this.returning ? 1 - Math.exp(-dt * 4) : 1;
      p.x += (x - p.x) * blend; p.y += (y - p.y) * blend;
      if (Math.hypot(x - p.x, y - p.y) < 1) this.returning = false;
    }
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    if (!p.alive) {
      p.respawnIn -= dt;
      if (p.respawnIn <= 0) {
        p.alive = true; p.invulnerable = 1.6; this.shotClock = .1;
        this.stats.respawns++;
      }
    }
    this.waveClock -= dt;
    if (this.waveClock <= 0) {
      this.spawnWave();
      this.waveClock = 1.6 + this.random() * .7;
    }
    this.shotClock -= dt;
    if (p.alive && this.shotClock <= 0) {
      if (this.playerShots.length + 2 <= AIR_BATTLE_LIMITS.playerShots) {
        for (const side of [-1, 1]) this.playerShots.push({x: p.x + side * 9, y: p.y - 22, vx: 0, vy: -510, life: 2.2});
        this.stats.playerShots += 2;
      }
      this.shotClock = .19;
    }
    for (const enemy of this.enemies) {
      enemy.y += enemy.speed * dt;
      enemy.x = Math.max(18, Math.min(this.width - 18,
        enemy.baseX + Math.sin(this.time * enemy.frequency + enemy.phase) * enemy.amplitude));
      enemy.fireIn -= dt;
      if (enemy.y > 8 && enemy.y < this.height - 110 && enemy.fireIn <= 0) {
        const dx = p.x - enemy.x, dy = Math.max(60, p.y - enemy.y), length = Math.hypot(dx, dy);
        const speed = 125 + enemy.type * 14;
        const spreads = enemy.type === 2 ? [-.13, .13] : [0];
        for (const spread of spreads) {
          if (this.enemyShots.length >= AIR_BATTLE_LIMITS.enemyShots) break;
          const vx = dx / length, vy = dy / length;
          this.enemyShots.push({x: enemy.x, y: enemy.y + 18,
            vx: (vx * Math.cos(spread) - vy * Math.sin(spread)) * speed,
            vy: (vy * Math.cos(spread) + vx * Math.sin(spread)) * speed, life: 6});
          this.stats.enemyShots++;
        }
        enemy.fireIn = 1.35 + this.random() * 1.4;
      }
    }
    for (const shot of this.playerShots) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      for (const enemy of this.enemies) {
        if (!enemy.dead && shot.life > 0 && Math.abs(shot.x - enemy.x) < enemy.radius + 2 && Math.abs(shot.y - enemy.y) < enemy.radius + 5) {
          enemy.dead = true; shot.life = 0; this.stats.destroyed++;
          this.burst(enemy.x, enemy.y);
          break;
        }
      }
    }
    for (const shot of this.enemyShots) {
      shot.x += shot.vx * dt; shot.y += shot.vy * dt; shot.life -= dt;
      if (p.alive && p.invulnerable <= 0 && Math.hypot(shot.x - p.x, shot.y - p.y) < p.radius + 3) {
        shot.life = 0; this.hitPlayer();
      }
    }
    for (const enemy of this.enemies) {
      if (!enemy.dead && p.alive && p.invulnerable <= 0 && Math.hypot(enemy.x - p.x, enemy.y - p.y) < p.radius + enemy.radius) {
        enemy.dead = true; this.burst(enemy.x, enemy.y); this.hitPlayer();
      }
    }
    for (const particle of this.particles) {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.life -= dt;
    }
    this.enemies = this.enemies.filter(e => !e.dead && e.y < this.height + 40);
    this.playerShots = this.playerShots.filter(s => s.life > 0 && s.y > -24);
    this.enemyShots = this.enemyShots.filter(s => s.life > 0 && s.y < this.height + 24 && s.x > -24 && s.x < this.width + 24);
    this.particles = this.particles.filter(s => s.life > 0);
  }
}

const PLAYER_PIXELS = [
  '0000002000000','0000024200000','0000024200000','0000224220000',
  '0001244421000','0001243421000','0011243421100','0112244422110',
  '1122444442211','1222244422221','1112244422111','0001244421000',
  '0001222221000','0000100010000','0000500050000','0000500050000'
];
const ENEMY_PIXELS = [
  ['00100000100','00110001100','00122022100','01122222110','11223232211','12222222221','11122222111','00112221100','00012221000','00001210000','00000100000'],
  ['01000000010','01100000110','01210001210','01221212210','11222322211','12222322221','11122322111','00122222100','00012221000','00001210000','00000100000'],
  ['10000100001','11001210011','12112221121','12222222221','11223332211','01122222110','00122222100','00112221100','00012221000','00001210000','00000100000']
];
function paintPixels(ctx, rows, x, y, unit, colors) {
  const left = Math.round(x - rows[0].length * unit / 2), top = Math.round(y - rows.length * unit / 2);
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const value = Number(rows[r][c]);
    if (!value) continue;
    ctx.fillStyle = colors[value];
    ctx.fillRect(left + c * unit, top + r * unit, unit, unit);
  }
}

export function paintAirBattle(ctx, battle, dark = true) {
  const w = battle.width, h = battle.height;
  ctx.save();
  ctx.setTransform(ctx.canvas.width / w, 0, 0, ctx.canvas.height / h, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = 1;
  ctx.fillStyle = dark ? '#0b0a18' : '#f4f0ff';
  ctx.fillRect(0, 0, w, h);
  // Soft scrolling stars stay deterministic across canvas resizes.
  for (const star of battle.stars) {
    ctx.globalAlpha = .2 + star.depth * .36;
    ctx.fillStyle = dark ? '#9ca5c9' : '#8b79a7';
    const y = (star.y * h + battle.time * (9 + star.depth * 23)) % h;
    const size = star.depth > .8 ? 2 : 1;
    ctx.fillRect(Math.round(star.x * w), Math.round(y), size, size);
  }
  ctx.globalAlpha = 1;
  for (const shot of battle.playerShots) {
    ctx.fillStyle = dark ? '#86d6c8' : '#457d85';
    ctx.fillRect(Math.round(shot.x - 1), Math.round(shot.y - 6), 2, 10);
    ctx.globalAlpha = .24; ctx.fillRect(Math.round(shot.x - 2), Math.round(shot.y - 2), 4, 14); ctx.globalAlpha = 1;
  }
  for (const shot of battle.enemyShots) {
    ctx.fillStyle = dark ? '#d498b8' : '#ac6384';
    ctx.fillRect(Math.round(shot.x - 2), Math.round(shot.y - 2), 4, 5);
  }
  const accents = dark ? ['#ba82ae','#a19acb','#c49c79'] : ['#a25d8b','#7c6eac','#9f7555'];
  for (const enemy of battle.enemies) paintPixels(ctx, ENEMY_PIXELS[enemy.type], enemy.x, enemy.y, 3,
    ['', dark ? '#493551' : '#bb9fc5', accents[enemy.type], dark ? '#d4c3d5' : '#e7dced']);
  const p = battle.player;
  if (p.alive) {
    const shielded = p.invulnerable > 0;
    ctx.globalAlpha = shielded ? .72 : 1;
    paintPixels(ctx, PLAYER_PIXELS, p.x, p.y, 3,
      ['', dark ? '#28465b' : '#7b9aaa', dark ? '#65a9be' : '#5c8c9e', '#2e526a', dark ? '#b2d8db' : '#dde9ec', '#a99c7e']);
    if (shielded) {
      ctx.globalAlpha = .26; ctx.strokeStyle = dark ? '#94d7d2' : '#4e8d96'; ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(p.x - 25), Math.round(p.y - 28), 50, 56);
    }
  }
  for (const particle of battle.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife) * .8;
    ctx.fillStyle = particle.friendly ? '#8eafbc' : '#c7a584';
    ctx.fillRect(Math.round(particle.x), Math.round(particle.y), 3, 3);
  }
  ctx.restore();
}

/** Own all DOM/animation resources; disabled mode has no observers or timers. */
export function createAirBattleBackground({doc, win}) {
  const selector = '[data-conversation-region="chat"]';
  const scenes = new Map();
  let enabled = false, disposed = false, observer, resizeObserver, frameId = null, lastFrame = null;
  let serial = 0;
  const visible = () => doc.hidden !== true;
  const stopFrame = () => {
    if (frameId !== null) win.cancelAnimationFrame(frameId);
    frameId = null; lastFrame = null;
  };
  const requestFrame = () => {
    if (enabled && !disposed && visible() && [...scenes.values()].some(s => s.width > 0 && s.height > 0) && frameId === null)
      frameId = win.requestAnimationFrame(tick);
  };
  function endDrag(scene) {
    const pointerId = scene.pointerId;
    scene.pointerId = null;
    if (pointerId !== null) {
      try { if (scene.canvas.hasPointerCapture?.(pointerId)) scene.canvas.releasePointerCapture(pointerId); } catch {}
    }
    scene.canvas.style.cursor = scene.playing ? 'grab' : '';
  }
  function setParticipation(scene, value, restoreFocus = true) {
    const playing = Boolean(value);
    if (playing === scene.playing) return;
    if (playing) {
      // A new scene or a background panel must never keep a second active controller.
      for (const other of scenes.values()) if (other !== scene) setParticipation(other, false, false);
      scene.previousFocus ??= doc.activeElement;
    }
    scene.playing = playing;
    scene.battle.setManual(playing);
    scene.host.toggleAttribute('data-na-playing', playing);
    scene.button.textContent = playing ? '退出参与' : '参与游戏';
    scene.button.setAttribute('aria-pressed', String(playing));
    scene.hint.textContent = playing ? '按住拖动战机 · Esc 退出' : '自动巡航';
    scene.canvas.setAttribute('aria-hidden', String(!playing));
    scene.canvas.tabIndex = playing ? 0 : -1;
    if (playing) {
      scene.canvas.style.cursor = 'grab';
      scene.canvas.focus({preventScroll: true});
    } else {
      endDrag(scene);
      if (restoreFocus && scene.previousFocus?.isConnected) scene.previousFocus.focus?.({preventScroll: true});
      scene.previousFocus = null;
    }
  }
  function bindControls(scene) {
    const listen = (element, name, listener) => {
      element.addEventListener(name, listener);
      scene.cleanups.push(() => element.removeEventListener(name, listener));
    };
    const move = event => {
      const rect = scene.canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) scene.battle.movePlayer(
        (event.clientX - rect.left) * scene.battle.width / rect.width,
        (event.clientY - rect.top) * scene.battle.height / rect.height);
    };
    const escape = event => {
      if (!scene.playing || event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation();
      setParticipation(scene, false);
    };
    listen(scene.button, 'pointerdown', () => { if (!scene.playing) scene.previousFocus = doc.activeElement; });
    listen(scene.button, 'click', () => setParticipation(scene, !scene.playing));
    listen(scene.button, 'keydown', escape);
    listen(scene.canvas, 'keydown', escape);
    listen(scene.canvas, 'pointerdown', event => {
      if (!scene.playing || event.button !== 0 || event.isPrimary === false || scene.pointerId !== null) return;
      event.preventDefault(); event.stopPropagation();
      scene.pointerId = event.pointerId;
      scene.canvas.focus({preventScroll: true});
      try { scene.canvas.setPointerCapture(event.pointerId); } catch {}
      scene.canvas.style.cursor = 'grabbing';
      move(event);
    });
    listen(scene.canvas, 'pointermove', event => {
      if (!scene.playing || scene.pointerId !== event.pointerId) return;
      if (event.pointerType === 'mouse' && event.buttons === 0) { endDrag(scene); return; }
      event.preventDefault(); event.stopPropagation(); move(event);
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(scene.canvas, name, event => {
      if (scene.pointerId === event.pointerId) endDrag(scene);
    });
    listen(scene.canvas, 'blur', event => {
      if (scene.playing && !scene.controls.contains(event.relatedTarget)) setParticipation(scene, false, false);
    });
  }
  function destroyScene(scene) {
    setParticipation(scene, false, false); endDrag(scene);
    for (const cleanup of scene.cleanups) cleanup();
    scene.host.removeAttribute('data-na-playing');
    scene.controls.remove(); scene.canvas.remove();
  }
  function resizeScene(scene) {
    const rect = scene.host.getBoundingClientRect();
    scene.width = rect.width; scene.height = rect.height;
    if (rect.width <= 0 || rect.height <= 0) return;
    const ratio = Math.min(1, 1440 / rect.width, 1080 / rect.height);
    const width = Math.max(1, Math.round(rect.width * ratio)), height = Math.max(1, Math.round(rect.height * ratio));
    if (scene.canvas.width !== width || scene.canvas.height !== height) {
      scene.canvas.width = width; scene.canvas.height = height;
      scene.battle.resize(720 * rect.width / rect.height, 720);
      paintAirBattle(scene.ctx, scene.battle, doc.body?.hasAttribute?.('data-ds-dark-theme') === true);
    }
  }
  function sync() {
    if (!enabled || disposed) return;
    const current = new Set(doc.querySelectorAll(selector));
    for (const [host, scene] of scenes) if (!current.has(host)) {
      resizeObserver?.unobserve(host); destroyScene(scene); scenes.delete(host);
    }
    for (const host of current) {
      if (scenes.has(host)) continue;
      const canvas = doc.createElement('canvas');
      canvas.className = 'na-air-battle';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('aria-label', '像素空战操作区，按住鼠标拖动战机，按 Esc 退出参与');
      canvas.tabIndex = -1;
      const ctx = canvas.getContext('2d', {alpha: false});
      if (!ctx) continue;
      const controls = doc.createElement('div'); controls.className = 'na-air-battle-controls';
      const hint = doc.createElement('span'); hint.className = 'na-air-battle-hint'; hint.textContent = '自动巡航';
      const button = doc.createElement('button'); button.className = 'na-air-battle-join';
      button.type = 'button'; button.textContent = '参与游戏'; button.setAttribute('aria-pressed', 'false');
      controls.appendChild(hint); controls.appendChild(button);
      const scene = {host, canvas, ctx, controls, hint, button, playing: false, pointerId: null, previousFocus: null,
        cleanups: [], battle: new AirBattle({seed: 82171 + serial++ * 997}), width: 0, height: 0};
      scenes.set(host, scene); host.appendChild(canvas); host.appendChild(controls);
      bindControls(scene); resizeScene(scene);
      resizeObserver?.observe(host);
    }
    requestFrame();
  }
  function tick(now) {
    frameId = null;
    if (!enabled || disposed || !visible()) { lastFrame = null; return; }
    if (lastFrame !== null && now - lastFrame < 1000 / 30) { requestFrame(); return; }
    const dt = lastFrame === null ? 1 / 30 : Math.min((now - lastFrame) / 1000, .08);
    lastFrame = now;
    const dark = doc.body?.hasAttribute?.('data-ds-dark-theme') === true;
    for (const scene of scenes.values()) {
      if (scene.width <= 0 || scene.height <= 0) continue;
      scene.battle.advance(dt); paintAirBattle(scene.ctx, scene.battle, dark);
    }
    requestFrame();
  }
  const exitAll = () => { for (const scene of scenes.values()) setParticipation(scene, false, false); };
  const onVisibility = () => { if (visible()) requestFrame(); else { exitAll(); stopFrame(); } };
  const onResize = () => { for (const scene of scenes.values()) resizeScene(scene); requestFrame(); };
  const hasScene = node => node.nodeType === 1 && (node.matches?.(selector) || node.querySelector?.(selector));
  function start() {
    if (typeof win.ResizeObserver === 'function') {
      resizeObserver = new win.ResizeObserver(entries => {
        for (const entry of entries) { const scene = scenes.get(entry.target); if (scene) resizeScene(scene); }
        requestFrame();
      });
    }
    if (typeof win.MutationObserver === 'function' && doc.body) {
      observer = new win.MutationObserver(records => {
        if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(hasScene))) sync();
      });
      observer.observe(doc.body, {childList: true, subtree: true});
    }
    doc.addEventListener?.('visibilitychange', onVisibility);
    win.addEventListener?.('resize', onResize);
    win.addEventListener?.('blur', exitAll);
    sync();
  }
  function stop() {
    stopFrame(); observer?.disconnect(); resizeObserver?.disconnect();
    observer = undefined; resizeObserver = undefined;
    doc.removeEventListener?.('visibilitychange', onVisibility);
    win.removeEventListener?.('resize', onResize);
    win.removeEventListener?.('blur', exitAll);
    for (const scene of scenes.values()) destroyScene(scene);
    scenes.clear();
  }
  return {
    setEnabled(value) {
      if (disposed || enabled === Boolean(value)) return;
      enabled = Boolean(value);
      if (enabled) start(); else stop();
    },
    dispose() { if (disposed) return; disposed = true; enabled = false; stop(); }
  };
}
