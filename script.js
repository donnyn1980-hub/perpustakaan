const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api";

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('auth_key')) {
        showMain();
        loadBuku();
        generateKodePinjam();
    }
});

function updateManualInput() {
    const menu = document.getElementById('menu_klasifikasi').value;
    if (menu) {
        const parts = menu.split(' – ');
        document.getElementById('klasifikasi').value = parts[0].trim();
        document.getElementById('kategori').value = parts[1].trim();
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-link').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('tab-buku').classList.add('hidden');
    document.getElementById('tab-peminjaman').classList.add('hidden');
    document.getElementById('tab-sirkulasi').classList.add('hidden');
    
    document.getElementById('tab-' + tab).classList.remove('hidden');
    if(tab === 'buku') loadBuku();
    if(tab === 'sirkulasi') loadSirkulasi();
    if(tab === 'peminjaman') generateKodePinjam();
}

function handleLogin() {
    const user = document.getElementById('user_login').value;
    const pass = document.getElementById('pass_login').value;
    localStorage.setItem('auth_key', btoa(user + ':' + pass));
    loadBuku(true);
}

function handleLogout() {
    localStorage.removeItem('auth_key');
    location.reload();
}

function showMain() {
    document.getElementById('login-container').classList.add('hidden');
    document.getElementById('main-content').classList.remove('hidden');
}

function generateKodePinjam() {
    document.getElementById('kode_peminjaman').value = "PJ" + Date.now();
}

// HANDLER API BUKU
async function loadBuku(isLoginAttempt = false) {
    const res = await fetch(API_URL + '/buku', { headers: { 'Authorization': 'Basic ' + localStorage.getItem('auth_key') } });
    if (res.status === 401) { alert('Login Gagal'); localStorage.removeItem('auth_key'); return; }
    if (isLoginAttempt) showMain();
    const books = await res.json();
    let html = '<table><thead><tr><th>Kode</th><th>Judul</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>';
    books.forEach(b => {
        html += `<tr><td>${b.kode_panggil}.${b.klasifikasi}.${b.kode_pengarang}.${b.kode_judul}.${b.kode_koleksi}</td>
        <td>${b.judul}</td><td>${b.stok}</td>
        <td><button onclick="hapusBuku(${b.id})" style="background:red;color:white;border:none;cursor:pointer">Hapus</button></td></tr>`;
    });
    document.getElementById('listBuku').innerHTML = html + '</tbody></table>';
}

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        kode_panggil: document.getElementById('kode_panggil').value,
        klasifikasi: document.getElementById('klasifikasi').value,
        kategori: document.getElementById('kategori').value,
        pengarang: document.getElementById('pengarang').value,
        judul: document.getElementById('judul').value,
        isbn: document.getElementById('isbn').value,
        penerbit: document.getElementById('penerbit').value,
        tahun_terbit: document.getElementById('tahun_terbit').value,
        stok: document.getElementById('stok').value
    };
    const res = await fetch(API_URL + '/buku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + localStorage.getItem('auth_key') },
        body: JSON.stringify(data)
    });
    if (res.ok) { alert('Buku Tersimpan'); loadBuku(); }
});

async function hapusBuku(id) {
    if (confirm('Hapus?')) {
        await fetch(API_URL + '/buku/' + id, { method: 'DELETE', headers: { 'Authorization': 'Basic ' + localStorage.getItem('auth_key') } });
        loadBuku();
    }
}

// HANDLER SIRKULASI
async function loadSirkulasi() {
    const res = await fetch(API_URL + '/sirkulasi', { headers: { 'Authorization': 'Basic ' + localStorage.getItem('auth_key') } });
    const data = await res.json();
    let html = '<table><thead><tr><th>Kode</th><th>Anggota</th><th>Buku</th><th>Status</th><th>Aksi</th></tr></thead><tbody>';
    data.forEach(p => {
        html += `<tr><td>${p.kode_peminjaman}</td><td>ID: ${p.anggota_id}</td><td>ID: ${p.buku_id}</td>
        <td><span class="badge ${p.status}">${p.status}</span></td>
        <td>${p.status === 'DIPINJAM' ? `<button onclick="kembalikanBuku(${p.id})">Kembalikan</button>` : '-'}</td></tr>`;
    });
    document.getElementById('listSirkulasi').innerHTML = html + '</tbody></table>';
}

document.getElementById('formPinjam').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        kode_peminjaman: document.getElementById('kode_peminjaman').value,
        anggota_id: document.getElementById('anggota_id').value,
        buku_id: document.getElementById('buku_id').value,
        batas_kembali: document.getElementById('batas_kembali').value
    };
    const res = await fetch(API_URL + '/sirkulasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + localStorage.getItem('auth_key') },
        body: JSON.stringify(data)
    });
    if (res.ok) { alert('Peminjaman Berhasil'); switchTab('sirkulasi'); }
});

async function kembalikanBuku(id) {
    const res = await fetch(API_URL + '/kembali/' + id, { method: 'POST', headers: { 'Authorization': 'Basic ' + localStorage.getItem('auth_key') } });
    if (res.ok) loadSirkulasi();
}
