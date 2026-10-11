# Sagaras Music Tierlist

Aplikasi web statis (HTML + CSS + JavaScript murni, tanpa build/npm).

## Menjalankan di VS Code
1. Buka folder ini di VS Code (File > Open Folder).
2. Pasang ekstensi **Live Server** (Ritwick Dey).
3. Klik kanan `index.html` > **Open with Live Server**.

Alternatif: `python -m http.server 8000` di folder ini, lalu buka http://localhost:8000.

## Berkas
- `index.html` - struktur halaman
- `style.css` - tema Neon Nocturne
- `app.js` - logika, IndexedDB, grafik, ekspor PNG, backup/restore

## Catatan
- Data tersimpan di IndexedDB browser, terpisah per alamat (origin). Data di versi online (claude.ai) TIDAK otomatis ada di sini: unduh Backup dari versi online, lalu Pulihkan di sini.
- Gunakan alamat yang sama (mis. selalu localhost:5500) agar data tidak "hilang".
- Font memakai Google Fonts (perlu internet; ada fallback jika offline).
