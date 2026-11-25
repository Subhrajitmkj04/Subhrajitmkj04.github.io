/* Maze chase: eat every dot, dodge the glitches. Each glowing ◆ reveals an item
   and makes the glitches flee for a few seconds (you can catch them then).
   Legend: # wall · . dot · o shard spot · P player start · E glitch start */
(function () {
  'use strict';
  const MAP = [
    '###################',
    '#o.......#.......o#',
    '#.##.###.#.###.##.#',
    '#o...............o#',
    '#.##.#.#####.#.##.#',
    '#....#...#...#....#',
    '####.###.#.###.####',
    '####.#..EEE..#.####',
    '####.#.#####.#.####',
    '#........#........#',
    '#.##.###.#.###.##.#',
    '#o.#.....P.....#.o#',
    '##.#.#.#####.#.#.##',
    '#o...#...#...#...o#',
    '###################'
  ];
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const COLORS = ['#ff5f7e', '#5ff2ff', '#c792ff'];
  const M = (window.GameModes = window.GameModes || {});

  M.maze = {
    create(api) {
      const ctx = api.ctx, th = api.th, n = api.items.length;
      const R = MAP.length, C = MAP[0].length;
      const wall = (x, y) => x < 0 || y < 0 || x >= C || y >= R || MAP[y][x] === '#';
      const dots = new Set(), cand = [], eStarts = [];
      let pStart = [9, 11];
      MAP.forEach((row, y) => [...row].forEach((ch, x) => {
        if (ch === '.') dots.add(x + ',' + y);
        else if (ch === 'o') cand.push([x, y]);
        else if (ch === 'P') pStart = [x, y];
        else if (ch === 'E') eStarts.push([x, y]);
      }));
      const orbs = [];
      cand.forEach((c, i) => { if (i < n) orbs.push({ x: c[0], y: c[1], i, on: true }); else dots.add(c[0] + ',' + c[1]); });
      const extra = []; for (let k = orbs.length; k < n; k++) extra.push(k);

      const ent = (p, speed) => ({ cx: p[0], cy: p[1], nx: p[0], ny: p[1], p: 0, dir: [0, 0], speed });
      let player, enemies, lives = 3, fright = 0, score = 0, chain = 0, ready = 0, dying = 0, done = false;
      let ts = 30, ox = 0, oy = 0; // layout, set in draw()

      function place() {
        player = Object.assign(ent(pStart, 5.6), { want: [0, 0], face: 1 });
        enemies = eStarts.map((s, i) => Object.assign(ent(s, 4.2), { c: COLORS[i % 3], wait: 1 + i * 2.5, fr: false, kind: i, home: s }));
        ready = 1.6;
      }
      place();

      const pos = (e) => [e.cx + (e.nx - e.cx) * e.p, e.cy + (e.ny - e.cy) * e.p];
      const moving = (e) => e.dir[0] !== 0 || e.dir[1] !== 0;
      const open = (e, d) => !wall(e.cx + d[0], e.cy + d[1]);
      const reverse = (e) => {
        if (!moving(e)) return;
        let t = e.cx; e.cx = e.nx; e.nx = t; t = e.cy; e.cy = e.ny; e.ny = t;
        e.p = 1 - e.p; e.dir = [-e.dir[0], -e.dir[1]];
      };
      const toScreen = (x, y) => [ox + (x + 0.5) * ts, oy + (y + 0.5) * ts];

      function step(e, dt, choose, arrive) {
        if (!moving(e)) {
          const d = choose(e); if (!d) return;
          e.dir = d; e.nx = e.cx + d[0]; e.ny = e.cy + d[1]; e.p = 0;
        }
        e.p += e.speed * dt;
        while (e.p >= 1) {
          e.p -= 1; e.cx = e.nx; e.cy = e.ny;
          if (arrive) arrive(e);
          const d = choose(e);
          if (d) { e.dir = d; e.nx = e.cx + d[0]; e.ny = e.cy + d[1]; }
          else { e.dir = [0, 0]; e.nx = e.cx; e.ny = e.cy; e.p = 0; break; }
        }
      }
      function choosePlayer(e) {
        if ((e.want[0] || e.want[1]) && open(e, e.want)) return e.want;
        if (moving(e) && open(e, e.dir)) return e.dir;
        return null;
      }
      function chooseEnemy(e) {
        const fwd = DIRS.filter((d) => open(e, d) && !(moving(e) && d[0] === -e.dir[0] && d[1] === -e.dir[1]));
        const list = fwd.length ? fwd : DIRS.filter((d) => open(e, d));
        if (!list.length) return null;
        if (Math.random() < (e.fr ? 0.45 : 0.18)) return list[Math.floor(Math.random() * list.length)];
        const pp = pos(player);
        let tx = pp[0], ty = pp[1];
        if (e.kind === 1) { tx += player.dir[0] * 4; ty += player.dir[1] * 4; }       // cuts you off
        if (e.kind === 2 && Math.sin(api.t * 0.6) > 0.2) { tx = C - 1 - tx; ty = R - 1 - ty; } // wanders
        let best = list[0], bd = e.fr ? -1 : 1e9;
        list.forEach((d) => {
          const dd = Math.hypot(e.cx + d[0] - tx, e.cy + d[1] - ty);
          if (e.fr ? dd > bd : dd < bd) { bd = dd; best = d; }
        });
        return best;
      }
      function eat(e) {
        if (dots.delete(e.cx + ',' + e.cy)) score += 10;
        const o = orbs.find((q) => q.on && q.x === e.cx && q.y === e.cy);
        if (o) {
          o.on = false; score += 100; fright = 7; chain = 0;
          enemies.forEach((en) => { if (en.wait <= 0) { en.fr = true; reverse(en); } });
          const s = toScreen(o.x, o.y); api.burst(s[0], s[1], th.accent, 26);
          api.reveal(o.i);
        }
      }

      return {
        hint: 'Find every ◆ to clear the stage.  Grabbing one makes the glitches run',
        stat: () => `lives ${'♥'.repeat(Math.max(0, lives))}   dots ${dots.size}   score ${score}`,
        press(k) {
          const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[k];
          if (!d || !player) return;
          player.want = d;
          if (moving(player) && d[0] === -player.dir[0] && d[1] === -player.dir[1]) reverse(player);
        },
        update(dt) {
          if (done) return;
          if (ready > 0) { ready -= dt; return; }
          if (dying > 0) {
            dying -= dt;
            if (dying <= 0) { if (lives <= 0) { done = true; api.fail('Caught by the glitches!'); } else place(); }
            return;
          }
          if (fright > 0) { fright -= dt; if (fright <= 0) enemies.forEach((e) => { e.fr = false; }); }
          step(player, dt, choosePlayer, eat);
          if (player.dir[0]) player.face = player.dir[0];
          for (const e of enemies) {
            if (e.wait > 0) { e.wait -= dt; continue; }
            e.speed = e.fr ? 2.6 : 4.2 + Math.min(1, (1 - dots.size / 150)) * 0.8;
            step(e, dt, chooseEnemy);
          }
          const pp = pos(player);
          for (const e of enemies) {
            const ep = pos(e);
            if (Math.hypot(pp[0] - ep[0], pp[1] - ep[1]) > 0.65) continue;
            if (e.fr) {
              chain++; score += 200 * chain;
              const s = toScreen(ep[0], ep[1]); api.burst(s[0], s[1], e.c, 18);
              Object.assign(e, ent(e.home, 4.2), { fr: false, wait: 3 });
            } else {
              lives--; dying = 1.3; api.shake(0.3); api.flash(0.25);
              return;
            }
          }
          // stage clears once every ◆ is found (or the board is emptied); leftover dots are just score
          if (orbs.every((o) => !o.on) && (orbs.length > 0 || dots.size === 0)) {
            done = true; score += 1000;
            extra.forEach((k) => api.reveal(k));
            api.complete();
          }
        },
        draw() {
          const W = api.W, H = api.H, t = api.t;
          ts = Math.floor(Math.min((W - 20) / C, (H - 130) / R));
          ox = Math.round((W - C * ts) / 2);
          oy = Math.round(Math.max(84, (H - R * ts) / 2 + 30));
          api.sky(th, 0);
          ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(ox - 6, oy - 6, C * ts + 12, R * ts + 12);
          ctx.strokeStyle = th.top; ctx.lineWidth = 2;
          for (let y = 0; y < R; y++) for (let x = 0; x < C; x++) {
            if (!wall(x, y)) continue;
            const X = ox + x * ts, Y = oy + y * ts;
            ctx.fillStyle = th.near; ctx.fillRect(X, Y, ts, ts);
            ctx.beginPath();
            if (y > 0 && !wall(x, y - 1)) { ctx.moveTo(X, Y + 1); ctx.lineTo(X + ts, Y + 1); }
            if (y < R - 1 && !wall(x, y + 1)) { ctx.moveTo(X, Y + ts - 1); ctx.lineTo(X + ts, Y + ts - 1); }
            if (x > 0 && !wall(x - 1, y)) { ctx.moveTo(X + 1, Y); ctx.lineTo(X + 1, Y + ts); }
            if (x < C - 1 && !wall(x + 1, y)) { ctx.moveTo(X + ts - 1, Y); ctx.lineTo(X + ts - 1, Y + ts); }
            ctx.stroke();
          }
          ctx.fillStyle = '#e8ecff';
          const ds = Math.max(3, Math.round(ts * 0.14));
          dots.forEach((key) => {
            const c = key.split(','), s = toScreen(+c[0], +c[1]);
            ctx.fillRect(s[0] - ds / 2, s[1] - ds / 2, ds, ds);
          });
          for (const o of orbs) if (o.on) { const s = toScreen(o.x, o.y); api.diamond(s[0], s[1], ts * 0.36, th.accent, t * 2 + o.i); }
          for (const e of enemies) {
            const p = pos(e), s = toScreen(p[0], p[1]), z = ts * 0.78;
            const blink = e.fr && fright < 1.8 && Math.floor(t * 8) % 2;
            ctx.fillStyle = e.fr ? (blink ? '#fff' : '#3b4cc0') : e.c;
            const jx = Math.sin(t * 30 + e.kind) * 0.8;
            api.rr(s[0] - z / 2 + jx, s[1] - z / 2, z, z * 0.82, z * 0.3); ctx.fill();
            for (let k = 0; k < 4; k++) ctx.fillRect(s[0] - z / 2 + k * z / 4 + jx, s[1] + z * 0.28, z / 8, z * 0.16 + (k % 2 ? 0 : 3));
            const dx = e.dir[0] * z * 0.08, dy = e.dir[1] * z * 0.08;
            ctx.fillStyle = '#fff'; ctx.fillRect(s[0] - z * 0.28, s[1] - z * 0.18, z * 0.2, z * 0.24); ctx.fillRect(s[0] + z * 0.08, s[1] - z * 0.18, z * 0.2, z * 0.24);
            ctx.fillStyle = '#111'; ctx.fillRect(s[0] - z * 0.22 + dx, s[1] - z * 0.1 + dy, z * 0.1, z * 0.12); ctx.fillRect(s[0] + z * 0.14 + dx, s[1] - z * 0.1 + dy, z * 0.1, z * 0.12);
          }
          if (!(dying > 0 && Math.floor(t * 12) % 2)) {
            const p = pos(player), s = toScreen(p[0], p[1]), sc = (ts * 0.8) / 34;
            api.mascot(s[0] - 14 * sc, s[1] + 17 * sc, { w: 28, h: 34, face: player.face, sq: 0, hurt: 0 }, sc);
          }
          if (ready > 0) {
            ctx.fillStyle = 'rgba(10,8,20,.7)'; api.rr(W / 2 - 70, oy + 9 * ts - 4, 140, ts + 8, 8); ctx.fill();
            api.text('READY', W / 2, oy + 9.5 * ts, 14, th.accent, 'center');
          }
          api.drawParticles(0, 0);
        }
      };
    }
  };
})();
