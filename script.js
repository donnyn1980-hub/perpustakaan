const API_URL = window.location.origin + '/api';

document.addEventListener('DOMContentLoaded', () => {
    loadBuku();
    document.getElementById('pengarang').addEventListener('input', generateKodePengarang);
    document.getElementById('judul').addEventListener('input', generateKodeJudul);
    document.getElementById('searchInput').addEventListener('input', filterBuku);
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
        container.innerHTML = `<div class="error">❌ Gagal memuat data: ${error.message}</div>`;
    }
}

async function hapusBuku(id) {
    if (!confirm('Hapus buku ini?')) return;
    try {
        const response = await fetch(`${API_URL}/buku/${id}`, { method: 'DELETE' });
        
        // Cek jika respon memiliki konten sebelum parse JSON
        let result = {};
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            result = await response.json();
        }

        if (response.ok) {
            showMessage('success', '✅ Buku berhasil dihapus!');
            loadBuku();
        } else {
            throw new Error(result.error || 'Gagal menghapus buku');
        }
    } catch (error) {
        showMessage('error', `❌ Error: ${error.message}`);
    }
}

// Fungsi generateKodePengarang, generateKodeJudul, displayBooks, dll 
// Tetap sama persis dengan kode sebelumnya (tanpa pengurangan teks/fitur)
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

function displayBooks(books) {
    const container = document.getElementById('booksContainer');
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="loading">Belum ada data buku.</div>';
        return;
    }
    let html = `<table class="books-table">
        <thead><tr><th>Kode Lengkap</th><th>Judul</th><th>Pengarang</th><th>Klasifikasi</th><th>Stok</th><th>Aksi</th></tr></thead>
        <tbody>`;
    books.forEach(book => {
        const kodeLengkap = `${book.kode_panggil}.${book.klasifikasi}.${book.kode_pengarang}.${book.kode_judul}.${book.kode_koleksi || 'C.1'}`;
        html += `<tr>
            <td><strong>${kodeFull}</strong></td>
            <td>${book.judul}</td>
            <td>${book.pengarang}</td>
            <td>${getKlasifikasiName(book.klasifikasi)}</td>
            <td><span class="status-badge ${book.stok > 0 ? 'status-available' : 'status-unavailable'}">${book.stok}</span></td>
            <td><button onclick="hapusBuku(${book.id})" class="btn-delete">Hapus</button></td>
        </tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
}

// Fungsi getKlasifikasiName, showMessage, resetForm (Sesuai kode awal Anda)
function getKlasifikasiName(code) {
    const klasifikasiMap = {
        '000': '000 (Komputer)', '100': '100 (Filsafat)', '200': '200 (Agama)', '300': '300 (Sosial)',
        '400': '400 (Bahasa)', '500': '500 (Sains)', '600': '600 (Teknologi)', '700': '700 (Seni)',
        '800': '800 (Sastra)', '900': '900 (Sejarah)'
    };
    return klasifikasiMap[code] || code;
}

function showMessage(type, message) {
    const messageDiv = document.getElementById('message');
    messageDiv.className = type;
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}
