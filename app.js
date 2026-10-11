// ------------------------------------------------------------
// Konfigurasi tier, kategori, dan state aplikasi
// ------------------------------------------------------------
const TN = ['Top', 'Banger', 'Lumayan', 'Belum Masuk', 'Gak Masuk'];
const TC = ['#f2c46d', '#ff7aa8', '#5fe3c0', '#7fa4ff', '#8793ad'];
const CATS = ['J-Pop', 'English', 'Indonesia', 'Game Theme Song', 'Other'];
const HUES = [210, 230, 255, 285, 330, 5, 30, 160, 180, 200];
let S = { songs: [], lists: [], entries: [], snaps: [] };
let V = 'dash';
let L = null;
let ui = { sc: 'lib', tt: [0, 1, 2, 3, 4], q: '', cf: '', lq: '' };
let DB;
// ------------------------------------------------------------
// Utilitas umum
// ------------------------------------------------------------
const $ = s => document.querySelector(s);
const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = t => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
const sg = id => S.songs.find(s => s.id === id);
const lst = id => S.lists.find(l => l.id === id);
let ft;

function flash(m, e) {
    const f = $('#fl');
    f.textContent = m;
    f.className = 's' + (e ? ' e' : '');
    clearTimeout(ft);
    ft = setTimeout(() => f.className = '', e ? 4000 : 1200);
}
// ------------------------------------------------------------
// Penyimpanan lokal: IndexedDB
// ------------------------------------------------------------
const open = () => new Promise((res, rej) => {
    const r = indexedDB.open('sagaras', 1);
    r.onupgradeneeded = () => {
        for (const n of ['songs', 'lists', 'entries', 'snaps'])
            r.result.createObjectStore(n, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
});
const tx = (st, fn) => new Promise((res, rej) => {
    const t = DB.transaction(st, 'readwrite');
    fn(t);
    t.oncomplete = res;
    t.onerror = t.onabort = () => rej(t.error);
});
const getAll = st => new Promise((res, rej) => {
    const r = DB.transaction(st).objectStore(st).getAll();
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
});

async function put(st, ...v) {
    try {
        await tx(st, t => v.forEach(x => t.objectStore(st).put(x)));
        flash('Tersimpan ✓');
    }
    catch (e) {
        flash('Gagal menyimpan: ' + (e && e.name === 'QuotaExceededError' ? 'penyimpanan browser penuh' : e && e.message), 1);
    }
}

async function del(st, ...ids) {
    try {
        await tx(st, t => ids.forEach(i => t.objectStore(st).delete(i)));
        flash('Tersimpan ✓');
    }
    catch (e) {
        flash('Gagal: ' + (e && e.message), 1);
    }
}
// ------------------------------------------------------------
// Komponen dan helper tampilan
// ------------------------------------------------------------
const fs = t => t.length > 40 ? 7 : t.length > 25 ? 9 : t.length > 14 ? 11 : 14;
const art = s => `<div class="art" style="background:${s.img ? `url('${s.img}') center/cover,` : ''}hsl(${s.hue} 55% 32%)">${s.img ? '' : `<b style="font-size:${fs(s.title)}cqw">${esc(s.title)}</b><i>${esc(s.artist)}</i>`}</div>`;
const songCard = (s, extra = '') => `<div class="card">${art(s)}<div class="t">${esc(s.title)}</div><div class="a">${esc(s.artist)} · <span class="tag">${esc(s.cat)}</span></div>${extra}</div>`;

function modal(h) {
    $('#mo').innerHTML = `<div class="md">${h}</div>`;
    $('#mo').style.display = 'flex';
}
const close = () => {
    $('#mo').style.display = 'none';
    $('#mo').innerHTML = '';
};

function ask(msg, fn, lbl = 'Ya, lanjutkan') {
    ui.yes = fn;
    modal(`<p>${msg}</p><div class="row"><button class="b dg" data-a="yes">${lbl}</button><button class="b" data-a="close">Batal</button></div>`);
}

function touch(id) {
    const l = lst(id);
    l.updated = Date.now();
    put('lists', l);
}
const cnt = (a, f) => {
    const m = {};
    a.forEach(x => {
        const k = f(x);
        m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
const topTies = r => {
    if (!r.length)
        return '<span class="mu">Belum ada data</span>';
    return r.filter(x => x[1] === r[0][1]).map(x => `${esc(x[0])} (${x[1]})`).join(', ');
};
const bars = (r, tot, col) => r.map(([k, v]) => `<div class="bar"><span style="width:120px">${esc(k)}</span><div style="width:${tot ? v / tot * 60 : 0}%;${col ? 'background:' + col : ''}"></div><span>${v}${tot ? ' · ' + Math.round(v / tot * 100) + '%' : ''}</span></div>`).join('');
const eL = id => S.entries.filter(e => e.listId === id);
// ------------------------------------------------------------
// Navigasi dan rendering halaman
// ------------------------------------------------------------
const render = () => {
    $('#nav').innerHTML = [['dash', 'Dashboard'], ['list', 'Tierlist'], ['lib', 'Music Library'], ['hist', 'Ranking History'], ['stat', 'Statistik'], ['bak', 'Backup']].map(([k, n], j) => `<button class="${V === k ? 'on' : ''}" data-a="nav" data-i="${k}"><em>0${j + 1}</em>${n}</button>`).join('');
    const a = document.activeElement;
    const id = a && a.id;
    const pos = a && a.selectionStart;
    $('#main').innerHTML = ({ dash: vDash, list: vList, lib: vLib, hist: vHist, stat: vStat, bak: vBak })[V]();
    if (id && $('#' + id)) {
        const n = $('#' + id);
        n.focus();
        try {
            n.setSelectionRange(pos, pos);
        }
        catch {
        }
    }
};
const needL = () => `<div class="empty">Pilih atau buat tierlist dulu di Dashboard.<br><br><button class="b p" data-a="nav" data-i="dash">Ke Dashboard</button></div>`;
const listSel = k => `<select data-s="${k}">${S.lists.map(l => `<option value="${l.id}" ${l.id === L ? 'selected' : ''}>${esc(l.title)}</option>`).join('')}</select>`;

// ------------------------------------------------------------
// Halaman Dashboard dan Music Library
// ------------------------------------------------------------
function vDash() {
    const q = ui.q.toLowerCase();
    const ls = S.lists.filter(l => l.title.toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated);
    return `<h2>Dashboard</h2><div class="row"><input id="nl" placeholder="Judul tierlist baru" maxlength="80"><button class="b p" data-a="newList">+ Buat Tierlist</button><input id="dq" data-q="q" placeholder="Cari tierlist…" value="${esc(ui.q)}"></div>
${ls.length ? `<div class="grid lg">${ls.map(l => `<div class="panel"><b>${esc(l.title)}</b><div class="mu" style="font-size:12px">${eL(l.id).length} lagu<br>Dibuat ${fmt(l.created)}<br>Diperbarui ${fmt(l.updated)}</div><div class="row" style="margin:8px 0 0"><button class="b p sm" data-a="open" data-i="${l.id}">Buka</button><button class="b sm" data-a="ren" data-i="${l.id}">Ganti judul</button><button class="b sm" data-a="dup" data-i="${l.id}">Salin</button><button class="b sm dg" data-a="delList" data-i="${l.id}">Hapus</button></div></div>`).join('')}</div>` : `<div class="empty">${S.lists.length ? 'Tidak ada tierlist yang cocok.' : 'Belum ada tierlist. Beri judul lalu klik “Buat Tierlist”.'}</div>`}`;
}

function vLib() {
    const q = ui.lq.toLowerCase();
    const ss = S.songs.filter(s => (!ui.cf || s.cat === ui.cf) && (s.title + ' ' + s.artist).toLowerCase().includes(q));
    return `<h2>Music Library Bersama</h2><div class="row"><button class="b p" data-a="songForm">+ Tambah Lagu</button><input id="lq" data-q="lq" placeholder="Cari judul / artis" value="${esc(ui.lq)}"><select data-s="cf"><option value="">Semua kategori</option>${CATS.map(c => `<option ${ui.cf === c ? 'selected' : ''}>${c}</option>`).join('')}</select>${L ? `<span class="mu">Menambah ke: <b>${esc(lst(L).title)}</b></span>` : ''}</div>
${ss.length ? `<div class="grid">${ss.map(s => songCard(s, `<div class="row" style="margin:4px 0 0;gap:4px">${L ? `<button class="b sm p" data-a="addTo" data-i="${s.id}" ${eL(L).some(e => e.songId === s.id) ? 'disabled' : ''}>${eL(L).some(e => e.songId === s.id) ? 'Sudah ada' : '+ Tierlist'}</button>` : ''}<button class="b sm" data-a="songForm" data-i="${s.id}">Edit</button><button class="b sm dg" data-a="delSong" data-i="${s.id}">Hapus</button></div>`)).join('')}</div>` : `<div class="empty">${S.songs.length ? 'Tidak ada lagu yang cocok.' : 'Library masih kosong. Tambahkan lagu pertama Anda.'}</div>`}`;
}

function vList() {
    if (!L || !lst(L))
        return needL();
    const es = eL(L).filter(e => sg(e.songId)).sort((a, b) => a.order - b.order);
    const l = lst(L);
    const card = e => {
        const s = sg(e.songId);
        return `<div class="card" draggable="true" data-e="${e.id}">${art(s)}<div class="t">${esc(s.title)}</div><div class="a">${esc(s.artist)}</div><div style="display:flex;gap:2px"><button class="b sm" data-a="left" data-i="${e.id}">◀</button><button class="b sm" data-a="right" data-i="${e.id}">▶</button><select data-mv="${e.id}"><option>Pindah…</option>${TN.map((n, i) => `<option value="${i}">${n}</option>`).join('')}<option value="-1">Belum ditempatkan</option><option value="x">Keluarkan</option></select></div></div>`;
    };
    const zone = (t, n, c) => `<div class="tier"><div class="tl" style="--c:${c}"><em>${t >= 0 ? "T-0" + (t + 1) : "T-XX"}</em>${n}<small>${es.filter(e => e.tier === t).length} lagu</small></div><div class="zone" data-z="${t}">${es.filter(e => e.tier === t).map(card).join('')}</div></div>`;
    return `<h2>${esc(l.title)}</h2><div class="row"><button class="b p" data-a="picker">+ Tambah dari Library</button><button class="b" data-a="exportForm">Ekspor PNG</button><button class="b" data-a="snap">📸 Buat Snapshot</button><span class="mu">Seret kartu antar tier, atau pakai ◀ ▶ dan menu “Pindah”.</span></div>${TN.map((n, i) => zone(i, n, TC[i])).join('')}${zone(-1, 'Belum ditempatkan', '#cbd5f0')}`;
}

// ------------------------------------------------------------
// Grafik, Ranking History, dan statistik
// ------------------------------------------------------------
function chart(snaps) {
    const W = 640;
    const H = 250;
    const m = 40;
    if (!snaps.length)
        return '';
    const mx = Math.max(1, ...snaps.flatMap(s => ui.tt.map(t => s.items.filter(i => i.tier === t).length)));
    const X = i => snaps.length === 1 ? W / 2 : m + i * (W - m - 15) / (snaps.length - 1);
    const Y = v => H - 25 - v / mx * (H - 45);
    let o = `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H}" width="100%" style="min-width:420px">`;
    for (let v = 0; v <= mx; v += Math.max(1, Math.ceil(mx / 5)))
        o += `<line x1="${m}" x2="${W - 10}" y1="${Y(v)}" y2="${Y(v)}" stroke="#1f2e4d"/><text x="${m - 6}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;
    snaps.forEach((s, i) => {
        if (snaps.length < 8 || i % Math.ceil(snaps.length / 7) === 0)
            o += `<text x="${X(i)}" y="${H - 6}" text-anchor="middle">${new Date(s.ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</text>`;
    });
    ui.tt.forEach(t => {
        const pts = snaps.map((s, i) => [X(i), Y(s.items.filter(x => x.tier === t).length)]);
        if (pts.length > 1)
            o += `<polyline fill="none" stroke="${TC[t]}" stroke-width="2.5" points="${pts.map(p => p.join(',')).join(' ')}"/>`;
        pts.forEach((p, i) => o += `<circle cx="${p[0]}" cy="${p[1]}" r="5" fill="${TC[t]}"><title>${TN[t]} — ${fmt(snaps[i].ts)}: ${snaps[i].items.filter(x => x.tier === t).length} lagu</title></circle>`);
    });
    return o + '</svg></div>';
}

function vHist() {
    if (!L || !lst(L))
        return needL();
    const all = S.snaps.filter(s => s.listId === L).sort((a, b) => a.ts - b.ts);
    const r0 = Math.min(+ui.r0 || 0, all.length - 1);
    const r1 = Math.min(ui.r1 == null ? all.length - 1 : +ui.r1, all.length - 1);
    const rng = all.slice(Math.max(0, r0), r1 + 1);
    const opt = (k, v) => all.map((s, i) => `<option value="${i}" ${i == v ? 'selected' : ''}>${fmt(s.ts)}</option>`).join('');
    let cmp = '';
    if (all.length >= 2) {
        // ------------------------------------------------------------
// Aksi antarmuka
// ------------------------------------------------------------
const A = all[ui.ca ?? 0] || all[0];
        const B = all[ui.cb ?? all.length - 1] || all[all.length - 1];
        const mA = new Map(A.items.map(i => [i.songId, i]));
        const mB = new Map(B.items.map(i => [i.songId, i]));
        const rows = [];
        mB.forEach((b, id) => {
            const a = mA.get(id);
            rows.push([b.title, b.artist, !a ? 'Baru ditambahkan' : a.tier === b.tier ? 'Tetap' : b.tier < a.tier ? '⬆ Naik' : '⬇ Turun', a ? TN[a.tier] : '—', TN[b.tier]]);
        });
        mA.forEach((a, id) => {
            if (!mB.has(id))
                rows.push([a.title, a.artist, 'Tidak ada lagi', TN[a.tier], '—']);
        });
        cmp = `<h3>Bandingkan Snapshot</h3><div class="row"><select data-s="ca">${opt('ca', ui.ca ?? 0)}</select> → <select data-s="cb">${opt('cb', ui.cb ?? all.length - 1)}</select></div><table><tr><th>Lagu</th><th>Status</th><th>Dari</th><th>Ke</th></tr>${rows.map(r => `<tr><td>${esc(r[0])}<br><span class="mu">${esc(r[1])}</span></td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</table>`;
    }
    return `<h2>Ranking History — ${esc(lst(L).title)}</h2><div class="row"><button class="b p" data-a="snap">📸 Buat Snapshot</button>${listSel('hl')}</div>
${all.length ? `<div class="panel"><div class="row">${TN.map((n, i) => `<label><input type="checkbox" data-t="${i}" ${ui.tt.includes(i) ? 'checked' : ''}> <span style="color:${TC[i]}">●</span> ${n}</label>`).join(' ')}</div>${all.length > 2 ? `<div class="row">Rentang: <select data-s="r0">${opt('r0', r0)}</select> s/d <select data-s="r1">${opt('r1', r1)}</select></div>` : ''}${chart(rng)}${all.length === 1 ? '<p class="mu">Baru ada satu snapshot — belum cukup data untuk melihat tren.</p>' : ''}</div>` : `<div class="empty">Belum ada snapshot. Klik “Buat Snapshot” untuk merekam ranking saat ini sebagai titik pertama grafik.</div>`}
<h3>Daftar Snapshot</h3>${[...all].reverse().map(s => `<div class="panel row" style="justify-content:space-between"><span>${fmt(s.ts)} · ${s.items.length} lagu</span><span><button class="b sm" data-a="viewSnap" data-i="${s.id}">Lihat</button> <button class="b sm dg" data-a="delSnap" data-i="${s.id}">Hapus</button></span></div>`).join('')}${cmp}`;
}

function vStat() {
    const lib = ui.sc === 'lib' || !lst(ui.sc);
    let songs;
    let es = [];
    if (lib)
        songs = S.songs;
    else {
        es = eL(ui.sc).filter(e => sg(e.songId));
        songs = es.map(e => sg(e.songId));
    }
    const placed = es.filter(e => e.tier >= 0);
    const inT = t => es.filter(e => e.tier === t).map(e => sg(e.songId));
    const cs = ui.sf ? songs.filter(s => s.cat === ui.sf) : songs;
    const ar = ui.sa;
    const head = `<h2>Music Taste Statistics</h2><div class="row"><select data-s="sc"><option value="lib">Library Overview</option>${S.lists.map(l => `<option value="${l.id}" ${ui.sc === l.id ? 'selected' : ''}>Tierlist: ${esc(l.title)}</option>`).join('')}</select><select data-s="sf"><option value="">Semua kategori</option>${CATS.map(c => `<option ${ui.sf === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>`;
    if (!songs.length)
        return head + `<div class="empty">Belum ada lagu ${lib ? 'di library' : 'di tierlist ini'}. Tambahkan lagu agar statistik muncul.</div>`;
    const arts = cnt(songs, s => s.artist);
    const cats = CATS.map(c => [c, songs.filter(s => s.cat === c).length]);
    let o = head + `<div class="grid lg"><div class="panel"><b>${S.songs.length}</b> lagu unik di library<br><b>${S.lists.length}</b> tierlist</div>${lib ? '' : `<div class="panel"><b>${es.length - placed.length}</b> lagu belum ditempatkan<br><b>${placed.length}</b> lagu di lima tier</div>`}</div>`;
    if (!lib)
        o += `<h3>Distribusi Tier (dari lagu yang sudah ditempatkan)</h3><div class="panel">${placed.length ? TN.map((n, i) => [n, placed.filter(e => e.tier === i).length]).map(([n, v], i) => bars([[n, v]], placed.length, TC[i])).join('') : '<span class="mu">Belum ada lagu yang ditempatkan di tier.</span>'}</div>`;
    o += `<h3>Statistik Artis</h3><div class="panel">Terbanyak di library: ${topTies(cnt(S.songs, s => s.artist))}`;
    if (!lib)
        o += `<br>Terbanyak di tier Top: ${topTies(cnt(inT(0), s => s.artist))}<br>Terbanyak di tier Banger: ${topTies(cnt(inT(1), s => s.artist))}`;
    else
        o += `<br><span class="mu">Pilih tierlist untuk statistik artis per tier.</span>`;
    o += `<p class="mu" style="font-size:12px">Jumlah lagu bukan ukuran tingkat kesukaan.</p><select data-s="sa"><option value="">Lihat lagu per artis…</option>${arts.map(a => `<option ${ar === a[0] ? 'selected' : ''}>${esc(a[0])}</option>`).join('')}</select>${ar ? '<ul>' + songs.filter(s => s.artist === ar).map(s => `<li>${esc(s.title)}</li>`).join('') + '</ul>' : ''}</div>`;
    o += `<h3>Kategori Musik</h3><div class="panel">${bars(cats, songs.length)}${lib ? '' : `<table><tr><th>Kategori</th><th>Top</th><th>Banger</th></tr>${CATS.map(c => `<tr><td>${c}</td><td>${inT(0).filter(s => s.cat === c).length}</td><td>${inT(1).filter(s => s.cat === c).length}</td></tr>`).join('')}</table>`}<h3>Daftar lagu ${ui.sf || '(semua kategori)'}</h3>${cs.map(s => `<span class="tag">${esc(s.title)} — ${esc(s.artist)}</span> `).join('') || '<span class="mu">Kosong</span>'}</div>`;
    const sn = S.snaps.filter(s => !lib && s.listId === ui.sc).sort((a, b) => a.ts - b.ts);
    o += `<h3>Tren Ranking</h3><div class="panel">${lib ? '<span class="mu">Pilih tierlist untuk melihat tren.</span>' : sn.length ? chart(sn) + (sn.length > 1 ? `<p class="mu">${sn.length} snapshot. Detail perbandingan ada di Ranking History.</p>` : '<p class="mu">Baru satu snapshot — belum cukup untuk tren.</p>') : '<span class="mu">Belum ada snapshot untuk tierlist ini.</span>'}</div>`;
    return o;
}

// ------------------------------------------------------------
// Halaman backup dan pengaturan
// ------------------------------------------------------------
function vBak() {
    return `<h2>Backup &amp; Pengaturan</h2><div class="panel"><p>Semua data tersimpan <b>hanya di browser ini</b> (IndexedDB). Data <b>tidak</b> tersinkron ke perangkat lain, dan bisa hilang jika Anda membersihkan data situs, kehilangan profil browser, atau penyimpanan rusak. Buat backup secara berkala.</p><div class="row"><button class="b p" data-a="backup">⬇ Unduh Backup (.json, termasuk gambar)</button><label class="b">⬆ Pulihkan dari berkas<input type="file" id="rf" accept=".json,application/json" hidden></label></div><p class="mu">Backup memuat library, gambar artwork, warna artwork pengganti, semua tierlist, urutan, dan snapshot.</p></div><div class="mu">${S.songs.length} lagu · ${S.lists.length} tierlist · ${S.snaps.length} snapshot</div>`;
}
const A = { nav(e) {
        V = e.dataset.i;
        if (V === 'list' && !L && S.lists.length)
            L = S.lists[0].id;
        if ((V === 'hist') && !L && S.lists.length)
            L = S.lists[0].id;
        render();
    },
    newList() {
        const t = $('#nl').value.trim();
        if (!t)
            return flash('Judul tierlist tidak boleh kosong', 1);
        const l = { id: uid(), title: t, created: Date.now(), updated: Date.now() };
        S.lists.push(l);
        put('lists', l);
        render();
    },
    open(e) {
        L = e.dataset.i;
        V = 'list';
        render();
    },
    ren(e) {
        ui.rid = e.dataset.i;
        modal(`<h3>Ganti judul</h3><input id="rv" value="${esc(lst(ui.rid).title)}" maxlength="80"><div class="row" style="margin-top:12px"><button class="b p" data-a="doRen">Simpan</button><button class="b" data-a="close">Batal</button></div>`);
    },
    doRen() {
        const t = $('#rv').value.trim();
        if (!t)
            return flash('Judul tidak boleh kosong', 1);
        const l = lst(ui.rid);
        l.title = t;
        touch(l.id);
        close();
        render();
    },
    dup(e) {
        const o = lst(e.dataset.i);
        const n = { id: uid(), title: o.title + ' (salinan)', created: Date.now(), updated: Date.now() };
        const ne = eL(o.id).map(x => ({ ...x, id: uid(), listId: n.id }));
        S.lists.push(n);
        S.entries.push(...ne);
        put('lists', n);
        put('entries', ...ne);
        render();
    },
    delList(e) {
        const id = e.dataset.i;
        ask(`Hapus tierlist “${esc(lst(id).title)}” beserta snapshot-nya? Lagu di library tidak ikut terhapus.`, async () => {
            const es = eL(id).map(x => x.id);
            const ss = S.snaps.filter(s => s.listId === id).map(s => s.id);
            S.lists = S.lists.filter(l => l.id !== id);
            S.entries = S.entries.filter(x => x.listId !== id);
            S.snaps = S.snaps.filter(s => s.listId !== id);
            if (L === id)
                L = null;
            await del('lists', id);
            await del('entries', ...es);
            await del('snaps', ...ss);
            close();
            render();
        });
    },
    close, yes() {
        const f = ui.yes;
        ui.yes = null;
        if (f)
            f();
    },
    songForm(e) {
        const s = e.dataset.i ? sg(e.dataset.i) : null;
        ui.sid = s && s.id;
        ui.img = s ? s.img : null;
        ui.hue = s ? s.hue : HUES[Math.random() * HUES.length | 0];
        modal(`<h3>${s ? 'Edit' : 'Tambah'} Lagu</h3><label>Judul lagu *</label><input id="ft" value="${esc(s?.title)}"><label>Artis *</label><input id="fa" value="${esc(s?.artist)}"><label>Kategori *</label><select id="fc">${CATS.map(c => `<option ${s && s.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select><label>Foto artwork (opsional, dipotong persegi di tengah)</label><input type="file" id="fi" accept="image/*"><div id="fp" style="width:140px;margin:10px 0">${art({ title: s?.title || 'Judul', artist: s?.artist || 'Artis', img: ui.img, hue: ui.hue })}</div>${ui.img ? '<button class="b sm" data-a="noimg">Hapus gambar</button>' : ''}<div class="err" id="fe"></div><div class="row" style="margin-top:12px"><button class="b p" data-a="saveSong">Simpan</button><button class="b" data-a="close">Batal</button></div>`);
    },
    noimg() {
        ui.img = null;
        $('#fp').innerHTML = art({ title: $('#ft').value || 'Judul', artist: $('#fa').value || 'Artis', hue: ui.hue });
    },
    saveSong() {
        const t = $('#ft').value.trim();
        const a = $('#fa').value.trim();
        const c = $('#fc').value;
        if (!t || !a) {
            $('#fe').textContent = 'Judul dan artis wajib diisi (tidak boleh hanya spasi).';
            return;
        }
        let s = ui.sid && sg(ui.sid);
        if (s) {
            Object.assign(s, { title: t, artist: a, cat: c, img: ui.img });
        }
        else {
            s = { id: uid(), title: t, artist: a, cat: c, img: ui.img, hue: ui.hue, created: Date.now() };
            S.songs.push(s);
        }
        put('songs', s);
        close();
        render();
    },
    delSong(e) {
        const s = sg(e.dataset.i);
        const u = S.entries.filter(x => x.songId === s.id);
        const n = new Set(u.map(x => x.listId)).size;
        ask(`Hapus “${esc(s.title)}” dari library?${n ? ` Lagu ini dipakai di <b>${n} tierlist</b> dan akan ikut dikeluarkan dari sana (snapshot lama tetap utuh).` : ''}`, async () => {
            S.songs = S.songs.filter(x => x.id !== s.id);
            S.entries = S.entries.filter(x => x.songId !== s.id);
            await del('songs', s.id);
            await del('entries', ...u.map(x => x.id));
            close();
            render();
        });
    },
    addTo(e) {
        if (!L)
            return;
        const id = e.dataset.i;
        if (eL(L).some(x => x.songId === id))
            return flash('Lagu sudah ada di tierlist ini', 1);
        const n = { id: uid(), listId: L, songId: id, tier: -1, order: eL(L).filter(x => x.tier === -1).length };
        S.entries.push(n);
        put('entries', n);
        touch(L);
        render();
    },
    picker() {
        V = 'lib';
        render();
    },
    left(e) {
        shift(e.dataset.i, -1);
    }, right(e) {
        shift(e.dataset.i, 1);
    },
    snap() {
        if (!L)
            return;
        const items = eL(L).filter(e => e.tier >= 0 && sg(e.songId)).map(e => {
            const s = sg(e.songId);
            return { songId: s.id, tier: e.tier, order: e.order, title: s.title, artist: s.artist, cat: s.cat };
        });
        const n = { id: uid(), listId: L, ts: Date.now(), items };
        S.snaps.push(n);
        put('snaps', n);
        flash('Snapshot dibuat ✓');
        if (V !== 'hist') {
            V = 'hist';
        }
        render();
    },
    delSnap(e) {
        ask('Hapus snapshot ini?', async () => {
            S.snaps = S.snaps.filter(s => s.id !== e.dataset.i);
            await del('snaps', e.dataset.i);
            close();
            render();
        });
    },
    viewSnap(e) {
        const s = S.snaps.find(x => x.id === e.dataset.i);
        modal(`<h3>Snapshot ${fmt(s.ts)}</h3><p class="mu">Hanya dilihat — tidak mengubah ranking saat ini.</p>${TN.map((n, i) => `<b style="color:${TC[i]}">${n}</b><ol>${s.items.filter(x => x.tier === i).sort((a, b) => a.order - b.order).map(x => `<li>${esc(x.title)} — <span class="mu">${esc(x.artist)}</span></li>`).join('') || '<span class="mu">kosong</span>'}</ol>`).join('')}<button class="b" data-a="close">Tutup</button>`);
    },
    exportForm() {
        modal(`<h3>Ekspor PNG</h3><label>Ukuran kartu</label><select id="xs"><option value="110">Kecil</option><option value="150" selected>Sedang</option><option value="200">Besar</option></select><label>Tema</label><select id="xt"><option value="d">Navy gelap</option><option value="l">Terang</option></select><div class="row" style="margin-top:12px"><button class="b p" data-a="doExport">Unduh PNG</button><button class="b" data-a="close">Batal</button></div>`);
    },
    async doExport() {
        const cs = +$('#xs').value;
        const dark = $('#xt').value === 'd';
        close();
        const l = lst(L);
        const es = eL(L).filter(e => sg(e.songId)).sort((a, b) => a.order - b.order);
        const cols = Math.max(4, Math.min(8, Math.round(1000 / (cs + 10))));
        const lw = 130;
        const g = 10;
        const ch = cs + 40;
        const W = lw + cols * (cs + g) + g;
        const rows = [...TN.map((n, i) => [n, TC[i], es.filter(e => e.tier === i)]), ...(es.some(e => e.tier < 0) ? [['Belum ditempatkan', '#cbd5f0', es.filter(e => e.tier < 0)]] : [])];
        const rh = rows.map(r => Math.max(1, Math.ceil(r[2].length / cols)) * (ch + g) + g);
        const H = 70 + rh.reduce((a, b) => a + b, 0) + rows.length * 6 + 20;
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const x = c.getContext('2d');
        const bg = dark ? '#050914' : '#f2f5ff';
        const fg = dark ? '#eef3ff' : '#14204a';
        const imgs = {};
        await Promise.all(es.map(e => {
            const s = sg(e.songId);
            return s.img ? new Promise(r => {
                const i = new Image();
                i.onload = () => {
                    imgs[s.id] = i;
                    r();
                };
                i.onerror = r;
                i.src = s.img;
            }) : 0;
        }));
        x.fillStyle = bg;
        x.fillRect(0, 0, W, H);
        x.fillStyle = fg;
        x.font = 'bold 30px system-ui,sans-serif';
        x.textBaseline = 'alphabetic';
        x.fillText('★ ' + l.title, g + 6, 46);
        let y = 64;
        const cut = (t, w) => {
            if (x.measureText(t).width <= w)
                return t;
            while (t.length > 1 && x.measureText(t + '…').width > w)
                t = t.slice(0, -1);
            return t + '…';
        };
        const wrap = (t, w) => {
            const ws = t.split(/\s+/);
            const o = [];
            let cur = '';
            ws.forEach(wd => {
                const tr = cur ? cur + ' ' + wd : wd;
                if (x.measureText(tr).width > w && cur) {
                    o.push(cur);
                    cur = wd;
                }
                else
                    cur = tr;
            });
            if (cur)
                o.push(cur);
            return o;
        };
        rows.forEach((r, ri) => {
            x.fillStyle = dark ? '#0d1629' : '#e2e8fa';
            x.fillRect(g / 2, y, W - g, rh[ri]);
            x.fillStyle = r[1];
            x.fillRect(g / 2, y, lw - g, rh[ri]);
            x.fillStyle = '#111';
            x.font = 'bold 18px system-ui,sans-serif';
            x.textAlign = 'center';
            wrap(r[0], lw - 24).forEach((ln, k, a) => x.fillText(ln, lw / 2, y + rh[ri] / 2 + (k - (a.length - 1) / 2) * 22 + 6));
            x.textAlign = 'left';
            r[2].forEach((e, k) => {
                const s = sg(e.songId);
                const cx = lw + g + (k % cols) * (cs + g);
                const cy = y + g + Math.floor(k / cols) * (ch + g);
                if (imgs[s.id])
                    x.drawImage(imgs[s.id], cx, cy, cs, cs);
                else {
                    x.fillStyle = `hsl(${s.hue} 55% 32%)`;
                    x.fillRect(cx, cy, cs, cs);
                    x.fillStyle = '#fff';
                    x.textAlign = 'center';
                    const fz = Math.max(10, cs * (s.title.length > 40 ? .075 : s.title.length > 25 ? .09 : s.title.length > 14 ? .11 : .14));
                    x.font = `bold ${fz}px system-ui,sans-serif`;
                    const ls = wrap(s.title, cs * .84).slice(0, 5);
                    const tot = ls.length * fz * 1.15;
                    ls.forEach((ln, j) => x.fillText(ln, cx + cs / 2, cy + cs / 2 - tot / 2 + fz * 1.0 + j * fz * 1.15 - fz * .4));
                    x.font = `${cs * .08}px system-ui,sans-serif`;
                    x.fillText(cut(s.artist, cs * .88), cx + cs / 2, cy + cs / 2 + tot / 2 + cs * .1);
                    x.textAlign = 'left';
                }
                x.fillStyle = fg;
                x.font = 'bold 13px system-ui,sans-serif';
                x.fillText(cut(s.title, cs), cx, cy + cs + 16);
                x.fillStyle = dark ? '#9fb0d8' : '#4a5a8a';
                x.font = '11px system-ui,sans-serif';
                x.fillText(cut(s.artist, cs), cx, cy + cs + 31);
            });
            y += rh[ri] + 6;
        });
        c.toBlob(b => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(b);
            a.download = l.title.replace(/[^\w-]+/g, '_') + '.png';
            a.click();
            flash('PNG diunduh ✓');
        });
    },
    backup() {
        const b = new Blob([JSON.stringify({ app: 'sagaras', v: 1, exported: Date.now(), ...S })], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = 'sagaras-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click();
        flash('Backup diunduh ✓');
    },
    async restore(mode) {
        const d = ui.rd;
        close();
        try {
            if (mode === 'replace')
                for (const st of ['songs', 'lists', 'entries', 'snaps'])
                    await tx(st, t => t.objectStore(st).clear());
            for (const st of ['songs', 'lists', 'entries', 'snaps'])
                if (d[st].length)
                    await tx(st, t => d[st].forEach(x => t.objectStore(st).put(x)));
            await load();
            L = null;
            V = 'dash';
            render();
            flash('Restore berhasil ✓');
        }
        catch (e) {
            flash('Restore gagal: ' + e.message, 1);
        }
    } };

// ------------------------------------------------------------
// Pengurutan lagu dan interaksi drag-and-drop
// ------------------------------------------------------------
function shift(id, d) {
    const e = S.entries.find(x => x.id === id);
    const g = eL(e.listId).filter(x => x.tier === e.tier).sort((a, b) => a.order - b.order);
    const i = g.indexOf(e);
    if (d < 0) {
        if (i > 0)
            mv(id, e.tier, g[i - 1].id);
    }
    else if (i < g.length - 1)
        mv(id, e.tier, g[i + 2]?.id);
}

function mv(id, t, b) {
    const e = S.entries.find(x => x.id === id);
    if (!e)
        return;
    const g = eL(L).filter(x => x.tier === t && x.id !== id).sort((a, b) => a.order - b.order);
    let i = b ? g.findIndex(x => x.id === b) : -1;
    if (i < 0)
        i = g.length;
    e.tier = t;
    g.splice(i, 0, e);
    const ch = [];
    g.forEach((x, k) => {
        if (x.order !== k || x === e) {
            x.order = k;
            ch.push(x);
        }
    });
    put('entries', ...ch);
    touch(L);
    render();
}
const sq = f => new Promise((res, rej) => {
    const u = URL.createObjectURL(f);
    const i = new Image();
    i.onload = () => {
        const m = Math.min(i.width, i.height);
        const c = document.createElement('canvas');
        c.width = c.height = 480;
        c.getContext('2d').drawImage(i, (i.width - m) / 2, (i.height - m) / 2, m, m, 0, 0, 480, 480);
        URL.revokeObjectURL(u);
        res(c.toDataURL('image/jpeg', .85));
    };
    i.onerror = () => rej(new Error('bad'));
    i.src = u;
});

// ------------------------------------------------------------
// Event browser dan inisialisasi aplikasi
// ------------------------------------------------------------
document.addEventListener('click', e => {
    const t = e.target.closest('[data-a]');
    if (t && A[t.dataset.a])
        A[t.dataset.a](t);
});

document.addEventListener('input', e => {
    const k = e.target.dataset.q;
    if (k) {
        ui[k] = e.target.value;
        render();
    }
});

document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.dataset.s) {
        const k = t.dataset.s;
        if (k === 'hl') {
            L = t.value;
        }
        else
            ui[k] = t.value;
        if (k === 'sc' || k === 'sf')
            ui.sa = '';
        render();
    }
    else if (t.dataset.t != null) {
        const i = +t.dataset.t;
        ui.tt = ui.tt.includes(i) ? ui.tt.filter(x => x !== i) : [...ui.tt, i].sort();
        render();
    }
    else if (t.dataset.mv) {
        const id = t.dataset.mv;
        const v = t.value;
        if (v === 'x') {
            const en = S.entries.find(x => x.id === id);
            S.entries = S.entries.filter(x => x.id !== id);
            await del('entries', id);
            touch(L);
            render();
        }
        else if (v !== 'Pindah…')
            mv(id, +v, null);
        else
            render();
    }
    else if (t.id === 'fi') {
        const f = t.files[0];
        if (!f)
            return;
        try {
            ui.img = await sq(f);
            $('#fp').innerHTML = art({ title: $('#ft').value || 'Judul', artist: $('#fa').value || 'Artis', img: ui.img, hue: ui.hue });
        }
        catch {
            $('#fe').textContent = 'Berkas bukan gambar yang valid.';
        }
    }
    else if (t.id === 'rf') {
        const f = t.files[0];
        t.value = '';
        if (!f)
            return;
        try {
            const d = JSON.parse(await f.text());
            if (d.app !== 'sagaras' || !['songs', 'lists', 'entries', 'snaps'].every(k => Array.isArray(d[k])))
                throw new Error('format tidak dikenali');
            const ids = new Set(d.songs.map(s => s.id));
            const lids = new Set(d.lists.map(l => l.id));
            if (d.songs.some(s => !s.id || !s.title || !s.artist || !CATS.includes(s.cat)))
                throw new Error('data lagu tidak valid');
            if (d.entries.some(x => !ids.has(x.songId) || !lids.has(x.listId)))
                throw new Error('ada referensi lagu/tierlist yang rusak');
            ui.rd = d;
            modal(`<h3>Pulihkan backup</h3><p>${d.songs.length} lagu, ${d.lists.length} tierlist, ${d.snaps.length} snapshot.</p><p><b>Ganti</b> menghapus semua data saat ini. <b>Gabung</b> menambahkan data backup (ID yang sama ditimpa).</p><div class="row"><button class="b dg" onclick="A.restore('replace')">Ganti semua</button><button class="b p" onclick="A.restore('merge')">Gabung</button><button class="b" data-a="close">Batal</button></div>`);
        }
        catch (er) {
            flash('Backup tidak valid: ' + er.message, 1);
        }
    }
});

document.addEventListener('dragstart', e => {
    const c = e.target.closest && e.target.closest('[data-e]');
    if (c) {
        ui.drag = c.dataset.e;
        c.classList.add('drag');
        e.dataTransfer.setData('text/plain', ui.drag);
        e.dataTransfer.effectAllowed = 'move';
    }
});

document.addEventListener('dragend', () => {
    ui.drag = null;
    document.querySelectorAll('.drag,.over').forEach(n => n.classList.remove('drag', 'over'));
});

document.addEventListener('dragover', e => {
    const z = e.target.closest && e.target.closest('[data-z]');
    if (z && ui.drag) {
        e.preventDefault();
        document.querySelectorAll('.over').forEach(n => n.classList.remove('over'));
        z.classList.add('over');
    }
});

document.addEventListener('drop', e => {
    const z = e.target.closest && e.target.closest('[data-z]');
    if (!z || !ui.drag)
        return;
    e.preventDefault();
    const c = e.target.closest('[data-e]');
    const b = c && c.dataset.e !== ui.drag ? c.dataset.e : null;
    const id = ui.drag;
    ui.drag = null;
    mv(id, +z.dataset.z, b);
});

async function load() {
    [S.songs, S.lists, S.entries, S.snaps] = await Promise.all(['songs', 'lists', 'entries', 'snaps'].map(getAll));
}

(async () => {
    try {
        DB = await open();
        await load();
        if (S.lists.length)
            L = S.lists.sort((a, b) => b.updated - a.updated)[0].id;
    }
    catch (e) {
        flash('IndexedDB tidak tersedia: data tidak akan tersimpan (' + e.message + ')', 1);
    }
    render();
})();
