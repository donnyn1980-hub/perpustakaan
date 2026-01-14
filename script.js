const API = 'https://perpustakaan.donnyn1980.workers.dev/api';
let qrx;
let curAng = null;
let curBuk = null;

// --- AUTH & GUARD ---
function app() {
    const auth = localStorage.getItem('perpus_auth');
    if (!auth) {
        document.getElementById('page-login').classList.add('page-active');
        document.getElementById('page-dash').classList.add('hidden-all');
    } else {
        document.getElementById('page-login').classList.remove('page-active');
        document.getElementById('page-dash').classList.add('page-active');
        tab('sirkulasi');
    }
}

async function authLogin() {
    const u = document.getElementById('l-user').value;
    const p = document.getElementById('l-pass').value;
    const str = btoa(`${u}:${p}`);
    try {
        const res = await fetch(`${API}/buku`, { headers: { 'Authorization': 'Basic ' + str } });
        if (res.ok) {
            localStorage.setItem('perpus_auth', str);
            app();
        } else { throw new Error(); }
    } catch (e) { document.getElementById('l-err').classList.remove('hidden'); }
}

function authLogout() {
    localStorage.removeItem('perpus_auth');
    location.reload();
}

// --- TABS ---
function tab(n) {
    document.querySelectorAll('section.hidden-all').forEach(s => s.classList.remove('tab-active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('bg-blue-800', 'text-white'));
    
    document.getElementById(`view-${n}`).classList.add('tab-active');
    document.getElementById(`t-${n}`).classList.add('bg-blue-800', 'text-white');

    if(n==='buku') getBuk();
    if(n==='anggota') getAng();
}

// --- SIRKULASI ---
function sc(type) {
    if(qrx) qrx.stop().then(() => init(type)).catch(() => init(type));
    else init(type);
}

function init(type) {
    qrx = new Html5Qrcode("scanner");
    qrx.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (txt) => {
        qrx.stop();
        if(type==='anggota') { document.getElementById('in-anggota').value = txt; cekAng(txt); }
        else { document.getElementById('in-buku').value = txt; cekBuk(txt); }
    });
}

async function cekAng(no) {
    if(!no) return;
    const res = await fetch(`${API}/anggota/cek?q=${no}`, { headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth') } });
    const d = await res.json();
    if(!d) return alert("Anggota tak ditemukan!");
    
    curAng = d;
    document.getElementById('det-ang').innerHTML = `<div class="font-bold">${d.nama_lengkap}</div><div class="text-[10px] uppercase font-mono">${d.nomor_anggota} | ${d.kelas}</div>`;
    
    let h = "";
    ['pinjaman1', 'pinjaman2', 'pinjaman3'].forEach((s, i) => {
        if(d[s]) {
            const b = JSON.parse(d[s]);
            h += `<div class="p-2 bg-red-50 border-l-4 border-red-600 rounded flex justify-between items-center text-[10px]">
                <div><b>${b.judul}</b><br>Batas: ${b.batas_kembali}</div>
                <button onclick="kembali('${d.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-red-700 text-white px-2 py-1 rounded font-bold">KEMBALI</button>
            </div>`;
        } else {
            h += `<div class="p-2 border border-dashed rounded text-center text-gray-400 italic text-[10px]">Slot ${i+1} Kosong</div>`;
        }
    });
    document.getElementById('det-sl').innerHTML = h;
}

async function cekBuk(k) {
    if(!curAng) return alert("Cek Anggota Dulu!");
    const res = await fetch(`${API}/buku/cek?q=${k}`, { headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth') } });
    const d = await res.json();
    if(!d || !d.status.includes('Tersedia (SR)')) return alert("Buku tak tersedia (SR)!");
    
    curBuk = d;
    document.getElementById('box-pinjam').classList.remove('hidden');
    document.getElementById('det-bk').innerHTML = `<b>${d.judul}</b><br>${d.kode_buku}`;
    const dt = new Date(); dt.setDate(dt.getDate() + 7);
    document.getElementById('in-tgl').value = dt.toISOString().split('T')[0];
}

async function pinjam() {
    const b = { kode_peminjaman: 'PJ-'+Date.now(), nomor_anggota: curAng.nomor_anggota, kode_buku: curBuk.kode_buku, judul: curBuk.judul, batas_kembali: document.getElementById('in-tgl').value };
    const res = await fetch(`${API}/sirkulasi`, { method: 'POST', headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'), 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    if(res.ok) { alert("Berhasil!"); cekAng(curAng.nomor_anggota); document.getElementById('box-pinjam').classList.add('hidden'); }
    else { const e = await res.json(); alert(e.error); }
}

async function kembali(no, kd, sl) {
    if(!confirm("Kembalikan?")) return;
    const res = await fetch(`${API}/kembali/0`, { method: 'POST', headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'), 'Content-Type': 'application/json' }, body: JSON.stringify({ nomor_anggota: no, kode_buku: kd, slot: sl }) });
    const d = await res.json();
    alert("Denda: Rp" + d.denda);
    cekAng(no);
}

// --- MASTER DATA LOAD ---
async function getBuk() {
    const res = await fetch(`${API}/buku`, { headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth') } });
    const d = await res.json();
    document.getElementById('l-buku').innerHTML = d.map(b => `<tr class="border-b"><td class="p-1 font-mono">${b.kode_buku}</td><td class="p-1">${b.judul}</td><td class="p-1">${b.status}</td></tr>`).join('');
}

async function getAng() {
    const res = await fetch(`${API}/anggota`, { headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth') } });
    const d = await res.json();
    document.getElementById('l-anggota').innerHTML = `<table class="w-full border"><thead><tr class="bg-gray-50"><th>NIS</th><th>Nama</th><th>Slot</th></tr></thead><tbody>${d.map(a => `<tr class="border-b"><td>${a.nomor_anggota}</td><td>${a.nama_lengkap}</td><td>${[a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x=>x).length}/3</td></tr>`).join('')}</tbody></table>`;
}

// --- FORM HANDLER ---
document.getElementById('f-buku').onsubmit = async (e) => {
    e.preventDefault();
    const b = { klasifikasi: document.getElementById('b-klas').value, kategori: document.getElementById('b-cat').value, pengarang: document.getElementById('b-pgr').value, judul: document.getElementById('b-jdl').value, stok: document.getElementById('b-stok').value, isbn: document.getElementById('b-isbn').value };
    await fetch(`${API}/buku`, { method: 'POST', headers: { 'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'), 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
    alert("Simpan!"); getBuk(); e.target.reset(); upCat();
};

function upCat() {
    const d = { "000": "Umum", "500": "Sains", "800": "Fiksi" };
    document.getElementById('b-cat').value = d[document.getElementById('b-klas').value] || "Lainnya";
}

window.onload = app;
