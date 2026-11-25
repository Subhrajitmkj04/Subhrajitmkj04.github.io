/* Renders the résumé version, the shared "cards" used by the game,
   and handles switching between the two versions. */
(function () {
  'use strict';
  const S = window.SITE;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const link = (url, label, cls) => url
    ? `<a class="${cls || ''}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>` : '';

  /* ---------- cards shown when a shard is collected ---------- */
  const Cards = {
    render(source, item, levelName) {
      const kicker = `<p class="kicker">◆ ${esc(levelName)}</p>`;
      if (source === 'journey') {
        return kicker + `<h3>${esc(item.year)} · ${esc(item.title)}</h3><p>${esc(item.text)}</p>`;
      }
      if (source === 'projects') {
        const l = item.links || {};
        return kicker + `<h3>${esc(item.name)}</h3><p>${esc(item.blurb)}</p>
          <div class="tags">${(item.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
          <div class="row">${link(l.repo, 'View repo', 'gbtn')}${link(l.demo, 'Live demo', 'gbtn ghost')}</div>`;
      }
      if (source === 'papers') {
        const l = item.links || {};
        return kicker + `<h3>${esc(item.title)}</h3><p>${item.authors ? esc(item.authors) + '<br>' : ''}<em>${esc(item.venue)}</em></p>
          ${item.summary ? `<p>${esc(item.summary)}</p>` : ''}
          <div class="row">${link(l.pdf, 'PDF', 'gbtn')}${link(l.page, 'Paper page', 'gbtn ghost')}${link(l.arxiv, 'arXiv', 'gbtn ghost')}</div>`;
      }
      if (source === 'experience') {
        return kicker + `<h3>${esc(item.role)} · ${esc(item.org)}</h3><p><em>${esc(item.period)}</em></p>
          <ul style="margin:0;padding-left:18px;color:#c9c3dc">${(item.points || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
      }
      if (source === 'education') {
        return kicker + `<h3>${esc(item.degree)}</h3><p>${esc(item.school)} · <em>${esc(item.period)}</em></p>${item.note ? `<p>${esc(item.note)}</p>` : ''}`;
      }
      if (source === 'skills') {
        return kicker + `<h3>${esc(item.group)}</h3><div class="tags">${(item.list || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`;
      }
      if (source === 'links') {
        return kicker + `<h3>${esc(item.label)}</h3><p>${esc(item.note)}</p>
          <div class="row">${link(item.url, 'Open ' + item.label + ' ↗', 'gbtn')}</div>`;
      }
      return kicker + `<pre>${esc(JSON.stringify(item, null, 2))}</pre>`;
    },
    // A whole portfolio section on one card (used by every game).
    section(sec, k, total, gameName) {
      const src = sec.source, data = S[src];
      const head = `<p class="kicker">◆ ${k + 1}/${total} · ${esc(gameName || 'Journal')}</p><h3>${esc(sec.title)}</h3>`;
      let body = '';
      if (src === 'skills') {
        body = Object.entries(data || {}).map(([g, v]) =>
          `<div class="sec-item"><b>${esc(g)}</b><div class="tags">${v.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>`).join('');
      } else {
        body = (data || []).map((it) => `<div class="sec-item">${this.render(src, it, '').replace(/^<p class="kicker">[^<]*<\/p>/, '')}</div>`).join('');
      }
      return head + `<div class="sec">${body || '<p>Nothing here yet.</p>'}</div>`;
    },
    title(item) {
      return item.title || item.name || item.label || (item.role && `${item.role} · ${item.org}`) || item.degree || item.group || 'Untitled';
    }
  };
  window.Cards = Cards;

  /* ---------- résumé version ---------- */
  function renderResume() {
    const p = S.profile;
    document.title = p.name;
    $('r-name').textContent = p.name;
    $('chooser-name').textContent = p.name;
    $('r-role').textContent = p.role;
    $('r-meta').innerHTML = [esc(p.location), p.email ? `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>` : '']
      .filter(Boolean).join(' · ');
    $('r-summary').textContent = p.summary;

    $('r-actions').innerHTML =
      (p.cv ? `<a class="btn primary" href="${esc(p.cv)}" target="_blank" rel="noopener">Download CV</a>` : '') +
      S.links.filter((l) => l.url !== p.cv && !l.url.startsWith('mailto:')).map((l) => link(l.url, l.label, 'btn')).join('');

    $('r-exp').innerHTML = S.experience.map((j) => `
      <div class="job">
        <div class="job-head"><strong>${esc(j.role)} · ${esc(j.org)}</strong><span>${esc(j.period)}</span></div>
        <ul>${j.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      </div>`).join('');

    $('r-projects').innerHTML = S.projects.map((pr) => {
      const l = pr.links || {};
      return `<article class="proj"><h3>${esc(pr.name)}</h3><p>${esc(pr.blurb)}</p>
        <div class="tags">${(pr.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="proj-links">${link(l.repo, 'Repo ↗')}${link(l.demo, 'Demo ↗')}</div></article>`;
    }).join('');

    $('r-papers').innerHTML = S.papers.map((pa) => {
      const l = pa.links || {};
      return `<li><span class="t">${esc(pa.title)}</span><br>
        <span class="a">${pa.authors ? esc(pa.authors) + ' · ' : ''}<em>${esc(pa.venue)}</em></span>
        <span class="l">${link(l.pdf, 'PDF')}${link(l.page, 'Page')}${link(l.arxiv, 'arXiv')}</span>
        ${pa.summary ? `<p class="s">${esc(pa.summary)}</p>` : ''}</li>`;
    }).join('');

    $('r-skills').innerHTML = Object.entries(S.skills).map(([k, v]) =>
      `<div class="skillrow"><b>${esc(k)}</b><div class="tags">${v.map((s) => `<span class="tag">${esc(s)}</span>`).join('')}</div></div>`
    ).join('');

    $('r-edu').innerHTML = S.education.map((e) => `
      <div class="job"><div class="job-head"><strong>${esc(e.degree)} · ${esc(e.school)}</strong><span>${esc(e.period)}</span></div>
      ${e.note ? `<p style="margin:4px 0 0;color:var(--muted)">${esc(e.note)}</p>` : ''}</div>`).join('');

    $('r-journey').innerHTML = S.journey.map((j) =>
      `<li><span class="y">${esc(j.year)}</span> <span class="tt">${esc(j.title)}</span><p>${esc(j.text)}</p></li>`).join('');

    $('r-foot').textContent = `© ${new Date().getFullYear()} ${p.name}`;
  }

  /* ---------- switching versions ---------- */
  const MODE_KEY = 'site-mode';
  function setMode(mode) {
    if (mode !== 'play' && mode !== 'hire') return;
    document.body.dataset.mode = mode;
    $('chooser').hidden = true;
    document.querySelectorAll('.switch [data-mode-btn]').forEach((b) =>
      b.classList.toggle('on', b.dataset.modeBtn === mode));
    try { localStorage.setItem(MODE_KEY, mode); } catch (e) { /* private mode */ }
    if (location.hash !== '#' + mode) history.replaceState(null, '', '#' + mode);
    if (window.Game) mode === 'play' ? window.Game.start() : window.Game.stop();
    if (mode === 'hire') window.scrollTo(0, 0);
  }
  window.App = { setMode };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-mode-btn]');
    if (b) setMode(b.dataset.modeBtn);
  });
  window.addEventListener('hashchange', () => setMode(location.hash.slice(1)));

  renderResume();

  // Link straight to a version with #play or #hire (send recruiters …/#hire).
  window.addEventListener('DOMContentLoaded', () => {
    const fromHash = location.hash.slice(1);
    let stored = null;
    try { stored = localStorage.getItem(MODE_KEY); } catch (e) { /* ignore */ }
    const initial = fromHash === 'play' || fromHash === 'hire' ? fromHash : stored;
    if (initial === 'play' || initial === 'hire') setMode(initial);
    else $('chooser').hidden = false;
  });
})();
