const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api";

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('auth_key')) {
        showMain();
        loadBuku();
    }
});

// Fungsi untuk mengisi input manual saat dropdown dipilih
function updateManualInput() {
    const menu = document.getElementById('menu_klasifikasi').value;
    if (menu) {
        const parts = menu.split(' – ');
        document.getElementById('klasifikasi').value = parts[0].trim();
        document.getElementById('kategori').value = parts[1].trim();
    }
}

function handleLogin() {
    const user = document.getElementById('user_login').value;
    const pass = document.getElementById('pass_login').value;
    const key = btoa(user + ':' + pass);
    localStorage.setItem('auth_key', key);
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

async function loadBuku(isLoginAttempt = false) {
    const authKey = localStorage.getItem('auth_key');
    try {
        const res = await fetch(API_URL + '/buku', {
            headers: { 'Authorization': 'Basic ' + authKey }
        });
        
        if (res.status === 401) {
            alert('Username atau Password Salah!');
            localStorage.removeItem('auth_key');
            return;
        }

        if (isLoginAttempt) showMain();

        const books = await res.json();
        let html = '<table><thead><tr><th>Kode</th><th>Kategori</th><th>Judul</th><th>Penerbit</th><th>Aksi</th></tr></thead><tbody>';
        books.forEach(b => {
            const kode = b.kode_panggil + '.' + b.klasifikasi + '.' + b.kode_pengarang + '.' + b.kode_judul + '.' + b.kode_koleksi;
            html += `<tr>
                <td><strong>${kode}</strong></td>
                <td>${b.kategori}</td>
                <td>${b.judul}</td>
                <td>${b.penerbit || '-'} (${b.tahun_terbit || '-'})</td>
                <td><button onclick="hapusBuku(${b.id})" style="background:red; color:white; border:none; padding:5px; cursor:pointer; border-radius:3px;">Hapus</button></td>
            </tr>`;
        });
        document.getElementById('listBuku').innerHTML = html + '</tbody></table>';
    } catch (e) {
        document.getElementById('listBuku').innerHTML = 'Gagal memuat data.';
    }
}

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

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

    try {
        const res = await fetch(API_URL + '/buku', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + localStorage.getItem('auth_key')
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('✅ Berhasil menyimpan!');
            document.getElementById('formBuku').reset();
            document.getElementById('stok').value = 1;
            loadBuku();
        } else {
            const err = await res.json();
            alert('❌ Gagal: ' + err.error);
        }
    } catch (e) {
        alert('❌ Koneksi Gagal');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '💾 Simpan Buku';
    }
});

async function hapusBuku(id) {
    if (!confirm('Hapus data koleksi ini?')) return;
    const res = await fetch(API_URL + '/buku/' + id, { 
        method: 'DELETE',
        headers: { 'Authorization': 'Basic ' + localStorage.getItem('auth_key') }
    });
    if (res.ok) loadBuku();
}
