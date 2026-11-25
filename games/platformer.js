/* Platformer: run, jump, stomp bugs, collect shards, reach the gate.
   Each content item gets a challenge section (pits / bugs) followed by a shard section. */
(function () {
  'use strict';
  const M = (window.GameModes = window.GameModes || {});
  M.platformer = {
    create(api) {
      const ctx = api.ctx, th = api.th, n = api.items.length;
      const G = 1900, MOVE = 330, JUMP = 720, SEG = 1000, START = 420;
      const r = api.rng(n * 7919 + 13);
      const worldW = START + n * SEG + 560;
      const gaps = [], plats = [], shards = [], enemies = [], sparks = [];
      const enemy = (min, max) => ({ x: (min + max) / 2, y: 0, min, max, dir: r() < 0.5 ? -1 : 1, alive: true, ph: r() * 6 });
      const row = (x, y, c) => { for (let j = 0; j < c; j++) sparks.push({ x: x + j * 30, y, on: true }); };

      for (let k = 0; k < n; k++) {
        const x0 = START + k * SEG, c = r();
        // challenge section
        if (c < 0.34) { gaps.push([x0 + 120, x0 + 380]); plats.push({ x: x0 + 200, y: -95, w: 100 }); row(x0 + 220, -140, 3); }
        else if (c < 0.67) { gaps.push([x0 + 100, x0 + 210]); gaps.push([x0 + 300, x0 + 420]); row(x0 + 125, -150, 3); row(x0 + 330, -150, 3); }
        else { enemies.push(enemy(x0 + 60, x0 + 420)); plats.push({ x: x0 + 170, y: -100, w: 150 }); row(x0 + 195, -140, 4); }
        // shard section
        const x1 = x0 + 500;
        if (r() < 0.55) {
          plats.push({ x: x1 + 60, y: -100, w: 140 }); plats.push({ x: x1 + 240, y: -200, w: 130 });
          shards.push({ x: x1 + 305, y: -240, i: k }); row(x1 + 85, -140, 3);
        } else {
          plats.push({ x: x1 + 120, y: -110, w: 170 }); shards.push({ x: x1 + 205, y: -150, i: k }); row(x1 + 20, -40, 3);
        }
        if (k > 0 && r() < 0.5) enemies.push(enemy(x1 + 200, x1 + 420));
      }
      const solids = []; let sx = 0;
      gaps.forEach((g) => { solids.push([sx, g[0]]); sx = g[1]; });
      solids.push([sx, worldW]);
      const gate = { x: worldW - 300, w: 74, h: 124 };
      const p = { x: 120, y: 0, w: 28, h: 34, vx: 0, vy: 0, on: true, face: 1, coyote: 0, buf: 0, hurt: 0, cp: 120, sq: 0, jumping: false };
      let camX = 0, score = 0, jumpEdge = false, done = false, baseY = 0;

      const overSolid = (a, b) => solids.some((s) => b > s[0] + 3 && a < s[1] - 3);
      const jumpHeld = () => api.keys.up || api.keys.action;
      const dust = (x, y) => { for (let k = 0; k < 6; k++) api.burst(x, y, 'rgba(255,255,255,.5)', 1); };

      return {
        hint: '←  →  move      ↑ / Space  jump      Esc  map',
        stat: () => `score ${score}`,
        press(k) { if (k === 'up' || k === 'action') jumpEdge = true; },
        update(dt) {
          if (done) return;
          const keys = api.keys, W = api.W;
          p.hurt = Math.max(0, p.hurt - dt);
          const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
          if (p.hurt < 0.35) p.vx += (dir * MOVE - p.vx) * Math.min(1, dt * (p.on ? 16 : 9));
          if (dir) p.face = dir;
          p.coyote = p.on ? 0.1 : Math.max(0, p.coyote - dt);
          p.buf = Math.max(0, p.buf - dt);
          if (jumpEdge) { p.buf = 0.13; jumpEdge = false; }
          if (p.buf > 0 && p.coyote > 0) { p.vy = -JUMP; p.buf = 0; p.coyote = 0; p.on = false; p.jumping = true; p.sq = 1; }
          if (p.jumping && !jumpHeld() && p.vy < -280) p.vy = -280;
          p.vy = Math.min(p.vy + G * dt, 1300);

          let nx = Math.max(0, Math.min(worldW - p.w, p.x + p.vx * dt));
          if (p.y > 1 && overSolid(nx, nx + p.w)) { nx = p.x; p.vx = 0; }
          p.x = nx;

          const py = p.y, wasOn = p.on; let ny = p.y + p.vy * dt; p.on = false;
          if (p.vy >= 0) {
            for (const q of plats) {
              if (p.x + p.w > q.x + 3 && p.x < q.x + q.w - 3 && py <= q.y + 0.5 && ny >= q.y) { ny = q.y; p.vy = 0; p.on = true; break; }
            }
            if (!p.on && py <= 0.5 && ny >= 0 && overSolid(p.x, p.x + p.w)) {
              ny = 0; p.vy = 0; p.on = true;
              const seg = solids.find((s) => p.x >= s[0] && p.x + p.w <= s[1]);
              if (seg) p.cp = seg[0] === 0 ? 120 : seg[0] + 30;   // respawn with a run-up
            }
          }
          if (p.on && !wasOn) { p.sq = -0.8; p.jumping = false; dust(p.x + p.w / 2, ny); }
          p.y = ny;
          p.sq *= Math.pow(0.0005, dt);
          if (p.y > 520) { p.x = p.cp; p.y = 0; p.vx = p.vy = 0; p.hurt = 0.9; api.flash(0.25); }

          const cx = p.x + p.w / 2, cy = p.y - p.h / 2;
          for (const s of sparks) if (s.on && Math.hypot(s.x - cx, s.y - cy) < 26) { s.on = false; score += 10; }
          for (const s of shards) {
            if (s.taken) continue;
            const sy = s.y + Math.sin(api.t * 3 + s.i) * 6;
            if (Math.hypot(s.x - cx, sy - cy) < 36) {
              s.taken = true; score += 250; api.burst(s.x, sy, th.accent); api.reveal(s.i); return;
            }
          }
          for (const e of enemies) {
            if (!e.alive) continue;
            e.x += e.dir * 80 * dt;
            if (e.x < e.min) { e.x = e.min; e.dir = 1; }
            if (e.x > e.max) { e.x = e.max; e.dir = -1; }
            const hit = p.x + p.w > e.x + 2 && p.x < e.x + 32 && p.y > e.y - 22 && p.y - p.h < e.y;
            if (!hit) continue;
            if (p.vy > 0 && py <= e.y - 12) {
              e.alive = false; p.vy = -560; p.jumping = false; score += 100; api.burst(e.x + 17, e.y - 10, '#ff6b6b');
            } else if (p.hurt <= 0) {
              p.hurt = 0.7; p.vx = (cx < e.x + 17 ? -1 : 1) * 480; p.vy = -380; p.on = false; api.flash(0.15);
            }
          }
          if (shards.every((s) => s.taken) && p.x + p.w > gate.x + 14 && p.x < gate.x + gate.w - 14) { done = true; api.complete(); return; }
          const target = Math.max(0, Math.min(worldW - W, p.x - W * 0.38));
          camX += (target - camX) * Math.min(1, dt * 6);
        },
        draw() {
          const W = api.W, H = api.H, t = api.t;
          baseY = Math.round(H - Math.max(70, H * 0.15));
          api.sky(th, camX);
          api.hills(th.far, camX * 0.15, 40, baseY - 110, 0.0035);
          api.hills(th.near, camX * 0.4, 28, baseY - 40, 0.006);
          for (const s of solids) {
            const x = s[0] - camX, w = s[1] - s[0];
            if (x > W || x + w < 0) continue;
            ctx.fillStyle = th.ground; ctx.fillRect(x, baseY, w, H - baseY);
            ctx.fillStyle = th.top; ctx.fillRect(x, baseY, w, 6);
            ctx.fillStyle = 'rgba(255,255,255,.04)';
            for (let k = Math.ceil(s[0] / 48) * 48; k < s[1] - 20; k += 48) ctx.fillRect(k - camX, baseY + 18 + ((k / 48) % 2) * 20, 20, 6);
          }
          for (const q of plats) {
            const x = q.x - camX, y = baseY + q.y;
            if (x > W || x + q.w < 0) continue;
            ctx.fillStyle = th.ground; api.rr(x, y, q.w, 16, 6); ctx.fill();
            ctx.fillStyle = th.top; api.rr(x, y, q.w, 6, 3); ctx.fill();
          }
          ctx.fillStyle = '#fff';
          for (const s of sparks) {
            if (!s.on) continue;
            const x = s.x - camX; if (x < -10 || x > W + 10) continue;
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6 + s.x);
            ctx.beginPath(); ctx.arc(x, baseY + s.y, 4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
          // gate
          const gx = gate.x - camX, gy = baseY - gate.h, open = shards.every((s) => s.taken);
          if (open) {
            const g = ctx.createRadialGradient(gx + gate.w / 2, gy + gate.h / 2, 4, gx + gate.w / 2, gy + gate.h / 2, gate.w);
            g.addColorStop(0, '#fff'); g.addColorStop(0.35, th.accent); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5); ctx.fillStyle = g;
            ctx.fillRect(gx + 10, gy + 10, gate.w - 20, gate.h - 10); ctx.globalAlpha = 1;
            api.text('EXIT', gx + gate.w / 2, gy - 22, 9, th.accent, 'center');
          } else {
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(gx + 10, gy + 10, gate.w - 20, gate.h - 10);
            ctx.fillStyle = 'rgba(255,255,255,.25)';
            for (let b = gx + 18; b < gx + gate.w - 12; b += 12) ctx.fillRect(b, gy + 10, 3, gate.h - 10);
            api.text(`${shards.filter((s) => !s.taken).length} TO GO`, gx + gate.w / 2 + 10, gy - 22, 9, '#fff', 'center');
            api.diamond(gx + gate.w / 2 - 38, gy - 23, 6, th.accent, 0);
          }
          ctx.fillStyle = th.top;
          ctx.fillRect(gx, gy, 10, gate.h); ctx.fillRect(gx + gate.w - 10, gy, 10, gate.h); api.rr(gx - 6, gy - 10, gate.w + 12, 14, 4); ctx.fill();

          for (const s of shards) if (!s.taken) api.diamond(s.x - camX, baseY + s.y + Math.sin(t * 3 + s.i) * 6, 13, th.accent, t * 2 + s.i);
          for (const e of enemies) {
            if (!e.alive) continue;
            const x = e.x - camX, y = baseY, legs = Math.sin(t * 14 + e.ph) * 3;
            if (x < -50 || x > W + 50) continue;
            ctx.strokeStyle = '#2a0d14'; ctx.lineWidth = 3;
            for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 8 + k * 9, y - 6); ctx.lineTo(x + 5 + k * 9 + (k % 2 ? legs : -legs), y); ctx.stroke(); }
            ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.ellipse(x + 17, y - 10, 17, 11, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x, y - 10, 34, 5);
            ctx.fillStyle = '#fff'; ctx.fillRect(x + 17 + e.dir * 7 - 3, y - 17, 5, 5);
            ctx.fillStyle = '#000'; ctx.fillRect(x + 17 + e.dir * 8 - 2, y - 16, 3, 3);
          }
          api.mascot(p.x - camX, baseY + p.y, p);
          api.drawParticles(camX, -baseY);
        }
      };
    }
  };
})();
