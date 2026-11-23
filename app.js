/* Good Kid Gacha - game logic. Songs/albums/scoring live in data.js. */
const PACK_SIZE = 5, PACK_CAP = 10, PACK_MS = 10 * 60 * 1000, START_PACKS = 3;
const TIERS = [['legendary', 2500], ['epic', 1200], ['rare', 500], ['uncommon', 200], ['common', 0]];

const $ = s => document.querySelector(s);
const byId = Object.fromEntries(SONGS.map(s => [s.id, s]));
const albumOf = s => ALBUMS.find(a => a.id === s.album);
const albumSongs = a => SONGS.filter(s => s.album === a.id);
const topStreams = Math.max(1, ...SONGS.filter(s => !s.unreleased).map(s => s.streams));

/* ---------- points & rarity ---------- */
const pts = s => s.unreleased ? UNRELEASED_POINTS
  : Math.max(10, Math.round(TOP_POINTS * Math.pow(s.streams / topStreams, POINTS_CURVE)));
const tier = s => s.unreleased ? 'unreleased' : TIERS.find(([, min]) => pts(s) >= min)[0];
const bonus = a => Math.round(albumSongs(a).reduce((t, s) => t + pts(s), 0) * ALBUM_BONUS);

/* ---------- save data: owned[id] = {n: total copies, holo: holo copies} ---------- */
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch { return d; } };
const state = read('gkgacha.v2', { owned: {}, claimed: {}, packs: START_PACKS, tick: Date.now(), pending: null });
const mediaCache = read('gkgacha.media', {});
const save = () => localStorage.setItem('gkgacha.v2', JSON.stringify(state));

const complete = a => albumSongs(a).length > 0 && albumSongs(a).every(s => state.owned[s.id]);
const worth = s => state.owned[s.id] ? pts(s) * (state.owned[s.id].holo ? HOLO_MULT : 1) : 0;
const score = () => SONGS.reduce((t, s) => t + worth(s), 0) +
  ALBUMS.reduce((t, a) => t + (state.claimed[a.id] ? bonus(a) : 0), 0);
const updateScore = () => { $('#score').textContent = score().toLocaleString() + ' pts'; };

/* ---------- pack timer ---------- */
function regen() {
  const n = Math.floor((Date.now() - state.tick) / PACK_MS);
  if (n <= 0) return;
  state.packs = Math.min(PACK_CAP, state.packs + n);
  state.tick = state.packs >= PACK_CAP ? Date.now() : state.tick + n * PACK_MS;
  save();
}

/* ---------- drawing (rarer = lower weight) ---------- */
function draw() {
  const w = SONGS.map(s => 1 / pts(s));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < SONGS.length; i++) if ((r -= w[i]) <= 0) return SONGS[i];
  return SONGS[0];
}
const drawOption = () => { const s = draw(); return { id: s.id, holo: !s.unreleased && Math.random() < HOLO_CHANCE }; };

/* ---------- cover + audio (iTunes lookup unless set in data.js) ---------- */
const norm = t => t.toLowerCase().replace(/[’‘]/g, "'");
async function getMedia(s) {
  if (s.cover || s.audio) return { cover: s.cover, audio: s.audio };
  if (mediaCache[s.id]) return mediaCache[s.id];
  try {
    const res = await fetch('https://itunes.apple.com/search?entity=song&limit=10&term=' + encodeURIComponent('Good Kid ' + s.title));
    const hit = (await res.json()).results.find(x =>
      norm(x.artistName) === 'good kid' && norm(x.trackName).startsWith(norm(s.title)));
    if (!hit) return {};
    mediaCache[s.id] = { cover: hit.artworkUrl100.replace('100x100', '600x600'), audio: hit.previewUrl };
    localStorage.setItem('gkgacha.media', JSON.stringify(mediaCache));
    return mediaCache[s.id];
  } catch { return {}; }
}
const player = new Audio();
async function play(s) {
  const m = await getMedia(s);
  if (!m.audio) return toast('No audio found for this song yet');
  player.src = m.audio; player.play(); toast('Playing: ' + s.title);
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- card markup ---------- */
function card(s, { owned = true, holo = false, count = 0, isNew = false, pick = -1, i = 0 } = {}) {
  const t = tier(s), a = albumOf(s);
  return `<div class="card t-${t}${holo ? ' holo' : ''}${owned ? '' : ' locked'}" data-id="${s.id}"${pick >= 0 ? ` data-pick="${pick}"` : ''} style="--i:${i}">
    <div class="art">${owned ? `<img data-cover="${s.id}" alt="">` : '<span>?</span>'}</div>
    <em class="tag">${t}${holo ? ' · holo' : ''}</em>${isNew ? '<em class="new">NEW</em>' : ''}
    <b>${owned ? s.title : '???'}</b>
    <small>${owned ? `${a.name} · ${s.made.slice(0, 4)}` : 'Not collected'}</small>
    <div class="pts">${(pts(s) * (holo ? HOLO_MULT : 1)).toLocaleString()} pts</div>${count > 1 ? `<i class="cnt">x${count}</i>` : ''}
  </div>`;
}
const hydrate = root => root.querySelectorAll('img[data-cover]').forEach(img =>
  getMedia(byId[img.dataset.cover]).then(m => { if (m.cover) img.src = m.cover; }));
const cardOf = s => { const o = state.owned[s.id]; return card(s, { owned: !!o, holo: !!(o && o.holo), count: o ? o.n : 0 }); };

/* ---------- views ---------- */
function viewPacks() {
  if (state.pending) return viewPick();
  $('#app').innerHTML = `
    <section class="panel center">
      <div class="packcount"><b id="pc"></b> / ${PACK_CAP} packs</div>
      <p class="muted" id="timer"></p>
      <button class="btn" id="open">Open pack (pick 1 of ${PACK_SIZE})</button>
    </section>`;
  $('#open').onclick = openPack;
  tickUI();
}

function openPack() {
  if (!state.packs) return;
  if (state.packs >= PACK_CAP) state.tick = Date.now();
  state.packs--;
  state.pending = Array.from({ length: PACK_SIZE }, drawOption);
  save(); viewPick();
}

function viewPick() {
  let chosen = -1;
  $('#app').innerHTML = `<section class="panel center"><h2>Pick 1 to keep</h2>
    <div class="grid" id="opts">${state.pending.map((o, i) =>
      card(byId[o.id], { holo: o.holo, pick: i, i, isNew: !state.owned[o.id] })).join('')}</div>
    <p><button class="btn" id="keep" disabled>Keep</button></p></section>`;
  hydrate($('#app'));
  document.querySelectorAll('#opts .card').forEach(c => c.onclick = () => {
    chosen = +c.dataset.pick;
    document.querySelectorAll('#opts .card').forEach(x => x.classList.toggle('sel', x === c));
    $('#keep').disabled = false;
    play(byId[c.dataset.id]);
  });
  $('#keep').onclick = () => {
    const o = state.pending[chosen], e = state.owned[o.id] ||= { n: 0, holo: 0 };
    e.n++; if (o.holo) e.holo++;
    state.pending = null; save(); toast('Kept ' + byId[o.id].title); route();
  };
}

function combine() {
  let made = 0;
  for (const e of Object.values(state.owned))
    while (e.n - e.holo >= 3) { e.n -= 2; e.holo++; made++; }   // 3 normal copies -> 1 holo
  save(); toast(made ? `Made ${made} holo${made > 1 ? 's' : ''}!` : 'Need 3 normal copies of a song'); route();
}

function viewCollection() {
  const list = [...SONGS].sort((x, y) => pts(y) - pts(x));
  const have = list.filter(s => state.owned[s.id]).length;
  $('#app').innerHTML = `<section class="panel"><div class="row between"><h2>Collection <small class="muted">${have}/${list.length}</small></h2>
    <button class="btn" id="comb">Combine dupes into holos</button></div>
    <div class="grid">${list.map(cardOf).join('')}</div></section>`;
  $('#comb').onclick = combine;
  hydrate($('#app'));
}

function viewAlbums() {
  $('#app').innerHTML = ALBUMS.filter(a => albumSongs(a).length).map(a => {
    const list = albumSongs(a), have = list.filter(s => state.owned[s.id]).length;
    return `<section class="panel album${complete(a) ? ' done' : ''}">
      <div class="row between"><h3>${a.name} <small class="muted">${a.year}</small></h3><span>${have}/${list.length}</span></div>
      <div class="bar"><i style="width:${have / list.length * 100}%"></i></div>
      <div class="grid mini">${list.map(cardOf).join('')}</div>
      <div class="row between"><span class="muted">Reward: +${bonus(a).toLocaleString()} pts &amp; ${ALBUM_PACKS} packs</span>
        ${state.claimed[a.id] ? '<span class="ok">Claimed</span>'
          : `<button class="btn" data-claim="${a.id}" ${complete(a) ? '' : 'disabled'}>Claim</button>`}</div>
    </section>`;
  }).join('');
  hydrate($('#app'));
}

/* ---------- routing & events ---------- */
const views = { packs: viewPacks, collection: viewCollection, albums: viewAlbums };
function route() {
  regen();
  const h = location.hash.replace('#/', ''), v = views[h] ? h : 'packs';
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  views[v](); updateScore();
}
function tickUI() {
  regen();
  const t = $('#timer'); if (!t) return;
  $('#pc').textContent = state.packs; $('#open').disabled = !state.packs;
  const ms = Math.max(0, PACK_MS - (Date.now() - state.tick));
  t.textContent = state.packs >= PACK_CAP ? 'Packs full'
    : `Next pack in ${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
}
document.addEventListener('click', e => {
  const c = e.target.closest('.card[data-id]:not([data-pick])');
  if (c && !c.classList.contains('locked')) play(byId[c.dataset.id]);
  const b = e.target.closest('[data-claim]');
  if (b) { state.claimed[b.dataset.claim] = true; state.packs += ALBUM_PACKS; save(); toast(`Album claimed! +${ALBUM_PACKS} packs`); route(); }
});
window.addEventListener('hashchange', route);
setInterval(tickUI, 1000);
route();
