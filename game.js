/* Game core: level map, progress, overlays, journal, input and shared drawing.
   Each level is played by a separate game module in games/*.js, chosen by
   the level's `game` field in content.js:
     platformer · stacker · maze · moto · rally
   A module gets an `api` object and calls api.reveal(k) to unlock item k,
   api.complete() when the level is won, api.fail(msg) when it's lost. */
(function () {
  'use strict';
  const S = window.SITE;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const journalBtn = document.getElementById('journal-btn');
  const journal = document.getElementById('journal');
  const PX = '"Press Start 2P", ui-monospace, monospace';
  const SANS = '"Inter", system-ui, sans-serif';
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const THEMES = {
    dawn:   { sky: ['#24163f', '#e9806a'], far: '#5b3a6e', near: '#3a2752', ground: '#251a38', top: '#ffb37a', accent: '#ffd166' },
    dusk:   { sky: ['#140c2e', '#ff8a5c'], far: '#3a2250', near: '#26163a', ground: '#1a1028', top: '#ffc36b', accent: '#ffd166' },
    forest: { sky: ['#0a2422', '#2f7d6d'], far: '#2a5e3c', near: '#1f4a30', ground: '#0e2723', top: '#7be0a5', accent: '#c4ff8a' },
    night:  { sky: ['#050818', '#1c2b5e'], far: '#18234d', near: '#101838', ground: '#0b112c', top: '#8fb4ff', accent: '#9ee8ff', stars: true },
    synth:  { sky: ['#160522', '#7a1f6b'], far: '#4a1450', near: '#300b38', ground: '#1c0724', top: '#ff5fd2', accent: '#5ff2ff', stars: true }
  };
  const GAMES = { platformer: 'Platformer', stacker: 'Tower stacker', maze: 'Maze chase', moto: 'Road brawl', rally: 'Drift rally' };
  // Every game is split into the same stages (one per section, in order).
  // Each collectible in a stage reveals ONE entry of that section.
  const itemsFor = (src) => src === 'skills'
    ? Object.entries(S.skills || {}).map(([group, list]) => ({ src, d: { group, list } }))
    : (S[src] || []).map((d) => ({ src, d }));
  const STAGES = (S.sections || []).map((s) => ({ title: s.title, items: itemsFor(s.source) })).filter((s) => s.items.length);
  const LEVELS = (S.games || []).map((g) => Object.assign({}, g, { th: THEMES[g.theme] || THEMES.dawn }));
  const TOTAL = STAGES.reduce((a, s) => a + s.items.length, 0);

  /* ---------- progress: entries seen ("stage:item"), stage reached per game ---------- */
  const KEY = 'journey-progress-v4';
  const fresh = () => ({ seen: [], stage: {}, done: {} });
  function loadProg() {
    try { const p = JSON.parse(localStorage.getItem(KEY)); if (p && Array.isArray(p.seen) && p.stage) return p; } catch (e) { /* ignore */ }
    return fresh();
  }
  let prog = loadProg();
  function saveProg() { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* ignore */ } }
  const gotCount = () => prog.seen.length;
  let runGot = [];   // entries found in the current stage
  let stage = 0;     // current stage index

  /* ---------- state ---------- */
  let W = 0, H = 0, scene = 'map', paused = false, sel = 0, cur = 0, mode = null, t = 0;
  let hintT = 0, toastMsg = '', toastT = 0, shakeT = 0, flashT = 0, mapShake = 0;
  let running = false, raf = 0, last = 0, overlayLock = 0, pendingEnd = null;
  const cardQueue = [];
  const keys = { left: false, right: false, up: false, down: false, action: false };
  const particles = [];
  const clearKeys = () => Object.keys(keys).forEach((k) => { keys[k] = false; });

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', () => { if (running) resize(); });

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let x = Math.imul(a ^ (a >>> 15), 1 | a);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- shared drawing ---------- */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function text(str, x, y, size, color, align, font) {
    ctx.font = `${size}px ${font || PX}`; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }
  function diamond(x, y, r, color, spin) {
    const sx = Math.max(0.15, Math.abs(Math.cos(spin)));
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, 1);
    ctx.shadowColor = color; ctx.shadowBlur = 18;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.75, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.75, 0); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.3, -r * 0.2); ctx.lineTo(0, 0); ctx.lineTo(-r * 0.3, -r * 0.2); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function sky(th, drift) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (th.stars) {
      for (let k = 0; k < 90; k++) {
        const sx = ((k * 977.3 - (drift || 0) * 0.05) % W + W) % W, sy = (k * 431.7) % (H * 0.6);
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.3 + k));
        ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }
  function hills(color, offset, amp, base, freq) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 20; x += 16) {
      const wx = x + offset;
      ctx.lineTo(x, base - (Math.sin(wx * freq) * amp + Math.sin(wx * freq * 2.7 + 1.3) * amp * 0.35));
    }
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  // The mascot: x = left edge, y = feet. p = {w,h,face,sq,hurt}
  function mascot(x, y, p, s) {
    s = s || 1;
    if (p.hurt > 0 && Math.floor(t * 20) % 2) return;
    const sq = p.sq || 0;
    const w = p.w * (1 + sq * 0.18) * s, h = p.h * (1 - sq * 0.18) * s;
    const bx = x + (p.w * s - w) / 2, by = y - h;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + p.w * s / 2, y + 2 * s, w * 0.45, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166'; rr(bx, by, w, h, 8 * s); ctx.fill();
    ctx.fillStyle = '#f4a73b'; rr(bx, by + h - 7 * s, w, 7 * s, 4 * s); ctx.fill();
    const ex = bx + w / 2 + p.face * 5 * s, ey = by + h * 0.38;
    ctx.fillStyle = '#fff'; ctx.fillRect(ex - 8 * s, ey - 4 * s, 6 * s, 8 * s); ctx.fillRect(ex + 2 * s, ey - 4 * s, 6 * s, 8 * s);
    ctx.fillStyle = '#1b1530';
    ctx.fillRect(ex + (-6 + p.face * 1.5) * s, ey - s, 3 * s, 4 * s); ctx.fillRect(ex + (4 + p.face * 1.5) * s, ey - s, 3 * s, 4 * s);
  }
  function burst(x, y, color, n) {
    for (let k = 0; k < (n || 22); k++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 260;
      particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, life: 0.6 + Math.random() * 0.4, c: color, s: 3 + Math.random() * 3 });
    }
  }
  function drawParticles(ox, oy) {
    for (const q of particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, q.life * 2)); ctx.fillStyle = q.c;
      ctx.fillRect(q.x - ox, q.y - oy, q.s, q.s);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- api handed to game modules ---------- */
  const api = {
    ctx, PX, SANS, keys, rng, rr, text, diamond, sky, hills, mascot, burst, drawParticles,
    get W() { return W; }, get H() { return H; }, get t() { return t; },
    level: null, th: null, items: [],
    reveal(k) {
      if (!STAGES[stage].items[k]) return;
      if (!runGot.includes(k)) runGot.push(k);
      const key = stage + ':' + k;
      if (!prog.seen.includes(key)) { prog.seen.push(key); saveProg(); updateJournal(); }
      showCard(cur, stage, k);
    },
    complete() { endLevel({ win: true }); },
    fail(msg) { endLevel({ win: false, msg }); },
    toast(m) { toastMsg = m; toastT = 2.2; },
    shake(v) { shakeT = Math.max(shakeT, v); },
    flash(v) { flashT = Math.max(flashT, v); }
  };

  // st omitted → resume at this game's next unfinished stage (wraps after the last)
  function startLevel(i, st) {
    const L = LEVELS[i], G = window.GameModes && window.GameModes[L.game];
    if (!G) { api.toast('Missing game: ' + L.game); return; }
    cur = i; sel = i;
    stage = st != null ? st : (prog.stage[i] || 0) % STAGES.length;
    api.level = L; api.th = L.th; api.items = STAGES[stage].items; api.stage = stage;
    particles.length = 0; cardQueue.length = 0; pendingEnd = null; shakeT = flashT = 0; runGot = [];
    clearKeys();
    resize();
    mode = G.create(api);
    hintT = 6; scene = 'level';
    canvas.focus({ preventScroll: true });
  }
  function toMap() { scene = 'map'; mode = null; clearKeys(); }
  function tryEnter(i) { startLevel(i); }

  /* ---------- overlay: cards, win, lose ---------- */
  function openOverlay(html, glow) {
    paused = true; clearKeys();
    overlay.innerHTML = `<div class="card" style="--glow:${glow || '#ffd166'}">${html}</div>`;
    overlay.hidden = false;
    overlayLock = performance.now() + 300;
  }
  function hideOverlay() { overlay.hidden = true; overlay.innerHTML = ''; paused = false; canvas.focus({ preventScroll: true }); }
  function closeOverlay() {
    if (performance.now() < overlayLock) return;
    hideOverlay();
    if (cardQueue.length) { const c = cardQueue.shift(); showCard(c[0], c[1], c[2]); return; }
    if (pendingEnd) { const e = pendingEnd; pendingEnd = null; runEnd(e); }
  }
  function showCard(li, st, k) {
    if (paused) { cardQueue.push([li, st, k]); return; }
    const L = LEVELS[li], S_ = STAGES[st], it = S_.items[k];
    const label = `${S_.title} · ${k + 1} of ${S_.items.length}`;
    openOverlay(window.Cards.render(it.src, it.d, label) + `<p class="hint">Enter / Space to continue</p>`, L ? L.th.accent : '#ffd166');
  }
  function endLevel(e) { if (paused) pendingEnd = e; else runEnd(e); }
  function runEnd(e) { e.win ? completeLevel() : failLevel(e.msg); }

  function completeLevel() {
    const L = LEVELS[cur], next = stage + 1;
    prog.stage[cur] = Math.max(prog.stage[cur] || 0, next);
    if (next >= STAGES.length) {
      prog.done[cur] = true; prog.stage[cur] = STAGES.length;
      saveProg(); updateJournal();
      openOverlay(`<p class="kicker">★ ${esc(GAMES[L.game])} cleared</p><h3>${esc(L.name)} complete</h3>
        <p>You've been through all ${STAGES.length} stages. Want a different way through? Every game tells the same story. Or read it all on one page in the résumé.</p>
        <div class="row"><button class="gbtn" data-act="map" data-primary>Pick another game</button><button class="gbtn ghost" data-act="hire">View résumé</button></div>
        <p class="hint">Enter to pick another game</p>`, L.th.accent);
      return;
    }
    saveProg(); updateJournal();
    const nx = STAGES[next];
    openOverlay(`<p class="kicker">★ Stage ${stage + 1} of ${STAGES.length} cleared</p><h3>${esc(STAGES[stage].title)} complete</h3>
      <p>Next up: <b>${esc(nx.title)}</b>, ${nx.items.length} to find.</p>
      <div class="row"><button class="gbtn" data-act="next" data-lv="${cur}" data-st="${next}" data-primary>Stage ${next + 1}: ${esc(nx.title)} ▶</button><button class="gbtn ghost" data-act="map">Pick another game</button></div>
      <p class="hint">Enter to continue</p>`, L.th.accent);
  }
  function failLevel(msg) {
    openOverlay(`<p class="kicker">✖ ${esc(GAMES[LEVELS[cur].game])}</p><h3>${esc(msg || 'Try again')}</h3>
      <p>Everything you've revealed so far is kept in your journal.</p>
      <div class="row"><button class="gbtn" data-act="retry" data-primary>Retry</button><button class="gbtn ghost" data-act="map">Map</button></div>
      <p class="hint">Enter to retry · Esc for map</p>`, '#ff6b6b');
  }
  overlay.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    if (a) {
      const act = a.dataset.act;
      hideOverlay(); cardQueue.length = 0; pendingEnd = null;
      if (act === 'next') startLevel(Number(a.dataset.lv), Number(a.dataset.st));
      else if (act === 'retry') startLevel(cur, stage);
      else if (act === 'hire') { toMap(); window.App.setMode('hire'); }
      else toMap();
      return;
    }
    if (e.target === overlay) closeOverlay();
  });

  /* ---------- journal ---------- */
  function updateJournal() {
    journalBtn.textContent = `Journal ${gotCount()}/${TOTAL}`;
    journal.innerHTML = `<h4>Found</h4>` + STAGES.map((st, s) =>
      `<div class="lv">${s + 1}. ${esc(st.title)}</div>` + st.items.map((it, k) => prog.seen.includes(s + ':' + k)
        ? `<button class="it" data-st="${s}" data-ii="${k}">◆ ${esc(window.Cards.title(it.d))}</button>`
        : `<div class="lock">◇ ???</div>`).join('')).join('') +
      `<button class="reset" data-reset>Reset progress</button>`;
  }
  journalBtn.addEventListener('click', () => { journal.hidden = !journal.hidden; });
  journal.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ii]');
    if (b) { journal.hidden = true; showCard(scene === 'level' ? cur : -1, Number(b.dataset.st), Number(b.dataset.ii)); return; }
    if (e.target.closest('[data-reset]') && confirm('Reset your game progress?')) {
      prog = fresh(); saveProg(); updateJournal(); sel = 0; toMap(); journal.hidden = true;
    }
  });

  /* ---------- input ---------- */
  const KEYMAP = {
    ArrowLeft: 'left', a: 'left', A: 'left',
    ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'up', w: 'up', W: 'up',
    ArrowDown: 'down', s: 'down', S: 'down',
    ' ': 'action', z: 'action', Z: 'action', x: 'action', X: 'action',
    Enter: 'enter', Escape: 'esc', r: 'restart', R: 'restart'
  };
  function down(k, repeat) {
    if (paused) {
      if (repeat) return;
      if (k === 'esc') { const m = overlay.querySelector('[data-act="map"]'); if (m) m.click(); else closeOverlay(); }
      else if (k === 'enter' || k === 'action' || k === 'up') {
        const p = overlay.querySelector('[data-primary]');
        if (p) { if (performance.now() >= overlayLock) p.click(); } else closeOverlay();
      }
      return;
    }
    if (scene === 'map') {
      if (k === 'left') sel = Math.max(0, sel - 1);
      else if (k === 'right') sel = Math.min(LEVELS.length - 1, sel + 1);
      else if (!repeat && (k === 'enter' || k === 'action' || k === 'up')) tryEnter(sel);
      return;
    }
    if (repeat) return;
    if (k === 'esc') { toMap(); return; }
    if (k === 'restart') { startLevel(cur); return; }
    if (k === 'enter') k = 'action';
    if (k in keys) { keys[k] = true; if (mode && mode.press) mode.press(k); }
  }
  function up(k) {
    if (k === 'enter') k = 'action';
    if (k in keys) { keys[k] = false; if (mode && mode.release) mode.release(k); }
  }

  const active = () => running && document.body.dataset.mode === 'play';
  window.addEventListener('keydown', (e) => {
    if (!active()) return;
    const k = KEYMAP[e.key];
    if (!k) return;
    if (e.target.closest && e.target.closest('.journal, .switch')) return;
    e.preventDefault();
    down(k, e.repeat);
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.key]; if (k) up(k); });
  window.addEventListener('blur', clearKeys);

  document.querySelectorAll('.touch [data-k]').forEach((b) => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); down(k, false); });
    const release = () => up(k);
    b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release);
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (scene !== 'map' || paused) return;
    const r = canvas.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    mapNodes().forEach((n, i) => { if (Math.hypot(mx - n.x, my - n.y) < 40) { sel = i; tryEnter(i); } });
  });

  /* ---------- map ---------- */
  function mapNodes() {
    const n = LEVELS.length;
    return LEVELS.map((_, i) => ({
      x: n === 1 ? W / 2 : W * (0.11 + 0.78 * i / (n - 1)),
      y: H * 0.52 + Math.sin(i * 1.7 + 0.6) * Math.min(60, H * 0.08)
    }));
  }
  function drawMap() {
    sky(THEMES.night, t * 200);
    hills('#121a3d', t * 8, 30, H - 40, 0.004);
    text((S.profile.name || '').toUpperCase(), W / 2, H * 0.14, Math.max(14, Math.min(26, W / 32)), '#fff', 'center');
    text('CHOOSE A GAME', W / 2, H * 0.14 + 36, 10, '#ffd166', 'center');
    text(`Every game tells the same story in ${STAGES.length} stages. Play whichever you like.`, W / 2, H * 0.14 + 62, 13, '#b9b3d4', 'center', SANS);

    const nodes = mapNodes();
    const small = W < 760;
    nodes.forEach((n, i) => {
      const L = LEVELS[i], lt = L.th, done = !!prog.done[i], isSel = i === sel, x = n.x;
      if (isSel) { ctx.strokeStyle = lt.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, n.y, 34 + Math.sin(t * 4) * 2, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = lt.sky[1];
      ctx.beginPath(); ctx.arc(x, n.y, 26, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = lt.top; ctx.stroke();
      if (done) text('★', x, n.y + 1, 22, '#fff', 'center', SANS);
      else text(String(i + 1), x, n.y + 1, 13, '#fff', 'center');
      if (!small || isSel) {
        const lx = small ? W / 2 : x, ly = small ? H * 0.52 + 100 : n.y + 52;
        text(L.name.toUpperCase(), lx, ly, 9, '#fff', 'center');
        text(GAMES[L.game], lx, ly + 20, 12, lt.accent, 'center', SANS);
        const reached = Math.min(prog.stage[i] || 0, STAGES.length);
        text(done ? `${L.blurb} · all stages done` : reached ? `${L.blurb} · next: stage ${reached + 1}/${STAGES.length}` : (L.blurb || ''),
          lx, ly + 38, 12, '#b9b3d4', 'center', SANS);
      }
    });
    const s = nodes[sel];
    mascot(s.x - 14, s.y - 40 - Math.abs(Math.sin(t * 5)) * 10, { w: 28, h: 34, face: 1, sq: 0, hurt: 0 });
    text(small ? 'Tap a game to play' : '←  →  choose a game      Enter  play', W / 2, H - 34, 14, '#cfc9e6', 'center', SANS);
  }

  /* ---------- HUD ---------- */
  function drawHUD() {
    const L = LEVELS[cur], got = runGot.length;
    const title = `${L.name.toUpperCase()} · ${stage + 1}/${STAGES.length} ${STAGES[stage].title.toUpperCase()}`;
    const stat = mode && mode.stat ? mode.stat() : '';
    ctx.font = `9px ${PX}`; const w1 = ctx.measureText(title).width;
    const gotTxt = `${got}/${STAGES[stage].items.length}`; const wg = ctx.measureText(gotTxt).width;
    ctx.font = `13px ${SANS}`; const w2 = 32 + wg + 16 + ctx.measureText(stat).width;
    ctx.fillStyle = 'rgba(10,8,20,.6)'; rr(14, 14, Math.max(w1, w2) + 30, 54, 10); ctx.fill();
    text(title, 28, 32, 9, '#fff');
    diamond(33, 51, 6, L.th.accent, 0);
    text(gotTxt, 46, 52, 9, L.th.accent);
    if (stat) text(stat, 46 + wg + 16, 52, 13, '#e2ddf5', 'left', SANS);
    if (hintT > 0 && mode && mode.hint) {
      ctx.globalAlpha = Math.min(1, hintT);
      ctx.font = `14px ${SANS}`; const hw = ctx.measureText(mode.hint).width + 32;
      ctx.fillStyle = 'rgba(10,8,20,.6)'; rr(W / 2 - hw / 2, H - 46, hw, 34, 17); ctx.fill();
      text(mode.hint, W / 2, H - 29, 14, '#fff', 'center', SANS);
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- loop ---------- */
  function update(dt) {
    t += dt;
    shakeT = Math.max(0, shakeT - dt); flashT = Math.max(0, flashT - dt);
    mapShake = Math.max(0, mapShake - dt); toastT = Math.max(0, toastT - dt);
    for (let k = particles.length - 1; k >= 0; k--) {
      const q = particles[k]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 900 * dt;
      if (q.life <= 0) particles.splice(k, 1);
    }
    if (scene === 'level' && mode && !paused) { hintT = Math.max(0, hintT - dt); mode.update(dt); }
  }
  function draw() {
    ctx.save();
    if (shakeT > 0) ctx.translate((Math.random() - 0.5) * shakeT * 30, (Math.random() - 0.5) * shakeT * 30);
    if (scene === 'level' && mode) mode.draw(); else drawMap();
    ctx.restore();
    if (scene === 'level' && mode) drawHUD();
    if (flashT > 0) { ctx.fillStyle = `rgba(255,80,80,${flashT})`; ctx.fillRect(0, 0, W, H); }
    if (toastT > 0) {
      ctx.globalAlpha = Math.min(1, toastT * 2);
      ctx.font = `14px ${SANS}`; const w = ctx.measureText(toastMsg).width + 30;
      ctx.fillStyle = 'rgba(10,8,20,.75)'; rr(W / 2 - w / 2, 80, w, 34, 17); ctx.fill();
      text(toastMsg, W / 2, 97, 14, '#fff', 'center', SANS);
      ctx.globalAlpha = 1;
    }
  }
  function frame(ts) {
    if (!running) return;
    const dt = Math.min(0.033, Math.max(0, (ts - last) / 1000));
    last = ts;
    update(dt); draw();
    raf = requestAnimationFrame(frame);
  }

  window.Game = {
    start() {
      if (running) return;
      running = true; resize(); updateJournal();
      last = performance.now(); raf = requestAnimationFrame(frame);
      canvas.focus({ preventScroll: true });
    },
    stop() {
      running = false; cancelAnimationFrame(raf);
      clearKeys(); journal.hidden = true;
    },
    // read-only snapshot, handy for debugging in the console
    state() {
      return { scene, paused, level: cur, game: LEVELS[cur].game, stage, stageTitle: STAGES[stage].title, items: STAGES[stage].items.length,
        stat: mode && mode.stat ? mode.stat() : '', got: runGot.slice(), seen: prog.seen.slice() };
    }
  };
})();
