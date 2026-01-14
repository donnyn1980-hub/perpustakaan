const API_URL = 'https://perpustakaan.donnyn1980.workers.dev/api';
let currentAuth = localStorage.getItem('perpus_auth');

// --- SISTEM AUTENTIKASI ---
if (!currentAuth) {
    const user = prompt("Username Admin:");
    const pass = prompt("Password Admin:");
    currentAuth = btoa(user + ':' + pass);
    localStorage.setItem('perpus_auth', currentAuth);
}

function logout() {
    localStorage.removeItem('perpus_auth');
    location.reload();
}

// --- LOGIKA TAB ---
function openTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('bg-blue-600', 'text-white'));
    document.getElementById(tabName).classList.add('active');
    document.getElementById('btn-' + tabName).classList.add('bg-blue-600', 'text-white');
    
    if(tabName === 'buku') loadBuku();
    if(tabName === 'anggota') loadAnggota();
    if(tabName === 'sirkulasi') loadSirkulasi();
}

// --- MANAJEMEN BUKU ---
async function loadBuku() {
    try {
        const res = await fetch(`${API_URL}/buku`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
        const data = await res.json();
        const list = document.getElementById('list-buku');
        list.innerHTML = data.map(b => `
            <tr class="hover:bg-gray-50">
                <td class="p-2 border font-mono font-bold">${b.kode_buku}</td>
                <td class="p-2 border">${b.judul}</td>
                <td class="p-2 border">${b.pengarang}</td>
                <td class="p-2 border">
                    <span class="px-2 py-1 rounded text-xs font-bold ${b.status.includes('Tersedia') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                        ${b.status}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error("Error load buku:", e); }
}

document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        klasifikasi: document.getElementById('b_klasifikasi').value,
        kategori: document.getElementById('b_kategori').value,
        pengarang: document.getElementById('b_pengarang').value,
        judul: document.getElementById('b_judul').value,
        stok: document.getElementById('b_stok').value,
        isbn: document.getElementById('b_isbn').value,
        penerbit: document.getElementById('b_penerbit').value,
        tahun_terbit: document.getElementById('b_tahun').value
    };
    await fetch(`${API_URL}/buku`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth },
        body: JSON.stringify(data)
    });
    alert('Buku Berhasil Disimpan!');
    loadBuku();
    e.target.reset();
    updateKategori();
};

function updateKategori() {
    const dd = { 
        "000": "Karya Umum", "100": "Filsafat", "200": "Agama", 
        "300": "Ilmu Sosial", "400": "Bahasa", "500": "Sains", 
        "600": "Teknologi", "700": "Seni & Olahraga", 
        "800": "Fiksi / Sastra", "900": "Sejarah" 
    };
    document.getElementById('b_kategori').value = dd[document.getElementById('b_klasifikasi').value];
}

// --- MANAJEMEN ANGGOTA ---
async function loadAnggota() {
    try {
        const res = await fetch(`${API_URL}/anggota`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
        const data = await res.json();
        const list = document.getElementById('list-anggota-wrapper');
        list.innerHTML = `
            <table class="w-full text-sm text-left border">
                <thead class="bg-gray-200">
                    <tr><th class="p-2 border">NIS</th><th class="p-2 border">Nama</th><th class="p-2 border">Kelas</th><th class="p-2 border">Status</th></tr>
                </thead>
                <tbody>
                    ${data.map(a => `
                        <tr>
                            <td class="p-2 border">${a.nomor_anggota}</td>
                            <td class="p-2 border">${a.nama_lengkap}</td>
                            <td class="p-2 border">${a.kelas}</td>
                            <td class="p-2 border font-bold ${a.status_anggota === 'AKTIF' ? 'text-green-600' : 'text-red-600'}">${a.status_anggota}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
    } catch (e) { console.error("Error load anggota:", e); }
}

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const data = {
        nomor_anggota: document.getElementById('a_nomor').value,
        nama_lengkap: document.getElementById('a_nama').value,
        kelas: document.getElementById('a_kelas').value
    };
    await fetch(`${API_URL}/anggota`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth },
        body: JSON.stringify(data)
    });
    alert('Anggota Berhasil Ditambah!');
    loadAnggota();
    e.target.reset();
};

// --- VALIDASI & SIRKULASI ---
async function cekAnggota(val) {
    if (val.length < 3) return;
    const info = document.getElementById('val-anggota');
    try {
        const res = await fetch(`${API_URL}/anggota/cek?q=${val}`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
        const user = await res.json();
        info.classList.remove('hidden');

        if (user && user.status_anggota === 'AKTIF') {
            info.className = "mt-2 p-2 rounded text-sm bg-green-100 text-green-800";
            info.innerHTML = `✅ <b>${user.nama_lengkap}</b> (${user.kelas}) - SIAP PINJAM`;
            checkCanPinjam();
        } else {
            info.className = "mt-2 p-2 rounded text-sm bg-red-100 text-red-800";
            info.innerHTML = `❌ <b>${user ? user.nama_lengkap : 'TIDAK DITEMUKAN'}</b> - NON AKTIF / TIDAK ADA`;
            document.getElementById('btn-proses-pinjam').disabled = true;
        }
    } catch (e) { console.error(e); }
}

async function cekBuku(val) {
    if (val.length < 5) return;
    const info = document.getElementById('val-buku');
    try {
        const res = await fetch(`${API_URL}/buku/cek?q=${val}`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
        const buku = await res.json();
        info.classList.remove('hidden');

        if (buku && buku.status === 'Tersedia (SR)') {
            info.className = "mt-2 p-2 rounded text-sm bg-green-100 text-green-800";
            info.innerHTML = `✅ <b>${buku.judul}</b> - ${buku.pengarang}`;
            checkCanPinjam();
        } else {
            info.className = "mt-2 p-2 rounded text-sm bg-red-100 text-red-800";
            info.innerHTML = `❌ ${buku ? 'STATUS: ' + buku.status : 'BUKU TIDAK ADA'}`;
            document.getElementById('btn-proses-pinjam').disabled = true;
        }
    } catch (e) { console.error(e); }
}

function checkCanPinjam() {
    const aOk = document.getElementById('val-anggota').innerText.includes('✅');
    const bOk = document.getElementById('val-buku').innerText.includes('✅');
    const btn = document.getElementById('btn-proses-pinjam');
    if(aOk && bOk) {
        btn.disabled = false;
        btn.className = "w-full bg-orange-600 text-white py-3 rounded font-bold hover:bg-orange-700";
    }
}

async function prosesPinjam() {
    const data = {
        kode_peminjaman: 'PJ-' + Date.now(),
        nomor_anggota: document.getElementById('p_nomor_anggota').value,
        kode_buku: document.getElementById('p_kode_buku').value,
        batas_kembali: document.getElementById('p_batas').value
    };
    await fetch(`${API_URL}/sirkulasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth },
        body: JSON.stringify(data)
    });
    alert('Peminjaman Berhasil!');
    location.reload();
}

async function loadSirkulasi() {
    try {
        const res = await fetch(`${API_URL}/sirkulasi`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
        const data = await res.json();
        const list = document.getElementById('list-sirkulasi');
        list.innerHTML = data.map(s => `
            <div class="bg-gray-50 p-3 rounded border flex justify-between items-center">
                <div>
                    <p class="font-bold text-sm">${s.judul}</p>
                    <p class="text-xs text-gray-500">Peminjam: ${s.nomor_anggota} | Batas: ${s.batas_kembali}</p>
                    ${s.denda > 0 ? `<p class="text-xs text-red-600 font-bold">Denda: Rp${s.denda}</p>` : ''}
                </div>
                ${s.status_pinjam === 'DIPINJAM' ? 
                `<button onclick="kembali(${s.id})" class="bg-blue-500 text-white px-3 py-1 rounded text-xs">Kembalikan</button>` : 
                `<span class="text-green-600 text-xs font-bold uppercase">Selesai</span>`}
            </div>
        `).join('');
    } catch (e) { console.error(e); }
}

async function kembali(id) {
    if(!confirm('Proses Pengembalian Buku?')) return;
    try {
        const res = await fetch(`${API_URL}/kembali/${id}`, { 
            method: 'POST', 
            headers: { 'Authorization': 'Basic ' + currentAuth } 
        });
        const data = await res.json();
        alert('Buku Berhasil Dikembalikan. Denda Keterlambatan: Rp' + data.denda);
        loadSirkulasi();
    } catch (e) { console.error(e); }
}

// Inisialisasi saat halaman dibuka
window.onload = () => {
    openTab('buku');
    updateKategori();
};
