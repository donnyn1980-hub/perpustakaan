const API = 'https://perpustakaan.donnyn1980.workers.dev/api';
let qr;
let angSel = null;
let bukSel = null;

// --- KEAMANAN & LOGOUT ---
function initApp() {
    const auth = localStorage.getItem('perpus_auth');
    if (auth) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard-page').classList.replace('hidden-secure', 'active-secure');
        openTab('sirkulasi');
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('dashboard-page').classList.replace('active-secure', 'hidden-secure');
    }
}

async function prosesLogin() {
    const u = document.getElementById('l-user').value;
    const p = document.getElementById('l-pass').value;
    const str = btoa(`${u}:${p}`);
    try {
        const res = await fetch(`${API}/buku`, { headers: { 'Authorization': 'Basic ' + str } });
        if (res.ok) {
            localStorage.setItem('perpus_auth', str);
            initApp();
        } else { throw new Error(); }
    } catch (e) { document.getElementById('l-err').classList.remove('hidden'); }
}

function logout() { localStorage.removeItem('perpus_auth'); location.reload(); }

// --- TAB & HEADERS ---
function getH() { return { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'), 'Content-Type': 'application/json' }; }

function openTab(n) {
    document.querySelectorAll('.tab-content, section.hidden-secure').forEach(s => { if(s.id.startsWith('view')) s.classList.replace('active-secure', 'hidden-secure'); });
    document.querySelectorAll('.tab-btn').forEach(b => b.className = "tab-btn flex-1 py-2 rounded font-bold text-xs uppercase transition");
    document.getElementById('view-'+n).classList.replace('hidden-secure', 'active-secure');
    document.getElementById('btn-'+n).classList.add('bg-blue-600', 'text-white');
    if(n==='buku') loadBuku();
    if(n==='anggota') loadAnggota();
}

// --- SCANNER & SIRKULASI (LOGIKA DATABASE UTUH) ---
function scan(t) {
    if(qr) qr.stop().then(() => initScan(t)).catch(() => initScan(t));
    else initScan(t);
}

function initScan(t) {
    qr = new Html5Qrcode("reader");
    qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (txt) => {
        qr.stop();
        if(t==='anggota') { document.getElementById('in-ang').value = txt; cekAng(txt); }
        else { document.getElementById('in-buk').value = txt; cekBuk(txt); }
    });
}

async function cekAng(no) {
    if(!no) return;
    const res = await fetch(`${API}/anggota/cek?q=${no}`, { headers: getH() });
    const d = await res.json();
    if(!d) return alert("NIS tidak ditemukan!");
    angSel = d;
    document.getElementById('det-ang').innerHTML = `<div class="font-bold text-blue-700">${d.nama_lengkap}</div><div class="uppercase">${d.nomor_anggota} | ${d.kelas}</div>`;
    let h = "";
    ['pinjaman1', 'pinjaman2', 'pinjaman3'].forEach((s, i) => {
        if(d[s]) {
            const b = JSON.parse(d[s]);
            h += `<div class="p-2 bg-red-50 border-l-4 border-red-600 rounded flex justify-between items-center text-[10px]"><div><b>${b.judul}</b><br>Batas: ${b.batas_kembali}</div><button onclick="kembali('${d.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-red-600 text-white px-2 py-1 rounded font-bold uppercase">Balik</button></div>`;
        } else { h += `<div class="p-2 border border-dashed rounded text-center text-gray-400 italic text-[10px]">Slot ${i+1} Kosong</div>`; }
    });
    document.getElementById('det-sl').innerHTML = h;
}

async function cekBuk(k) {
    if(!angSel) return alert("Scan Anggota dulu!");
    const res = await fetch(`${API}/buku/cek?q=${k}`, { headers: getH() });
    const d = await res.json();
    if(!d || !d.status.includes('Tersedia (SR)')) return alert("Buku tidak tersedia/hanya Referensi!");
    bukSel = d;
    document.getElementById('form-pj').classList.remove('hidden');
    document.getElementById('det-bk').innerHTML = `<b>${d.judul}</b><br>${d.kode_buku}`;
    const dt = new Date(); dt.setDate(dt.getDate() + 7);
    document.getElementById('in-tgl').value = dt.toISOString().split('T')[0];
}

async function pinjam() {
    const b = { kode_peminjaman: 'PJ-'+Date.now(), nomor_anggota: angSel.nomor_anggota, kode_buku: bukSel.kode_buku, judul: bukSel.judul, batas_kembali: document.getElementById('in-tgl').value };
    const res = await fetch(`${API}/sirkulasi`, { method: 'POST', headers: getH(), body: JSON.stringify(b) });
    if(res.ok) { alert("Berhasil!"); cekAng(angSel.nomor_anggota); document.getElementById('form-pj').classList.add('hidden'); }
    else { const e = await res.json(); alert(e.error); }
}

async function kembali(no, kd, sl) {
    if(!confirm("Kembalikan?")) return;
    const res = await fetch(`${API}/kembali/0`, { method: 'POST', headers: getH(), body: JSON.stringify({ nomor_anggota: no, kode_buku: kd, slot: sl }) });
    const d = await res.json();
    alert("Buku Kembali. Denda: Rp" + d.denda);
    cekAng(no);
}

// --- MASTER DATA ---
async function loadBuku() {
    const res = await fetch(`${API}/buku`, { headers: getH() });
    const d = await res.json();
    document.getElementById('l-buku').innerHTML = d.map(b => `<tr class="border-b"><td class="p-1 font-mono uppercase">${b.kode_buku}</td><td class="p-1">${b.judul}</td><td class="p-1 font-bold">${b.status}</td></tr>`).join('');
}

async function loadAnggota() {
    const res = await fetch(`${API}/anggota`, { headers: getH() });
    const d = await res.json();
    document.getElementById('l-anggota').innerHTML = `<table class="w-full border text-left"><thead><tr class="bg-gray-100"><th>NIS</th><th>Nama</th><th>Slot</th></tr></thead><tbody>${d.map(a => `<tr class="border-b"><td>${a.nomor_anggota}</td><td>${a.nama_lengkap}</td><td>${[a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x=>x).length}/3</td></tr>`).join('')}</tbody></table>`;
}

document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const b = { klasifikasi: document.getElementById('b-klas').value, kategori: document.getElementById('b-cat').value, pengarang: document.getElementById('b-pgr').value, judul: document.getElementById('b-judul').value, stok: document.getElementById('b-stok').value, isbn: document.getElementById('b-isbn').value };
    await fetch(`${API}/buku`, { method: 'POST', headers: getH(), body: JSON.stringify(b) });
    alert("Tersimpan!"); loadBuku(); e.target.reset(); upCat();
};

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const a = { nomor_anggota: document.getElementById('a-no').value, nama_lengkap: document.getElementById('a-nama').value, kelas: document.getElementById('a-kls').value };
    await fetch(`${API}/anggota`, { method: 'POST', headers: getH(), body: JSON.stringify(a) });
    alert("Tersimpan!"); loadAnggota(); e.target.reset();
};

function upCat() {
    const d = { "000": "Umum", "800": "Fiksi" };
    document.getElementById('b-cat').value = d[document.getElementById('b-klas').value] || "Lainnya";
}

window.onload = initApp;
