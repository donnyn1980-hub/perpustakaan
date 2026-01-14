const API_URL = 'https://perpustakaan.donnyn1980.workers.dev/api';
let html5QrCode;
let selectedAnggota = null;
let selectedBuku = null;

// --- 1. GUARD SYSTEM (KEAMANAN) ---
// Fungsi ini memastikan dashboard tidak bisa diakses tanpa token valid
function checkAccess() {
    const auth = localStorage.getItem('perpus_auth');
    const loginPage = document.getElementById('login-page');
    const dashboardPage = document.getElementById('dashboard-page');

    if (!auth) {
        loginPage.classList.add('active');
        dashboardPage.classList.remove('active');
        return false;
    } else {
        loginPage.classList.remove('active');
        dashboardPage.classList.add('active');
        return true;
    }
}

// --- 2. FUNGSI LOGIN & LOGOUT ---
async function prosesLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorMsg = document.getElementById('login-error');

    if (!user || !pass) {
        errorMsg.innerText = "Isi semua kolom!";
        errorMsg.classList.remove('hidden');
        return;
    }

    const authString = btoa(`${user}:${pass}`);
    
    // Validasi langsung ke API sebelum mengizinkan masuk
    try {
        const res = await fetch(`${API_URL}/buku`, {
            headers: { 'Authorization': 'Basic ' + authString }
        });

        if (res.ok) {
            localStorage.setItem('perpus_auth', authString);
            errorMsg.classList.add('hidden');
            if(checkAccess()) openTab('sirkulasi');
        } else {
            throw new Error();
        }
    } catch (e) {
        errorMsg.innerText = "Username/Password Salah!";
        errorMsg.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('perpus_auth');
    location.reload();
}

// --- 3. LOGIKA OPERASIONAL (TIDAK ADA YANG DIKURANGI) ---
function getHeaders() {
    return { 
        'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'),
        'Content-Type': 'application/json'
    };
}

function openTab(name) {
    if (!checkAccess()) return; // Kunci akses tab jika belum login

    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.className = "tab-btn px-6 py-2 rounded-md font-medium transition");
    
    document.getElementById(name).classList.add('active');
    document.getElementById('btn-'+name).classList.add('bg-blue-600', 'text-white');

    if(name==='buku') loadBuku();
    if(name==='anggota') loadAnggota();
}

// --- LOGIKA SCANNER ---
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
    }).catch(err => console.error("Kamera Error"));
}

// --- LOGIKA SIRKULASI (SLOT 1-3 & DENDA) ---
async function handleScanAnggota(no) {
    if(!no) return;
    const res = await fetch(`${API_URL}/anggota/cek?q=${no}`, { headers: getHeaders() });
    const data = await res.json();
    if(!data) return alert("Anggota tidak ditemukan!");
    
    selectedAnggota = data;
    document.getElementById('p-detail-anggota').innerHTML = `
        <div class="font-bold text-blue-800">${data.nama_lengkap}</div>
        <div class="text-[10px] uppercase">${data.nomor_anggota} | Kelas ${data.kelas}</div>
    `;
    
    const slots = ['pinjaman1', 'pinjaman2', 'pinjaman3'];
    let html = "";
    slots.forEach((s, i) => {
        if(data[s]) {
            const b = JSON.parse(data[s]);
            html += `
                <div class="p-3 border-l-4 border-red-500 bg-red-50 rounded flex justify-between items-center shadow-sm">
                    <div class="text-[10px]"><b>${b.judul}</b><br>Batas Kembali: <span class="text-red-600 font-bold">${b.batas_kembali}</span></div>
                    <button onclick="kembalikanBuku('${data.nomor_anggota}', '${b.kode_buku}', '${s}')" class="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold">KEMBALI</button>
                </div>`;
        } else {
            html += `<div class="p-3 border border-dashed rounded bg-gray-50 text-[10px] text-gray-400 italic text-center">Slot ${i+1} Kosong</div>`;
        }
    });
    document.getElementById('p-list-pinjaman').innerHTML = html;
}

async function handleScanBuku(kode) {
    if(!selectedAnggota) return alert("Identifikasi Anggota Terlebih Dahulu!");
    const res = await fetch(`${API_URL}/buku/cek?q=${kode}`, { headers: getHeaders() });
    const data = await res.json();
    
    if(!data) return alert("Buku tidak ditemukan!");
    if(!data.status.includes('Tersedia (SR)')) return alert("Maaf, buku berstatus: " + data.status + ". Hanya status SR yang bisa dipinjam.");
    
    selectedBuku = data;
    document.getElementById('form-pinjam-final').classList.remove('hidden');
    document.getElementById('p-detail-buku').innerHTML = `<b>${data.judul}</b><br><span class="text-[10px] font-mono">${data.kode_buku}</span>`;
    
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

    const res = await fetch(`${API_URL}/sirkulasi`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(body) });
    if(res.ok) {
        alert("Peminjaman Berhasil!");
        handleScanAnggota(selectedAnggota.nomor_anggota);
        document.getElementById('form-pinjam-final').classList.add('hidden');
        document.getElementById('m_kode_buku').value = "";
    } else {
        const err = await res.json(); alert(err.error);
    }
}

async function kembalikanBuku(no, kdBuku, slot) {
    if(!confirm("Proses Pengembalian Buku?")) return;
    const res = await fetch(`${API_URL}/kembali/0`, { 
        method: 'POST', 
        headers: getHeaders(), 
        body: JSON.stringify({ nomor_anggota: no, kode_buku: kdBuku, slot: slot }) 
    });
    const data = await res.json();
    alert("Buku Berhasil Dikembalikan.\nTotal Denda: Rp" + data.denda);
    handleScanAnggota(no);
}

// --- MASTER DATA ---
async function loadBuku() {
    const res = await fetch(`${API_URL}/buku`, { headers: getHeaders() });
    const data = await res.json();
    document.getElementById('list-buku').innerHTML = data.map(b => `
        <tr class="hover:bg-gray-50 border-b">
            <td class="p-2 font-mono text-[10px]">${b.kode_buku}</td>
            <td class="p-2 font-bold">${b.judul}</td>
            <td class="p-2"><span class="px-2 py-0.5 rounded-full text-[9px] ${b.status.includes('Tersedia')?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">${b.status}</span></td>
        </tr>
    `).join('');
}

async function loadAnggota() {
    const res = await fetch(`${API_URL}/anggota`, { headers: getHeaders() });
    const data = await res.json();
    document.getElementById('list-anggota-wrapper').innerHTML = `
        <table class="w-full border text-xs text-left">
            <thead class="bg-gray-100 uppercase text-[10px]"><tr><th class="p-2 border">NIS</th><th class="p-2 border">Nama</th><th class="p-2 border text-center">Pinjaman Aktif</th></tr></thead>
            <tbody>${data.map(a => `
                <tr class="border-b">
                    <td class="p-2 border">${a.nomor_anggota}</td>
                    <td class="p-2 border font-bold">${a.nama_lengkap}</td>
                    <td class="p-2 border text-center">${[a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x=>x).length} / 3</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

// Jalankan pengecekan pertama kali
window.addEventListener('DOMContentLoaded', checkAccess);
