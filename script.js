const API = 'https://perpustakaan.donnyn1980.workers.dev/api';
let currentAng = null;
let currentBuku = null;
let scanner = null;

function notify(m, t = 'success') {
    const el = document.getElementById('toast');
    el.innerText = m.toUpperCase();
    el.className = `fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-8 py-4 rounded-2xl shadow-2xl font-black text-white text-[10px] tracking-widest transition-all duration-500 opacity-100 ${t==='success'?'bg-slate-900':'bg-red-600'}`;
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
}

async function handleLogin() {
    const u = document.getElementById('l-user').value;
    const p = document.getElementById('l-pass').value;
    const token = btoa(`${u}:${p}`);
    try {
        const res = await fetch(`${API}/get-buku`, { headers: { 'Authorization': `Basic ${token}` } });
        if (res.ok) {
            localStorage.setItem('S2_AUTH', token);
            location.reload();
        } else throw new Error();
    } catch (e) { notify("Akses Ditolak", "error"); }
}

function logout() { localStorage.removeItem('S2_AUTH'); location.reload(); }
function getH() { return { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}`, 'Content-Type': 'application/json' }; }

function tab(n) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`view-${n}`).classList.remove('hidden');
    document.getElementById(`btn-${n}`).classList.add('tab-active');
    if(n === 'buku') fetchBuku();
    if(n === 'anggota') fetchAnggota();
    if(n === 'sirkulasi') initScanner();
}

function initScanner() {
    if(scanner) return;
    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, (txt) => {
        if(txt.includes('.')) checkBuku(txt); else checkAng(txt);
    });
}

async function checkAng(nis) {
    const res = await fetch(`${API}/cek-anggota?nis=${nis}`, { headers: getH() });
    const d = await res.json();
    if(!d) return notify("Anggota Tak Ditemukan", "error");
    currentAng = d;
    document.getElementById('ang-profile').classList.remove('hidden');
    document.getElementById('ang-nama').innerText = d.nama_lengkap;
    document.getElementById('ang-meta').innerText = `${d.nomor_anggota} | ${d.kelas}`;
    renderSlots(d);
}

function renderSlots(d) {
    let h = "";
    ['pinjaman1', 'pinjaman2', 'pinjaman3'].forEach((s, i) => {
        if(d[s]) {
            const b = JSON.parse(d[s]);
            h += `<div class="p-4 bg-white border rounded-2xl flex justify-between items-center shadow-sm">
                <div class="text-[10px] font-bold"><div>${b.judul}</div><div class="text-red-500 uppercase mt-1">Batas: ${b.tgl_batas}</div></div>
                <button onclick="handleRetur('${d.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest">Retur</button>
            </div>`;
        } else { h += `<div class="p-4 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-300 font-bold text-[9px] uppercase">Slot ${i+1} Kosong</div>`; }
    });
    document.getElementById('loan-slots').innerHTML = h;
}

async function checkBuku(kode) {
    if(!currentAng) return notify("Scan Anggota Dahulu", "error");
    const res = await fetch(`${API}/cek-buku?kode=${kode}`, { headers: getH() });
    const d = await res.json();
    if(!d || !d.status.includes('SR')) return notify("Buku RF / Dipinjam", "error");
    currentBuku = d;
    document.getElementById('loan-confirm').classList.remove('hidden');
    document.getElementById('confirm-judul').innerText = d.judul;
    const tgl = new Date(); tgl.setDate(tgl.getDate() + 7);
    document.getElementById('batas-tgl').value = tgl.toISOString().split('T')[0];
}

async function executePinjam() {
    const p = { nis: currentAng.nomor_anggota, kode_buku: currentBuku.kode_buku, judul: currentBuku.judul, tgl_batas: document.getElementById('batas-tgl').value };
    const res = await fetch(`${API}/pinjam`, { method: 'POST', headers: getH(), body: JSON.stringify(p) });
    if(res.ok) { notify("Berhasil Pinjam"); checkAng(currentAng.nomor_anggota); document.getElementById('loan-confirm').classList.add('hidden'); }
}

async function handleRetur(nis, kode, slot) {
    const res = await fetch(`${API}/retur`, { method: 'POST', headers: getH(), body: JSON.stringify({ nis, kode_buku: kode, slot }) });
    const d = await res.json();
    notify(`Retur Berhasil. Denda: Rp ${d.denda}`);
    checkAng(nis);
}

async function fetchBuku() {
    const res = await fetch(`${API}/get-buku`, { headers: getH() });
    const d = await res.json();
    document.getElementById('tbl-buku').innerHTML = d.map(b => `<tr class="border-b"><td class="p-6 font-mono text-blue-600">${b.kode_buku}</td><td class="p-6 uppercase">${b.judul}<br><span class="text-[9px] text-slate-400 font-bold">${b.pengarang}</span></td><td class="p-6 text-center"><span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${b.status.includes('Tersedia')?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">${b.status}</span></td></tr>`).join('');
}

async function fetchAnggota() {
    const res = await fetch(`${API}/anggota`, { headers: getH() });
    const d = await res.json();
    document.getElementById('tbl-anggota').innerHTML = d.map(a => `<div class="glass p-6 rounded-[24px] text-center"><div class="text-xs font-black uppercase">${a.nama_lengkap}</div><div class="text-[9px] font-bold text-slate-400 mt-1">${a.nomor_anggota} | ${a.kelas}</div></div>`).join('');
}

document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const d = { judul: document.getElementById('b-judul').value, pengarang: document.getElementById('b-pgr').value, isbn: document.getElementById('b-isbn').value, klasifikasi: document.getElementById('b-klas').value, stok: document.getElementById('b-stok').value };
    await fetch(`${API}/buku`, { method: 'POST', headers: getH(), body: JSON.stringify(d) });
    notify("Buku Tersimpan"); fetchBuku(); e.target.reset();
};

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const d = { nomor_anggota: document.getElementById('a-nis').value, nama_lengkap: document.getElementById('a-nama').value, kelas: document.getElementById('a-kls').value };
    await fetch(`${API}/anggota`, { method: 'POST', headers: getH(), body: JSON.stringify(d) });
    notify("Anggota Terdaftar"); fetchAnggota(); e.target.reset();
};

window.onload = () => {
    const auth = localStorage.getItem('S2_AUTH');
    if(auth) {
        document.getElementById('login-page').style.display = 'none';
        const d = document.getElementById('dashboard');
        d.classList.remove('hidden');
        setTimeout(() => d.style.opacity = '1', 100);
        tab('sirkulasi');
    }
};
