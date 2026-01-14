const API = 'https://perpustakaan.donnyn1980.workers.dev/api';
let currentAng = null;
let currentBuku = null;
let scanner = null;

function notify(m, t = 'success') {
    const el = document.getElementById('toast');
    el.innerText = m;
    el.style.background = t === 'success' ? '#0f172a' : '#ef4444';
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%, 10px)';
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%, 0)'; }, 3000);
}

function handleLogin() {
    const u = document.getElementById('l-user').value;
    const p = document.getElementById('l-pass').value;
    if(!u || !p) return notify("Lengkapi Kredensial", "error");
    
    const token = btoa(`${u}:${p}`);
    fetch(`${API}/get-buku`, { headers: { 'Authorization': `Basic ${token}` }})
    .then(r => {
        if(r.ok) {
            localStorage.setItem('S2_AUTH', token);
            location.reload();
        } else throw new Error();
    }).catch(() => notify("Akses Ditolak", "error"));
}

function logout() { localStorage.removeItem('S2_AUTH'); location.reload(); }

function init() {
    const auth = localStorage.getItem('S2_AUTH');
    if(auth) {
        document.getElementById('login-page').style.display = 'none';
        const d = document.getElementById('dashboard');
        d.classList.remove('hidden');
        setTimeout(() => d.style.opacity = '1', 100);
        tab('sirkulasi');
    }
}

function tab(n) {
    document.querySelectorAll('[id^="view-"]').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
    document.getElementById(`view-${n}`).classList.remove('hidden');
    document.getElementById(`btn-${n}`).classList.add('tab-active');
    
    if(n === 'buku') fetchBuku();
    if(n === 'anggota') fetchAnggota();
    if(n === 'sirkulasi') initScanner();
}

// SCANNER ENGINE
function initScanner() {
    if(scanner) return;
    scanner = new Html5Qrcode("reader");
    scanner.start({ facingMode: "environment" }, { fps: 20, qrbox: 250 }, (txt) => {
        if(txt.length > 10) checkBuku(txt); else checkAng(txt);
    });
}

async function checkAng(nis) {
    const res = await fetch(`${API}/cek-anggota?nis=${nis}`, { headers: { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}` }});
    const d = await res.json();
    if(!d) return notify("Anggota Tidak Ditemukan", "error");
    
    currentAng = d;
    document.getElementById('ang-profile').classList.remove('hidden');
    document.getElementById('ang-nama').innerText = d.nama_lengkap;
    document.getElementById('ang-meta').innerText = `${d.nomor_anggota} • ${d.kelas}`;
    
    renderSlots(d);
    notify("Anggota Teridentifikasi");
}

function renderSlots(d) {
    let html = "";
    ['pinjaman1', 'pinjaman2', 'pinjaman3'].forEach((s, i) => {
        if(d[s]) {
            const b = JSON.parse(d[s]);
            html += `<div class="p-5 bg-white border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm">
                <div class="text-xs font-bold uppercase">
                    <div class="text-slate-900">${b.judul}</div>
                    <div class="text-red-500 opacity-60 mt-1">Batas: ${b.tgl_batas}</div>
                </div>
                <button onclick="handleRetur('${d.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl font-black text-[9px] uppercase hover:bg-slate-900 hover:text-white transition">Retur</button>
            </div>`;
        } else {
            html += `<div class="p-5 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-300 font-bold text-[10px] uppercase">Slot ${i+1} Tersedia</div>`;
        }
    });
    document.getElementById('loan-slots').innerHTML = html;
}

async function checkBuku(kode) {
    if(!currentAng) return notify("Scan Anggota Dahulu", "error");
    const res = await fetch(`${API}/cek-buku?kode=${kode}`, { headers: { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}` }});
    const d = await res.json();
    
    if(!d || !d.status.includes('SR')) return notify("Buku Tidak Tersedia/RF", "error");
    
    currentBuku = d;
    document.getElementById('loan-confirm').classList.remove('hidden');
    document.getElementById('confirm-judul').innerText = d.judul;
    const tgl = new Date(); tgl.setDate(tgl.getDate() + 7);
    document.getElementById('batas-tgl').value = tgl.toISOString().split('T')[0];
    notify("Katalog Buku Ditemukan");
}

async function executePinjam() {
    const payload = {
        nis: currentAng.nomor_anggota,
        kode_buku: currentBuku.kode_buku,
        judul: currentBuku.judul,
        tgl_batas: document.getElementById('batas-tgl').value
    };
    const res = await fetch(`${API}/pinjam`, { 
        method: 'POST', 
        headers: { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if(res.ok) {
        notify("Peminjaman Berhasil");
        checkAng(currentAng.nomor_anggota);
        document.getElementById('loan-confirm').classList.add('hidden');
    }
}

async function handleRetur(nis, kode, slot) {
    const res = await fetch(`${API}/retur`, { 
        method: 'POST', 
        headers: { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nis, kode_buku: kode, slot })
    });
    const d = await res.json();
    notify(`Retur Berhasil. Denda: Rp ${d.denda}`);
    checkAng(nis);
}

// DATA LOADER
async function fetchBuku() {
    const res = await fetch(`${API}/get-buku`, { headers: { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}` }});
    const data = await res.json();
    document.getElementById('tbl-buku').innerHTML = data.map(b => `
        <tr class="hover:bg-slate-50 transition">
            <td class="p-6 font-mono font-bold text-blue-600">${b.kode_buku}</td>
            <td class="p-6">
                <div class="font-black uppercase text-slate-700">${b.judul}</div>
                <div class="text-[10px] text-slate-400 font-bold">${b.pengarang}</div>
            </td>
            <td class="p-6 text-center">
                <span class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase ${b.status.includes('Tersedia')?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">${b.status}</span>
            </td>
        </tr>
    `).join('');
}

// Event Handlers for Forms...
document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        judul: document.getElementById('b-judul').value,
        pengarang: document.getElementById('b-pgr').value,
        isbn: document.getElementById('b-isbn').value,
        klasifikasi: document.getElementById('b-klas').value,
        stok: document.getElementById('b-stok').value
    };
    await fetch(`${API}/buku`, { method: 'POST', headers: { 'Authorization': `Basic ${localStorage.getItem('S2_AUTH')}`, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    notify("Data Inventaris Ditambahkan");
    fetchBuku();
};

window.onload = init;
