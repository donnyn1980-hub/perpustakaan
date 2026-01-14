const API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadBuku();
    document.getElementById('pengarang').addEventListener('input', generateKodePengarang);
    document.getElementById('judul').addEventListener('input', generateKodeJudul);
    document.getElementById('searchInput').addEventListener('input', filterBuku);
});

function generateKodePengarang() {
    const pengarang = document.getElementById('pengarang').value;
    const kode = pengarang.trim().length >= 3 ? pengarang.substring(0, 3).toUpperCase() : '-';
    document.getElementById('kodePengarangDisplay').textContent = kode;
    return kode;
}

function generateKodeJudul() {
    const judul = document.getElementById('judul').value;
    const kode = judul.trim().length > 0 ? judul.trim().charAt(0).toLowerCase() : '-';
    document.getElementById('kodeJudulDisplay').textContent = kode;
    return kode;
}

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    
    try {
        const buku = {
            kode_panggil: document.getElementById('kode_panggil').value,
            klasifikasi: document.getElementById('klasifikasi').value,
            pengarang: document.getElementById('pengarang').value,
            kode_pengarang: generateKodePengarang(),
            judul: document.getElementById('judul').value,
            kode_judul: generateKodeJudul(),
            isbn: document.getElementById('isbn').value || null,
            penerbit: document.getElementById('penerbit').value || null,
            tahun_terbit: document.getElementById('tahun_terbit').value || null,
            stok: parseInt(document.getElementById('stok').value) || 1
        };

        if (buku.kode_pengarang === '-' || buku.kode_judul === '-') throw new Error('Lengkapi data untuk generate kode');

        const response = await fetch(`${API_URL}/buku`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buku)
        });

        if (response.ok) {
            showMessage('success', '✅ Buku berhasil ditambahkan!');
            loadBuku();
            resetForm();
        } else {
            const res = await response.json();
            throw new Error(res.error || 'Gagal simpan');
        }
    } catch (error) {
        showMessage('error', `❌ ${error.message}`);
    } finally {
        submitBtn.disabled = false;
    }
});

async function loadBuku() {
    const container = document.getElementById('booksContainer');
    container.innerHTML = '<div class="loading">Memuat data...</div>';
    try {
        const response = await fetch(`${API_URL}/buku`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        container.innerHTML = `<div class="error">❌ Gagal: ${error.message}</div>`;
    }
}

function displayBooks(books) {
    const container = document.getElementById('booksContainer');
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="loading">Belum ada data.</div>';
        return;
    }
    let html = `<table class="books-table"><thead><tr><th>Kode</th><th>Judul</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>`;
    books.forEach(book => {
        const kodeFull = `${book.kode_panggil}.${book.klasifikasi}.${book.kode_pengarang}.${book.kode_judul}.${book.kode_koleksi || 'C.1'}`;
        html += `<tr>
            <td><strong>${kodeFull}</strong></td>
            <td>${book.judul}</td>
            <td><span class="status-badge ${book.stok > 0 ? 'status-available' : 'status-unavailable'}">${book.stok}</span></td>
            <td><button onclick="hapusBuku(${book.id})" style="background:#dc3545; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Hapus</button></td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function hapusBuku(id) {
    if (!confirm('Hapus buku ini?')) return;
    try {
        const response = await fetch(`${API_URL}/buku/${id}`, { method: 'DELETE' });
        if (response.ok) { loadBuku(); showMessage('success', 'Terhapus'); }
    } catch (e) { showMessage('error', e.message); }
}

function filterBuku() {
    const q = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.books-table tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
}

function resetForm() {
    document.getElementById('formBuku').reset();
    document.getElementById('kodePengarangDisplay').textContent = '-';
    document.getElementById('kodeJudulDisplay').textContent = '-';
}

function showMessage(type, msg) {
    const div = document.getElementById('message');
    div.className = type; div.textContent = msg; div.style.display = 'block';
    setTimeout(() => div.style.display = 'none', 3000);
}
