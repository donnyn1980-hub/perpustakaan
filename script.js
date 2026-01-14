// URL Worker Anda sesuai informasi sebelumnya
const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api";

document.addEventListener('DOMContentLoaded', () => {
    console.log("Aplikasi Siap");
    loadBuku();
});

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log("Mengirim data...");
    
    const data = {
        kode_panggil: document.getElementById('kode_panggil').value,
        klasifikasi: document.getElementById('klasifikasi').value,
        pengarang: document.getElementById('pengarang').value,
        judul: document.getElementById('judul').value,
        isbn: document.getElementById('isbn').value || "",
        stok: 1
    };

    try {
        const res = await fetch(API_URL + '/buku', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();

        if (res.ok) {
            alert('✅ Berhasil: Buku "' + data.judul + '" telah disimpan!');
            document.getElementById('formBuku').reset();
            loadBuku();
        } else {
            alert('❌ Gagal: ' + (result.error || 'Terjadi kesalahan pada server'));
        }
    } catch (err) {
        console.error(err);
        alert('❌ Koneksi Gagal: Tidak dapat terhubung ke Worker. Pastikan URL benar.');
    }
});

async function loadBuku() {
    const listDiv = document.getElementById('listBuku');
    try {
        const res = await fetch(API_URL + '/buku');
        if (!res.ok) throw new Error('Gagal memuat data');
        
        const books = await res.json();
        if (books.length === 0) {
            listDiv.innerHTML = '<p>Belum ada data buku.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Kode Lengkap</th><th>Judul</th><th>Pengarang</th><th>Aksi</th></tr></thead><tbody>';
        books.forEach(b => {
            const kodeLengkap = b.kode_panggil + '.' + b.klasifikasi + '.' + b.kode_pengarang + '.' + b.kode_judul + '.' + (b.kode_koleksi || 'C.1');
            html += '<tr>' +
                '<td><strong>' + kodeLengkap + '</strong></td>' +
                '<td>' + b.judul + '</td>' +
                '<td>' + b.pengarang + '</td>' +
                '<td><button onclick="hapusBuku(' + b.id + ')" class="btn btn-delete">Hapus</button></td>' +
            '</tr>';
        });
        listDiv.innerHTML = html + '</tbody></table>';
    } catch (err) {
        listDiv.innerHTML = '<p style="color:red;">Gagal memuat daftar buku.</p>';
    }
}

async function hapusBuku(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus buku ini?')) return;
    try {
        const res = await fetch(API_URL + '/buku/' + id, { method: 'DELETE' });
        if (res.ok) {
            alert('✅ Buku berhasil dihapus');
            loadBuku();
        } else {
            alert('❌ Gagal menghapus buku');
        }
    } catch (err) {
        alert('❌ Error: ' + err.message);
    }
}
