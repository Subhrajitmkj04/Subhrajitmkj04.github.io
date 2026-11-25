/* Road brawl: top-down bike race. Weave through traffic, shove rival riders
   off the road, pass checkpoints (each reveals an item) and reach the finish. */
(function () {
  'use strict';
  const M = (window.GameModes = window.GameModes || {});
  M.moto = {
    create(api) {
      const ctx = api.ctx, th = api.th, n = api.items.length;
      const CHECK = 450, FINISH = n * CHECK + 300; // metres: a checkpoint per entry, then the finish
      const MAXV = 600, CRUISE = 320;                        // px/s (10px = 1m)
      const CAR_COLORS = ['#5ff2ff', '#ff5fd2', '#9ee8ff', '#c4ff8a', '#ff9a5c', '#e6e6e6', '#8fb4ff'];
      const RIVALS = ['#ff5f7e', '#5f8bff', '#c792ff', '#ff9a3d'];
      const cars = [], rivals = [];
      let scroll = 0, v = 200, px = 0, pvx = 0, hp = 100, inv = 0, swing = 0, swingSide = 1, crashT = 0, wob = 0;
      let nextCk = 0, score = 0, done = false, ended = false, endT = 0, endWin = false, carGap = 300, rivalT = 2.5;

      const meters = () => scroll / 10;
      const roadW = () => Math.min(api.W * 0.8, 460);
      const pY = () => api.H * 0.74;
      const laneX = (l) => { const w = roadW(); return -w / 2 + w * (l + 0.5) / 4; };
      const sign = (x) => (x < 0 ? -1 : 1);

      function strike() {
        if (swing > 0 || done) return;
        swing = 0.28;
        const py = pY();
        let best = null, bd = 1e9;
        for (const r of rivals) {
          if (r.down) continue;
          const dx = r.x - px, dy = r.y - py;
          if (Math.abs(dy) < 55 && Math.abs(dx) < 85 && Math.abs(dx) < bd) { best = r; bd = Math.abs(dx); }
        }
        if (best) {
          swingSide = sign(best.x - px);
          best.down = true; best.vx = swingSide * 240; score += 150;
          api.burst(api.W / 2 + best.x, best.y, best.c, 16);
        } else swingSide = pvx >= 0 ? 1 : -1;
      }

      function drawCar(x, y, c) {
        ctx.fillStyle = 'rgba(0,0,0,.3)'; api.rr(x - c.w / 2 + 4, y - c.h / 2 + 6, c.w, c.h, 8); ctx.fill();
        ctx.fillStyle = '#111';
        ctx.fillRect(x - c.w / 2 - 3, y - c.h / 2 + 10, 5, 14); ctx.fillRect(x + c.w / 2 - 2, y - c.h / 2 + 10, 5, 14);
        ctx.fillRect(x - c.w / 2 - 3, y + c.h / 2 - 24, 5, 14); ctx.fillRect(x + c.w / 2 - 2, y + c.h / 2 - 24, 5, 14);
        ctx.fillStyle = c.c; api.rr(x - c.w / 2, y - c.h / 2, c.w, c.h, 8); ctx.fill();
        if (c.truck) {
          ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x - c.w / 2 + 3, y - c.h / 2 + 28, c.w - 6, c.h - 32);
          ctx.fillStyle = '#1b2433'; api.rr(x - c.w / 2 + 5, y - c.h / 2 + 6, c.w - 10, 14, 3); ctx.fill();
        } else {
          ctx.fillStyle = '#1b2433'; api.rr(x - c.w / 2 + 5, y - c.h / 2 + 12, c.w - 10, 13, 3); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.18)'; api.rr(x - c.w / 2 + 6, y - 6, c.w - 12, 18, 4); ctx.fill();
          ctx.fillStyle = '#1b2433'; api.rr(x - c.w / 2 + 6, y + c.h / 2 - 16, c.w - 12, 8, 3); ctx.fill();
        }
        ctx.fillStyle = '#ff4d4d'; ctx.fillRect(x - c.w / 2 + 3, y + c.h / 2 - 4, 7, 3); ctx.fillRect(x + c.w / 2 - 10, y + c.h / 2 - 4, 7, 3);
      }
      function drawBike(x, y, jacket, helmet, rot, sw, side, ghost) {
        if (ghost && Math.floor(api.t * 16) % 2) return;
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(4, 6, 12, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#111'; api.rr(-5, -32, 10, 17, 4); ctx.fill(); api.rr(-5, 15, 10, 17, 4); ctx.fill();
        ctx.fillStyle = '#3a3550'; api.rr(-7, -20, 14, 38, 5); ctx.fill();
        ctx.fillStyle = '#bbb'; ctx.fillRect(-12, -18, 24, 3);
        if (sw > 0) {
          ctx.strokeStyle = jacket; ctx.lineWidth = 6; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(side * 10, -2); ctx.lineTo(side * 36, -8); ctx.stroke();
          ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(side * 38, -8, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = jacket; api.rr(-13, -6, 26, 16, 7); ctx.fill();
        ctx.fillStyle = helmet; ctx.beginPath(); ctx.arc(0, -6, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1b1530'; ctx.fillRect(-5, -13, 10, 4);
        ctx.restore();
      }

      return {
        hint: '↑ throttle   ↓ brake   ← →  steer   Space  shove rivals',
        stat() {
          const m = meters(), toGo = nextCk < n ? CHECK * (nextCk + 1) - m : FINISH - m;
          return `${Math.round(v * 0.3)} km/h   ♥ ${Math.max(0, Math.round(hp))}   ${Math.max(0, Math.ceil(toGo))} m to ${nextCk < n ? '◆' : 'finish'}`;
        },
        press(k) { if (k === 'action') strike(); },
        update(dt) {
          const keys = api.keys, H = api.H, half = roadW() / 2, py = pY();
          inv = Math.max(0, inv - dt); swing = Math.max(0, swing - dt); wob = Math.max(0, wob - dt);
          if (done) {
            v = Math.max(0, v - 400 * dt); scroll += v * dt; endT -= dt;
            if (endT <= 0 && !ended) { ended = true; endWin ? api.complete() : api.fail('Wiped out!'); }
            return;
          }
          if (crashT > 0) { crashT -= dt; v = Math.max(0, v - 900 * dt); }
          else {
            if (keys.up) v += 300 * dt; else if (v > CRUISE) v -= 90 * dt; else v += 120 * dt;
            if (keys.down) v -= 700 * dt;
            if (Math.abs(px) > half - 14 && v > 230) v -= 600 * dt;
            v = Math.max(0, Math.min(MAXV, v));
            const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
            pvx += (steer * 320 - pvx) * Math.min(1, dt * 9);
          }
          px = Math.max(-half - 50, Math.min(half + 50, px + pvx * dt));
          scroll += v * dt;

          carGap -= v * dt;
          if (carGap <= 0) {
            carGap = 260 + Math.random() * 380 - Math.min(160, meters() * 0.05);
            const sp = 150 + Math.random() * 170;
            if (v > sp + 20) {
              const truck = Math.random() < 0.18;
              cars.push({ x: laneX(Math.floor(Math.random() * 4)), y: -110, sp, c: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)], w: truck ? 44 : 38, h: truck ? 104 : 66, truck });
            }
          }
          for (let i = cars.length - 1; i >= 0; i--) {
            const c = cars[i]; c.y += (v - c.sp) * dt;
            if (c.y > H + 150 || c.y < -500) cars.splice(i, 1);
          }

          rivalT -= dt;
          if (rivalT <= 0 && rivals.filter((r) => !r.down).length < 3) {
            rivalT = 3 + Math.random() * 4;
            const sp = CRUISE + 60 + Math.random() * 200;
            rivals.push({ x: (Math.random() - 0.5) * roadW() * 0.7, y: v > sp ? -60 : H + 60, sp, c: RIVALS[Math.floor(Math.random() * RIVALS.length)],
              atk: 1 + Math.random() * 1.5, swing: 0, down: false, rot: 0, vx: 0 });
          }
          for (let i = rivals.length - 1; i >= 0; i--) {
            const r = rivals[i];
            if (r.down) { r.rot += 7 * dt; r.sp = Math.max(0, r.sp - 500 * dt); r.x += r.vx * dt; r.vx *= Math.pow(0.3, dt); }
            else {
              const dy = r.y - py, dx = px - r.x;
              if (Math.abs(dy) < 240) {
                r.sp += (v + sign(dy) * Math.min(90, Math.abs(dy)) - r.sp) * Math.min(1, dt * 1.5);
                const tx = px - sign(dx) * 40;
                r.x += Math.max(-150 * dt, Math.min(150 * dt, tx - r.x));
              }
              r.swing = Math.max(0, r.swing - dt);
              if (Math.abs(dy) < 40 && Math.abs(dx) < 70) {
                r.atk -= dt;
                if (r.atk <= 0) {
                  r.atk = 1.2 + Math.random() * 1.3; r.swing = 0.25;
                  if (inv <= 0) { hp -= 8; pvx += sign(dx) * 300; wob = 0.3; api.shake(0.15); }
                }
              }
              if (Math.abs(dy) < 44 && Math.abs(dx) < 24) { pvx += sign(dx) * 160; r.x -= sign(dx) * 6; }
              for (const c of cars) {
                if (Math.abs(c.x - r.x) < c.w / 2 + 8 && Math.abs(c.y - r.y) < c.h / 2 + 20) {
                  r.down = true; r.vx = r.x < c.x ? -160 : 160; api.burst(api.W / 2 + r.x, r.y, '#ff6b6b', 12); break;
                }
              }
            }
            r.y += (v - r.sp) * dt;
            if (r.y > H + 200 || r.y < -500) rivals.splice(i, 1);
          }

          if (inv <= 0 && crashT <= 0) {
            for (const c of cars) {
              if (Math.abs(c.x - px) < c.w / 2 + 9 && Math.abs(c.y - py) < c.h / 2 + 22) {
                hp -= 25; crashT = 0.8; inv = 2; v *= 0.25;
                api.shake(0.45); api.flash(0.25); api.burst(api.W / 2 + px, py, '#ffb37a', 26);
                break;
              }
            }
          }
          const m = meters();
          while (nextCk < n && m >= CHECK * (nextCk + 1)) { api.reveal(nextCk); nextCk++; hp = Math.min(100, hp + 15); score += 300; }
          if (hp <= 0) { done = true; endWin = false; endT = 1; }
          else if (m >= FINISH) { done = true; endWin = true; endT = 1; score += 1000; }
        },
        draw() {
          const W = api.W, H = api.H, half = roadW() / 2, cx = W / 2, py = pY();
          ctx.fillStyle = th.near; ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = th.far;
          for (let y = -160 + (scroll % 160); y < H; y += 160) ctx.fillRect(0, y, W, 80);
          for (let k = 0; k < 14; k++) {
            const y = ((k * 137 + scroll) % (H + 200)) - 100, rad = 14 + (k % 3) * 5;
            ctx.fillStyle = th.ground;
            ctx.beginPath(); ctx.arc(cx - half - 40 - ((k * 53) % 120), y, rad, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + half + 40 + ((k * 71) % 120), y + 60, rad, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#2b2a33'; ctx.fillRect(cx - half, 0, half * 2, H);
          for (let y = -80 + (scroll % 80); y < H; y += 80) {
            ctx.fillStyle = '#e8e8e8'; ctx.fillRect(cx - half - 10, y, 10, 40); ctx.fillRect(cx + half, y, 10, 40);
            ctx.fillStyle = '#ff5f5f'; ctx.fillRect(cx - half - 10, y + 40, 10, 40); ctx.fillRect(cx + half, y + 40, 10, 40);
          }
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          for (let l = 1; l < 4; l++) {
            const x = cx - half + (half * 2 * l) / 4;
            for (let y = -80 + (scroll % 80); y < H; y += 80) ctx.fillRect(x - 2, y, 4, 40);
          }
          const m = meters();
          const line = (mm, label) => {
            const y = py - (mm - m) * 10;
            if (y < -60 || y > H + 40) return;
            const sq = 16;
            for (let i = 0; i * sq < half * 2; i++) for (let j = 0; j < 2; j++) {
              ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff';
              ctx.fillRect(cx - half + i * sq, y - sq * 2 + j * sq, Math.min(sq, half * 2 - i * sq), sq);
            }
            ctx.fillStyle = 'rgba(10,8,20,.7)'; api.rr(cx - 90, y - 66, 180, 26, 6); ctx.fill();
            api.text(label, cx, y - 53, 9, th.accent, 'center');
          };
          for (let k = 0; k < n; k++) line(CHECK * (k + 1), `CHECKPOINT ${k + 1}`);
          line(FINISH, 'FINISH');

          for (const c of cars) drawCar(cx + c.x, c.y, c);
          for (const r of rivals) drawBike(cx + r.x, r.y, r.c, '#2b2a33', r.rot, r.swing, sign(px - r.x), false);
          drawBike(cx + px, py, '#ffd166', '#ffd166', wob > 0 ? Math.sin(api.t * 50) * 0.12 : pvx / 2400, swing, swingSide, inv > 0);
          if (v > 470) {
            ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2;
            for (let k = 0; k < 8; k++) {
              const x = (k * 197 + api.t * 50) % W, y = (k * 311 + scroll * 1.5) % H;
              ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 40); ctx.stroke();
            }
          }
          api.drawParticles(0, 0);
        }
      };
    }
  };
})();
