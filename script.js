const API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadBuku();
    document.getElementById('pengarang').addEventListener('input', generateKodePengarang);
    document.getElementById('judul').addEventListener('input', generateKodeJudul);
    document.getElementById('searchInput').addEventListener('input', filterBuku);
});

function generateKodePengarang() {
    const pengarang = document.getElementById('pengarang').value;
    if (pengarang.trim().length >= 3) {
        const kode = pengarang.substring(0, 3).toUpperCase();
        document.getElementById('kodePengarangDisplay').textContent = kode;
        return kode;
    }
    document.getElementById('kodePengarangDisplay').textContent = '-';
    return '';
}

function generateKodeJudul() {
    const judul = document.getElementById('judul').value;
    if (judul.trim().length > 0) {
        const firstLetter = judul.trim().charAt(0).toLowerCase();
        document.getElementById('kodeJudulDisplay').textContent = firstLetter;
        return firstLetter;
    }
    document.getElementById('kodeJudulDisplay').textContent = '-';
    return '';
}

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const loadingText = document.getElementById('loadingText');
    
    submitText.style.display = 'none';
    loadingText.style.display = 'inline';
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
        
        if (!buku.kode_pengarang || buku.kode_pengarang === '-') throw new Error('Kode pengarang tidak valid');
        if (!buku.kode_judul || buku.kode_judul === '-') throw new Error('Kode judul tidak valid');
        
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
            const result = await response.json();
            throw new Error(result.error || 'Gagal menambahkan buku');
        }
    } catch (error) {
        showMessage('error', `❌ Error: ${error.message}`);
    } finally {
        submitText.style.display = 'inline';
        loadingText.style.display = 'none';
        submitBtn.disabled = false;
    }
});

async function loadBuku() {
    const container = document.getElementById('booksContainer');
    container.innerHTML = '<div class="loading">Memuat data buku...</div>';
    try {
        const response = await fetch(`${API_URL}/buku`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const books = await response.json();
        displayBooks(books);
    } catch (error) {
        container.innerHTML = `<div class="error">❌ Gagal memuat data: ${error.message}<br><small>Pastikan database sudah diinisialisasi dengan schema yang benar.</small></div>`;
    }
}

function displayBooks(books) {
    const container = document.getElementById('booksContainer');
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="loading">Belum ada data buku.</div>';
        return;
    }
    let html = `<table class="books-table"><thead><tr><th>Kode Lengkap</th><th>Judul</th><th>Pengarang</th><th>Klasifikasi</th><th>Stok</th><th>Aksi</th></tr></thead><tbody>`;
    books.forEach(book => {
        const kodeLengkap = `${book.kode_panggil}.${book.klasifikasi}.${book.kode_pengarang}.${book.kode_judul}.${book.kode_koleksi || 'C.1'}`;
        html += `<tr>
            <td><strong>${kodeLengkap}</strong></td>
            <td>${book.judul}</td>
            <td>${book.pengarang}</td>
            <td>${getKlasifikasiName(book.klasifikasi)}</td>
            <td><span class="status-badge ${book.stok > 0 ? 'status-available' : 'status-unavailable'}">${book.stok} ${book.stok > 0 ? 'tersedia' : 'habis'}</span></td>
            <td><button onclick="hapusBuku(${book.id})" style="padding: 5px 10px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Hapus</button></td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

async function hapusBuku(id) {
    if (!confirm('Hapus buku ini?')) return;
    try {
        const response = await fetch(`${API_URL}/buku/${id}`, { method: 'DELETE' });
        if (response.ok) {
            showMessage('success', '✅ Buku berhasil dihapus!');
            loadBuku();
        } else {
            const result = await response.json();
            throw new Error(result.error || 'Gagal menghapus buku');
        }
    } catch (error) { showMessage('error', `❌ Error: ${error.message}`); }
}

function filterBuku() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    document.querySelectorAll('.books-table tbody tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(searchTerm) ? '' : 'none';
    });
}

function getKlasifikasiName(code) {
    const klasifikasiMap = {
        '000': '000 (Komputer)', '100': '100 (Filsafat)', '200': '200 (Agama)', '300': '300 (Sosial)',
        '400': '400 (Bahasa)', '500': '500 (Sains)', '600': '600 (Teknologi)', '700': '700 (Seni)',
        '800': '800 (Sastra)', '900': '900 (Sejarah)'
    };
    return klasifikasiMap[code] || code;
}

function resetForm() {
    document.getElementById('formBuku').reset();
    document.getElementById('kodePengarangDisplay').textContent = '-';
    document.getElementById('kodeJudulDisplay').textContent = '-';
    document.getElementById('kodeKoleksiDisplay').textContent = 'C.1';
}

function showMessage(type, message) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = type;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}
