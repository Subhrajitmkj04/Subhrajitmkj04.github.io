/* Drift rally: top-down arcade car in an open lot. Drive through each ring in
   order before the clock runs out (every ring adds time). Hold Space to
   handbrake-drift, hit boost pads, smash cones for points. */
(function () {
  'use strict';
  const M = (window.GameModes = window.GameModes || {});
  const WW = 2400, WH = 1600;
  const BLOCKS = [
    { x: 500, y: 330, w: 260, h: 160 }, { x: 1200, y: 180, w: 180, h: 300 }, { x: 1700, y: 600, w: 320, h: 200 },
    { x: 700, y: 900, w: 200, h: 300 }, { x: 1400, y: 1100, w: 300, h: 180 }, { x: 260, y: 1250, w: 220, h: 150 },
    { x: 1950, y: 1150, w: 200, h: 260 }, { x: 1050, y: 650, w: 160, h: 160 }
  ];
  const RINGS = [
    { x: 420, y: 180 }, { x: 1000, y: 470 }, { x: 1600, y: 330 }, { x: 2150, y: 300 }, { x: 2050, y: 950 },
    { x: 1250, y: 920 }, { x: 480, y: 760 }, { x: 900, y: 1420 }, { x: 1700, y: 1460 }, { x: 2250, y: 1480 }
  ];
  const PADS = [{ x: 820, y: 190, a: 0 }, { x: 1500, y: 880, a: Math.PI }, { x: 300, y: 1000, a: -Math.PI / 2 }, { x: 2200, y: 760, a: Math.PI / 2 }, { x: 1150, y: 1450, a: 0 }];

  M.rally = {
    create(api) {
      const ctx = api.ctx, th = api.th, n = Math.max(1, api.items.length);
      const rings = []; for (let k = 0; k < n; k++) rings.push(RINGS[k % RINGS.length]);
      const inBlock = (x, y, pad) => BLOCKS.some((b) => x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad);
      const r = api.rng(4242), cones = [];
      for (let k = 0; k < 70; k++) {
        const x = 80 + r() * (WW - 160), y = 80 + r() * (WH - 160);
        if (inBlock(x, y, 30) || Math.hypot(x - 200, y - 420) < 160 || rings.some((q) => Math.hypot(q.x - x, q.y - y) < 70)) continue;
        cones.push({ x, y, vx: 0, vy: 0, a: 0, va: 0, hit: false });
      }
      const car = { x: 200, y: 420, a: 0, vx: 0, vy: 0 };
      const skids = [];
      let ring = 0, timer = 30, boost = 0, camX = 0, camY = 0, done = false, score = 0, speed = 0;

      return {
        hint: '↑ gas   ↓ brake   ← →  steer   hold Space  drift',
        stat: () => `time ${Math.max(0, timer).toFixed(1)}s   ${Math.round(Math.abs(speed) * 0.3)} km/h   score ${score}`,
        update(dt) {
          if (done) return;
          const k = api.keys, W = api.W, H = api.H;
          // steer first, then split velocity along the new heading → natural drift
          const steer = (k.right ? 1 : 0) - (k.left ? 1 : 0);
          const grip = Math.min(1, Math.abs(speed) / 200);
          car.a += steer * 3.1 * grip * (speed < 0 ? -1 : 1) * (k.action ? 1.3 : 1) * dt;
          const fx = Math.cos(car.a), fy = Math.sin(car.a);
          let f = car.vx * fx + car.vy * fy, l = -car.vx * fy + car.vy * fx;
          if (k.up) f += 650 * dt;
          if (k.down) f -= (f > 0 ? 950 : 420) * dt;
          if (!k.up && !k.down) f *= Math.pow(0.45, dt);
          if (boost > 0) { boost -= dt; f += 600 * dt; }
          f = Math.max(-240, Math.min(boost > 0 ? 880 : 580, f));
          l *= Math.pow(k.action ? 0.4 : 0.004, dt);
          if (Math.abs(l) > 90 && Math.abs(f) > 100) {
            skids.push({ x: car.x - fy * 10, y: car.y + fx * 10, life: 4 }, { x: car.x + fy * 10, y: car.y - fx * 10, life: 4 });
            if (skids.length > 800) skids.splice(0, skids.length - 800);
            if (k.action) score += 1;
          }
          car.vx = fx * f - fy * l; car.vy = fy * f + fx * l; speed = f;
          car.x += car.vx * dt; car.y += car.vy * dt;

          const R = 18;
          if (car.x < R) { car.x = R; car.vx = Math.abs(car.vx) * 0.4; }
          if (car.x > WW - R) { car.x = WW - R; car.vx = -Math.abs(car.vx) * 0.4; }
          if (car.y < R) { car.y = R; car.vy = Math.abs(car.vy) * 0.4; }
          if (car.y > WH - R) { car.y = WH - R; car.vy = -Math.abs(car.vy) * 0.4; }
          for (const b of BLOCKS) {
            const cx = Math.max(b.x, Math.min(b.x + b.w, car.x)), cy = Math.max(b.y, Math.min(b.y + b.h, car.y));
            const dx = car.x - cx, dy = car.y - cy, d = Math.hypot(dx, dy);
            if (d >= R) continue;
            const nx = d > 0.001 ? dx / d : 0, ny = d > 0.001 ? dy / d : -1;
            car.x = cx + nx * R; car.y = cy + ny * R;
            const vn = car.vx * nx + car.vy * ny;
            if (vn < 0) { car.vx -= 1.5 * vn * nx; car.vy -= 1.5 * vn * ny; if (vn < -250) api.shake(0.2); }
          }
          for (const c of cones) {
            if (!c.hit && Math.hypot(c.x - car.x, c.y - car.y) < 26 && Math.hypot(car.vx, car.vy) > 40) {
              c.hit = true; c.vx = car.vx * 1.1 + (Math.random() - 0.5) * 160; c.vy = car.vy * 1.1 + (Math.random() - 0.5) * 160; c.va = (Math.random() - 0.5) * 20; score += 25;
            }
            if (c.hit) { c.x += c.vx * dt; c.y += c.vy * dt; c.a += c.va * dt; const fr = Math.pow(0.25, dt); c.vx *= fr; c.vy *= fr; c.va *= fr; }
          }
          for (const p of PADS) if (Math.abs(car.x - p.x) < 45 && Math.abs(car.y - p.y) < 45 && boost <= 0.2) { boost = 1.1; api.toast('Boost!'); }
          for (const s of skids) s.life -= dt;
          while (skids.length && skids[0].life <= 0) skids.shift();

          const q = rings[ring];
          if (Math.hypot(q.x - car.x, q.y - car.y) < 56) {
            api.burst(q.x, q.y, th.accent, 30); score += 500; timer += 10; ring++;
            api.reveal(ring - 1);
            if (ring >= n) { done = true; api.complete(); return; }
          }
          timer -= dt;
          if (timer <= 0) { done = true; api.fail('Out of time!'); return; }

          const tx = WW > W ? Math.max(0, Math.min(WW - W, car.x + car.vx * 0.3 - W / 2)) : (WW - W) / 2;
          const ty = WH > H ? Math.max(0, Math.min(WH - H, car.y + car.vy * 0.3 - H / 2)) : (WH - H) / 2;
          camX += (tx - camX) * Math.min(1, dt * 5); camY += (ty - camY) * Math.min(1, dt * 5);
        },
        draw() {
          const W = api.W, H = api.H, t = api.t;
          ctx.fillStyle = th.ground; ctx.fillRect(0, 0, W, H);
          ctx.save(); ctx.translate(-camX, -camY);
          ctx.fillStyle = '#25222e'; ctx.fillRect(0, 0, WW, WH);
          ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2;
          for (let x = Math.floor(camX / 100) * 100; x < camX + W; x += 100) { ctx.beginPath(); ctx.moveTo(x, Math.max(0, camY)); ctx.lineTo(x, Math.min(WH, camY + H)); ctx.stroke(); }
          for (let y = Math.floor(camY / 100) * 100; y < camY + H; y += 100) { ctx.beginPath(); ctx.moveTo(Math.max(0, camX), y); ctx.lineTo(Math.min(WW, camX + W), y); ctx.stroke(); }
          ctx.strokeStyle = th.top; ctx.lineWidth = 8; ctx.strokeRect(0, 0, WW, WH);

          for (const s of skids) { ctx.fillStyle = `rgba(0,0,0,${0.35 * Math.min(1, s.life / 2)})`; ctx.fillRect(s.x - 3, s.y - 3, 6, 6); }
          for (const p of PADS) {
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
            ctx.fillStyle = 'rgba(95,242,255,.15)'; api.rr(-45, -32, 90, 64, 10); ctx.fill();
            ctx.strokeStyle = th.accent; ctx.lineWidth = 4;
            for (let i = 0; i < 3; i++) {
              const o = ((t * 60 + i * 24) % 72) - 36;
              ctx.globalAlpha = 1 - Math.abs(o) / 40;
              ctx.beginPath(); ctx.moveTo(o - 8, -14); ctx.lineTo(o + 6, 0); ctx.lineTo(o - 8, 14); ctx.stroke();
            }
            ctx.globalAlpha = 1; ctx.restore();
          }
          for (const b of BLOCKS) {
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(b.x + 10, b.y + 12, b.w, b.h);
            ctx.fillStyle = th.near; ctx.fillRect(b.x, b.y, b.w, b.h);
            ctx.fillStyle = th.far; ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
            ctx.fillStyle = 'rgba(255,255,255,.08)';
            for (let x = b.x + 20; x < b.x + b.w - 30; x += 46) for (let y = b.y + 20; y < b.y + b.h - 30; y += 46) ctx.fillRect(x, y, 24, 18);
            ctx.strokeStyle = th.top; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.strokeRect(b.x, b.y, b.w, b.h); ctx.globalAlpha = 1;
          }
          for (const c of cones) {
            ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a);
            ctx.fillStyle = '#ff8a3d'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(8, 7); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(-4, -1, 8, 3);
            ctx.restore();
          }
          // rings: current bright, next one faint
          if (ring + 1 < n) {
            const q = rings[ring + 1];
            ctx.setLineDash([10, 10]); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(q.x, q.y, 46, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          }
          if (ring < n) {
            const q = rings[ring];
            ctx.shadowColor = th.accent; ctx.shadowBlur = 20;
            ctx.strokeStyle = th.accent; ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(q.x, q.y, 46 + Math.sin(t * 5) * 3, 0, Math.PI * 2); ctx.stroke();
            ctx.shadowBlur = 0;
            api.diamond(q.x, q.y, 14, th.accent, t * 2);
            api.text(String(ring + 1), q.x, q.y - 70, 12, '#fff', 'center');
          }
          // car
          ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.a);
          if (boost > 0) {
            ctx.fillStyle = Math.floor(t * 30) % 2 ? '#5ff2ff' : '#fff';
            ctx.beginPath(); ctx.moveTo(-24, -6); ctx.lineTo(-40 - Math.random() * 12, 0); ctx.lineTo(-24, 6); ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = 'rgba(0,0,0,.35)'; api.rr(-20, -10, 46, 26, 7); ctx.fill();
          ctx.fillStyle = '#111';
          ctx.fillRect(-17, -15, 11, 5); ctx.fillRect(8, -15, 11, 5); ctx.fillRect(-17, 10, 11, 5); ctx.fillRect(8, 10, 11, 5);
          ctx.fillStyle = '#ffd166'; api.rr(-23, -12, 46, 24, 7); ctx.fill();
          ctx.fillStyle = '#f4a73b'; ctx.fillRect(-23, -2, 46, 4);
          ctx.fillStyle = '#1b1530'; api.rr(2, -9, 10, 18, 3); ctx.fill(); api.rr(-16, -8, 7, 16, 2); ctx.fill();
          ctx.fillStyle = '#fff6c8'; ctx.fillRect(20, -10, 3, 5); ctx.fillRect(20, 5, 3, 5);
          ctx.restore();
          api.drawParticles(0, 0);
          ctx.restore();

          // off-screen pointer to the next ring
          if (ring < n) {
            const q = rings[ring], sx = q.x - camX, sy = q.y - camY;
            if (sx < 30 || sx > W - 30 || sy < 80 || sy > H - 30) {
              const a = Math.atan2(sy - H / 2, sx - W / 2);
              const ex = Math.max(36, Math.min(W - 36, sx)), ey = Math.max(96, Math.min(H - 36, sy));
              ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
              ctx.fillStyle = th.accent; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -11); ctx.lineTo(-10, 11); ctx.closePath(); ctx.fill();
              ctx.restore();
            }
          }
          if (timer < 6 && Math.floor(t * 4) % 2) api.text(`${Math.max(0, timer).toFixed(1)}`, W / 2, 120, 20, '#ff6b6b', 'center');
        }
      };
    }
  };
})();
