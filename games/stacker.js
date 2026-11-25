/* Tower stacker: a floor swings across on the crane, drop it on the one below.
   Overhang gets sliced off; perfect drops keep (and slowly regrow) the width.
   Every PER floors reveals the next item; reach the roof to clear the level. */
(function () {
  'use strict';
  const M = (window.GameModes = window.GameModes || {});
  M.stacker = {
    create(api) {
      const ctx = api.ctx, th = api.th, n = Math.max(1, api.items.length);
      const PER = n <= 2 ? 4 : 3, GOAL = n * PER, FH = 30, BASEW = 220, RANGE = 330;
      const blocks = [{ x: -BASEW / 2, w: BASEW }];
      const falling = [];
      let cur = null, floors = 0, camY = 0, combo = 0, score = 0, perfectT = 0, endT = -1, win = false, over = false;

      function spawn() {
        const top = blocks[blocks.length - 1], fromLeft = floors % 2 === 0;
        cur = { x: fromLeft ? -RANGE : RANGE - top.w, w: top.w, dir: fromLeft ? 1 : -1, sp: Math.min(150 + floors * 11, 440) };
      }
      spawn();

      function drop() {
        if (!cur || over) return;
        const top = blocks[blocks.length - 1], j = blocks.length;
        const L = Math.max(cur.x, top.x), R = Math.min(cur.x + cur.w, top.x + top.w);
        if (R - L <= 1) {
          falling.push({ x: cur.x, w: cur.w, j, vy: 0, yo: 0, rot: 0, vr: cur.x < top.x ? -2 : 2 });
          cur = null; over = true; endT = 1.2; api.shake(0.4);
          return;
        }
        if (Math.abs(cur.x - top.x) < 6) {
          cur.x = top.x; combo++; score += 50 * combo; perfectT = 0.9;
          if (combo >= 3 && cur.w < BASEW) { const g = Math.min(BASEW - cur.w, 12); cur.x -= g / 2; cur.w += g; }
        } else {
          combo = 0; score += 10;
          if (cur.x < L) falling.push({ x: cur.x, w: L - cur.x, j, vy: 0, yo: 0, rot: 0, vr: -1.6 });
          if (cur.x + cur.w > R) falling.push({ x: R, w: cur.x + cur.w - R, j, vy: 0, yo: 0, rot: 0, vr: 1.6 });
          cur.x = L; cur.w = R - L;
        }
        blocks.push({ x: cur.x, w: cur.w });
        floors++;
        if (floors % PER === 0) { const k = floors / PER - 1; if (k < api.items.length) api.reveal(k); }
        if (floors % PER === 0 && cur.w < BASEW) { const g = Math.min(BASEW - cur.w, 40); blocks[blocks.length - 1].x -= g / 2; blocks[blocks.length - 1].w += g; cur.x -= g / 2; cur.w += g; } // milestone: widen a bit
        if (floors >= GOAL) { cur = null; over = true; win = true; endT = 0.7; score += 500; return; }
        spawn();
      }

      // simple deterministic hash for window lights
      const lit = (a, b) => Math.abs((a * 73856093) ^ (b * 19349663)) % 7 > 2;
      const COLORS = ['#7aa2ff', '#ff8fa3', '#7be0a5', '#ffc36b', '#c792ff', '#5ff2ff'];

      return {
        hint: 'Space / ↓  drop the floor. Line it up with the one below',
        stat: () => `floor ${floors}/${GOAL}   score ${score}`,
        press(k) { if (k === 'action' || k === 'down' || k === 'up') drop(); },
        update(dt) {
          if (cur) {
            cur.x += cur.dir * cur.sp * dt;
            if (cur.x + cur.w > RANGE) { cur.x = RANGE - cur.w; cur.dir = -1; }
            if (cur.x < -RANGE) { cur.x = -RANGE; cur.dir = 1; }
          }
          for (let i = falling.length - 1; i >= 0; i--) {
            const f = falling[i]; f.vy += 1400 * dt; f.yo += f.vy * dt; f.rot += f.vr * dt;
            if (f.yo > 2000) falling.splice(i, 1);
          }
          perfectT = Math.max(0, perfectT - dt);
          if (endT > 0) { endT -= dt; if (endT <= 0) { win ? api.complete() : api.fail('The tower toppled!'); } }
        },
        draw() {
          const W = api.W, H = api.H, t = api.t;
          const s = Math.min(1, W / 780), ground = H - 70;
          const towerTop = (blocks.length + 1) * FH;
          const want = Math.max(0, (towerTop * s - ground + H * 0.45) / s);
          camY += (want - camY) * 0.08;

          // sky darkens as the tower grows
          api.sky(th, 0);
          const dark = Math.min(0.7, camY / 2000);
          ctx.fillStyle = `rgba(5,4,20,${dark})`; ctx.fillRect(0, 0, W, H);
          if (camY > 200) {
            ctx.fillStyle = '#fff';
            for (let k = 0; k < 60; k++) {
              ctx.globalAlpha = Math.min(1, (camY - 200) / 800) * (0.3 + 0.5 * Math.abs(Math.sin(t + k)));
              ctx.fillRect((k * 977) % W, ((k * 431) + camY * 0.05) % H, 2, 2);
            }
            ctx.globalAlpha = 1;
          }
          // city skyline (parallax)
          const layer = (color, par, seed, minH) => {
            ctx.fillStyle = color;
            for (let k = 0; k < 26; k++) {
              const w = 40 + ((k * seed) % 50), h = minH + ((k * seed * 7) % 170);
              const x = ((k * 71 + seed) % (W + 120)) - 60;
              ctx.fillRect(x, ground - h + camY * s * par, w, h + 400);
            }
          };
          layer(th.far, 0.25, 37, 90);
          layer(th.near, 0.55, 53, 50);

          ctx.save();
          ctx.translate(W / 2, ground + camY * s);
          ctx.scale(s, s);
          // ground
          ctx.fillStyle = th.ground; ctx.fillRect(-W / s, 0, (W / s) * 2, 2000);
          ctx.fillStyle = th.top; ctx.fillRect(-W / s, 0, (W / s) * 2, 5);
          // milestone markers + roof line
          for (let k = 1; k <= n; k++) {
            const y = -(k * PER + 1) * FH;
            ctx.strokeStyle = k === n ? th.accent : 'rgba(255,255,255,.18)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]);
            ctx.beginPath(); ctx.moveTo(-RANGE - 40, y); ctx.lineTo(RANGE + 40, y); ctx.stroke(); ctx.setLineDash([]);
            const got = floors >= k * PER;
            api.diamond(-RANGE - 60, y, 9, got ? th.accent : 'rgba(255,255,255,.35)', got ? 0 : t * 2);
            if (k === n) api.text('ROOF', RANGE + 70, y, 9, th.accent, 'center');
          }
          // tower
          const drawBlock = (x, y, w, j) => {
            ctx.fillStyle = j === 0 ? '#3a3550' : COLORS[j % COLORS.length];
            ctx.fillRect(x, y, w, FH);
            ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y + FH - 4, w, 4);
            ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x, y, w, 3);
            for (let wx = x + 8; wx < x + w - 12; wx += 18) {
              ctx.fillStyle = lit(j, Math.round(wx)) ? '#fff3c4' : 'rgba(0,0,0,.35)';
              ctx.fillRect(wx, y + 9, 9, 12);
            }
          };
          blocks.forEach((b, j) => drawBlock(b.x, -(j + 1) * FH, b.w, j));
          for (const f of falling) {
            ctx.save();
            ctx.translate(f.x + f.w / 2, -(f.j + 1) * FH + FH / 2 + f.yo);
            ctx.rotate(f.rot);
            drawBlock(-f.w / 2, -FH / 2, f.w, f.j);
            ctx.restore();
          }
          if (cur) {
            const y = -(blocks.length + 1) * FH, cx = cur.x + cur.w / 2;
            const top = blocks[blocks.length - 1];
            ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(top.x, y, top.w, FH);
            ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(cx, y - 600); ctx.lineTo(cx, y - 10); ctx.stroke();
            ctx.fillStyle = '#ddd'; ctx.fillRect(cx - 10, y - 12, 20, 6);
            drawBlock(cur.x, y, cur.w, blocks.length);
          }
          if (perfectT > 0) {
            ctx.globalAlpha = Math.min(1, perfectT * 2);
            api.text(combo > 1 ? `PERFECT ×${combo}` : 'PERFECT', 0, -(blocks.length + 3) * FH, 14, th.accent, 'center');
            ctx.globalAlpha = 1;
          }
          ctx.restore();
        }
      };
    }
  };
})();
