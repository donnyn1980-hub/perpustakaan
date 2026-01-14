const API = 'https://perpustakaan.donnyn1980.workers.dev/api';
let qr;
let angS = null;
let bukS = null;

function showMsg(txt, type = 'success') {
    const t = document.getElementById('toast');
    t.innerText = txt.toUpperCase();
    t.className = `fixed top-8 left-1/2 -translate-x-1/2 z-[60] px-8 py-4 rounded-2xl shadow-2xl font-black text-white text-[10px] tracking-widest transition-all duration-500 opacity-100 ${type==='success'?'bg-slate-900 shadow-slate-200':'bg-red-600 shadow-red-200'}`;
    setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

function init() {
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
    const b = document.getElementById('btn-login');
    if(!u || !p) return showMsg("Data Kosong", "error");
    
    b.disabled = true; b.innerText = "AUTHENTICATING...";
    const tok = btoa(`${u}:${p}`);
    try {
        const res = await fetch(`${API}/buku`, { headers: { 'Authorization': 'Basic ' + tok } });
        if (res.ok) { localStorage.setItem('perpus_auth', tok); showMsg("Akses Diterima"); init(); }
        else throw new Error();
    } catch (e) { showMsg("Akses Ditolak", "error"); b.disabled = false; b.innerText = "OTORISASI MASUK"; }
}

function logout() { localStorage.removeItem('perpus_auth'); location.reload(); }
function getH() { return { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'), 'Content-Type': 'application/json' }; }

function openTab(n) {
    document.querySelectorAll('section.hidden-secure').forEach(s => { if(s.id.startsWith('view')) s.classList.replace('active-secure', 'hidden-secure'); });
    document.querySelectorAll('.tab-btn').forEach(b => b.className = "tab-btn flex-1 py-3 rounded-xl font-bold text-[11px] uppercase transition-all duration-300 text-slate-500");
    document.getElementById('view-'+n).classList.replace('hidden-secure', 'active-secure');
    document.getElementById('t-'+n).classList.add('tab-active');
    if(n==='buku') loadBuku();
    if(n==='anggota') loadAnggota();
}

function scan(t) {
    if(qr) qr.stop().then(() => startScan(t)).catch(() => startScan(t));
    else startScan(t);
}

function startScan(t) {
    qr = new Html5Qrcode("reader");
    qr.start({ facingMode: "environment" }, { fps: 20, qrbox: 220 }, (txt) => {
        qr.stop();
        if(t==='anggota') { document.getElementById('in-ang').value = txt; cekAng(txt); }
        else { document.getElementById('in-buk').value = txt; cekBuk(txt); }
    }).catch(() => showMsg("Kamera Error", "error"));
}

async function cekAng(no) {
    if(!no) return;
    const res = await fetch(`${API}/anggota/cek?q=${no}`, { headers: getH() });
    const d = await res.json();
    if(!d) return showMsg("Anggota Tak Ditemukan", "error");
    angS = d;
    document.getElementById('det-ang').innerHTML = `<div class="font-black text-slate-900 text-xl uppercase">${d.nama_lengkap}</div><div class="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">${d.nomor_anggota} &bull; ${d.kelas}</div>`;
    let h = "";
    ['pinjaman1', 'pinjaman2', 'pinjaman3'].forEach((s, i) => {
        if(d[s]) {
            const b = JSON.parse(d[s]);
            h += `<div class="p-5 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                <div class="text-[10px] uppercase font-black"><div class="text-slate-900 mb-1">${b.judul}</div><div class="text-red-500 opacity-60">Kembali: ${b.batas_kembali}</div></div>
                <button onclick="kembali('${d.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-slate-900 hover:text-white transition">Retur</button>
            </div>`;
        } else { h += `<div class="p-5 border-2 border-dashed border-slate-50 rounded-2xl text-center text-slate-300 font-black text-[9px] uppercase tracking-tighter">Slot ${i+1} Kosong</div>`; }
    });
    document.getElementById('det-sl').innerHTML = h;
    showMsg("Identitas Terbaca");
}

async function cekBuk(k) {
    if(!angS) return showMsg("Pilih Anggota!", "error");
    const res = await fetch(`${API}/buku/cek?q=${k}`, { headers: getH() });
    const d = await res.json();
    if(!d || !d.status.includes('Tersedia (SR)')) return showMsg("Buku Tidak Tersedia/RF", "error");
    bukS = d;
    document.getElementById('form-pj').classList.remove('hidden');
    document.getElementById('det-bk').innerHTML = `<div class="font-black uppercase text-sm mb-1 text-blue-300">${d.judul}</div><div class="text-[10px] font-bold opacity-50">${d.kode_buku}</div>`;
    const dt = new Date(); dt.setDate(dt.getDate() + 7);
    document.getElementById('in-tgl').value = dt.toISOString().split('T')[0];
    showMsg("Katalog Ditemukan");
}

async function pinjam() {
    const b = { kode_peminjaman: 'PJ-'+Date.now(), nomor_anggota: angS.nomor_anggota, kode_buku: bukS.kode_buku, judul: bukS.judul, batas_kembali: document.getElementById('in-tgl').value };
    const res = await fetch(`${API}/sirkulasi`, { method: 'POST', headers: getH(), body: JSON.stringify(b) });
    if(res.ok) { showMsg("Peminjaman Berhasil"); cekAng(angS.nomor_anggota); document.getElementById('form-pj').classList.add('hidden'); }
    else { const e = await res.json(); showMsg(e.error, "error"); }
}

async function kembali(no, kd, sl) {
    const res = await fetch(`${API}/kembali/0`, { method: 'POST', headers: getH(), body: JSON.stringify({ nomor_anggota: no, kode_buku: kd, slot: sl }) });
    const d = await res.json();
    showMsg(`Berhasil Di-Retur. Denda: Rp${d.denda}`);
    cekAng(no);
}

async function loadBuku() {
    const res = await fetch(`${API}/buku`, { headers: getH() });
    const d = await res.json();
    document.getElementById('l-buku').innerHTML = d.map(b => `<tr class="hover:bg-slate-50 transition"><td class="p-5 font-mono font-black text-blue-600">${b.kode_buku}</td><td class="font-extrabold uppercase text-slate-700">${b.judul}<br><span class="text-[9px] text-slate-400 font-bold">${b.pengarang}</span></td><td class="text-center font-black text-[9px] uppercase"><span class="px-3 py-1 rounded-full ${b.status.includes('Tersedia')?'bg-green-50 text-green-600':'bg-red-50 text-red-600'}">${b.status}</span></td></tr>`).join('');
}

async function loadAnggota() {
    const res = await fetch(`${API}/anggota`, { headers: getH() });
    const d = await res.json();
    document.getElementById('l-anggota').innerHTML = `<table class="w-full text-xs text-left"><thead class="bg-slate-50 uppercase font-black text-slate-400 text-[10px]"><tr><th class="p-5">Identitas</th><th>Kelas</th><th class="text-center">Kapasitas</th></tr></thead><tbody class="divide-y divide-slate-50">${d.map(a => `<tr class="hover:bg-slate-50 font-bold"><td class="p-5 uppercase font-black text-slate-700">${a.nama_lengkap}<br><span class="text-[9px] text-slate-400 font-bold">${a.nomor_anggota}</span></td><td>${a.kelas}</td><td class="text-center text-blue-600 font-black">${[a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x=>x).length}/3</td></tr>`).join('')}</tbody></table>`;
}

document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const b = { klasifikasi: document.getElementById('b-klas').value, kategori: document.getElementById('b-cat').value, pengarang: document.getElementById('b-pgr').value, judul: document.getElementById('b-judul').value, stok: document.getElementById('b-stok').value, isbn: document.getElementById('b-isbn').value };
    await fetch(`${API}/buku`, { method: 'POST', headers: getH(), body: JSON.stringify(b) });
    showMsg("Buku Ditambahkan"); loadBuku(); e.target.reset(); upCat();
};

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const a = { nomor_anggota: document.getElementById('a-no').value, nama_lengkap: document.getElementById('a-nama').value, kelas: document.getElementById('a-kls').value };
    await fetch(`${API}/anggota`, { method: 'POST', headers: getH(), body: JSON.stringify(a) });
    showMsg("Member Terdaftar"); loadAnggota(); e.target.reset();
};

function upCat() {
    const d = { "000": "UMUM", "500": "SAINS", "800": "FIKSI" };
    document.getElementById('b-cat').value = d[document.getElementById('b-klas').value] || "LAINNYA";
}

window.onload = init;
