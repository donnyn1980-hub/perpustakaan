const API_URL = 'https://perpustakaan.donnyn1980.workers.dev/api';
let html5QrCode;
let selectedAnggota = null;
let selectedBuku = null;

// --- LOGIKA AUTENTIKASI ---
function prosesLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorMsg = document.getElementById('login-error');

    const authString = btoa(`${user}:${pass}`);
    localStorage.setItem('perpus_auth', authString);

    fetch(`${API_URL}/buku`, { headers: { 'Authorization': 'Basic ' + authString } })
    .then(res => {
        if (res.ok) {
            errorMsg.classList.add('hidden');
            showDashboard();
        } else {
            throw new Error();
        }
    }).catch(() => {
        localStorage.removeItem('perpus_auth');
        errorMsg.classList.remove('hidden');
    });
}

function showDashboard() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    openTab('buku');
}

function logout() {
    localStorage.removeItem('perpus_auth');
    location.reload();
}

// --- LOGIKA TAB & DATA ---
function getHeaders() {
    return { 
        'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'),
        'Content-Type': 'application/json'
    };
}

function openTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.className = "tab-btn px-6 py-2 rounded-md font-medium transition");
    document.getElementById(name).classList.add('active');
    document.getElementById('btn-'+name).classList.add('bg-blue-600', 'text-white');
    if(name==='buku') loadBuku();
    if(name==='anggota') loadAnggota();
}

// --- SCANNER ---
function startScan(type) {
    if(html5QrCode) {
        html5QrCode.stop().then(() => initScanner(type)).catch(() => initScanner(type));
    } else {
        initScanner(type);
    }
}

function initScanner(type) {
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (text) => {
        html5QrCode.stop();
        if(type==='anggota') { document.getElementById('m_nomor_anggota').value = text; handleScanAnggota(text); }
        else { document.getElementById('m_kode_buku').value = text; handleScanBuku(text); }
    }).catch(err => alert("Kamera Error"));
}

// --- TRANSAKSI SIRKULASI ---
async function handleScanAnggota(no) {
    if(!no) return;
    const res = await fetch(`${API_URL}/anggota/cek?q=${no}`, { headers: getHeaders() });
    const data = await res.json();
    if(!data) return alert("Anggota tidak ditemukan!");
    
    selectedAnggota = data;
    document.getElementById('p-detail-anggota').innerHTML = `<div class="font-bold text-blue-800">${data.nama_lengkap}</div><div class="text-[10px]">${data.nomor_anggota} | ${data.kelas}</div>`;
    
    const slots = ['pinjaman1', 'pinjaman2', 'pinjaman3'];
    let html = "";
    slots.forEach((s, i) => {
        if(data[s]) {
            const b = JSON.parse(data[s]);
            html += `<div class="p-2 border-l-4 border-red-500 bg-red-50 rounded flex justify-between items-center"><div class="text-[10px]"><b>${b.judul}</b><br>Batas: ${b.batas_kembali}</div><button onclick="kembalikanBuku('${data.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-red-600 text-white px-2 py-1 rounded text-[10px]">KEMBALI</button></div>`;
        } else {
            html += `<div class="p-2 border border-dashed rounded text-[10px] text-gray-400 italic text-center">Slot ${i+1} Kosong</div>`;
        }
    });
    document.getElementById('p-list-pinjaman').innerHTML = html;
}

async function handleScanBuku(kode) {
    if(!selectedAnggota) return alert("Scan Anggota dulu!");
    const res = await fetch(`${API_URL}/buku/cek?q=${kode}`, { headers: getHeaders() });
    const data = await res.json();
    if(!data || !data.status.includes('Tersedia')) return alert("Buku tidak tersedia!");
    
    selectedBuku = data;
    document.getElementById('form-pinjam-final').classList.remove('hidden');
    document.getElementById('p-detail-buku').innerHTML = `<b>${data.judul}</b><br><span class="text-[10px]">${data.kode_buku}</span>`;
    const d = new Date(); d.setDate(d.getDate() + 7);
    document.getElementById('p-batas').value = d.toISOString().split('T')[0];
}

async function submitPinjaman() {
    const body = {
        kode_peminjaman: 'PJ-' + Date.now(),
        nomor_anggota: selectedAnggota.nomor_anggota,
        kode_buku: selectedBuku.kode_buku,
        judul: selectedBuku.judul,
        pengarang: selectedBuku.pengarang,
        batas_kembali: document.getElementById('p-batas').value
    };
    const res = await fetch(`${API_URL}/sirkulasi`, { method:'POST', headers:getHeaders(), body:JSON.stringify(body) });
    if(res.ok) { alert("Berhasil!"); handleScanAnggota(selectedAnggota.nomor_anggota); document.getElementById('form-pinjam-final').classList.add('hidden'); }
    else { const e = await res.json(); alert(e.error); }
}

async function kembalikanBuku(no, kdBuku, slot) {
    if(!confirm("Kembalikan buku?")) return;
    const res = await fetch(`${API_URL}/kembali/0`, { method:'POST', headers:getHeaders(), body:JSON.stringify({ nomor_anggota:no, kode_buku:kdBuku, slot:slot }) });
    const data = await res.json();
    alert("Denda: Rp" + data.denda);
    handleScanAnggota(no);
}

// --- MASTER LOAD ---
async function loadBuku() {
    const res = await fetch(`${API_URL}/buku`, { headers: getHeaders() });
    const data = await res.json();
    document.getElementById('list-buku').innerHTML = data.map(b => `<tr><td class="p-2 border font-mono">${b.kode_buku}</td><td class="p-2 border">${b.judul}</td><td class="p-2 border">${b.status}</td></tr>`).join('');
}

async function loadAnggota() {
    const res = await fetch(`${API_URL}/anggota`, { headers: getHeaders() });
    const data = await res.json();
    document.getElementById('list-anggota-wrapper').innerHTML = `<table class="w-full border text-xs"><thead><tr class="bg-gray-100"><th class="p-2 border">NIS</th><th class="p-2 border">Nama</th><th class="p-2 border">Pinjaman</th></tr></thead><tbody>${data.map(a => `<tr><td class="p-2 border">${a.nomor_anggota}</td><td class="p-2 border">${a.nama_lengkap}</td><td class="p-2 border text-center font-bold">${[a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x=>x).length}</td></tr>`).join('')}</tbody></table>`;
}

document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const b = { klasifikasi:document.getElementById('b_klasifikasi').value, kategori:document.getElementById('b_kategori').value, pengarang:document.getElementById('b_pengarang').value, judul:document.getElementById('b_judul').value, stok:document.getElementById('b_stok').value, isbn:document.getElementById('b_isbn').value };
    await fetch(`${API_URL}/buku`, { method:'POST', headers:getHeaders(), body:JSON.stringify(b) });
    alert("Tersimpan!"); loadBuku(); e.target.reset(); updateKategori();
};

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const a = { nomor_anggota:document.getElementById('a_nomor').value, nama_lengkap:document.getElementById('a_nama').value, kelas:document.getElementById('a_kelas').value };
    await fetch(`${API_URL}/anggota`, { method:'POST', headers:getHeaders(), body:JSON.stringify(a) });
    alert("Tersimpan!"); loadAnggota(); e.target.reset();
};

function updateKategori() {
    const dd = { "000": "Umum", "800": "Fiksi" };
    document.getElementById('b_kategori').value = dd[document.getElementById('b_klasifikasi').value] || "Lainnya";
}

window.onload = () => { if(localStorage.getItem('perpus_auth')) showDashboard(); };
