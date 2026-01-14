const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api";

document.addEventListener('DOMContentLoaded', loadBuku);

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        kode_panggil: document.getElementById('kode_panggil').value,
        klasifikasi: document.getElementById('klasifikasi').value,
        pengarang: document.getElementById('pengarang').value,
        judul: document.getElementById('judul').value,
        isbn: document.getElementById('isbn').value,
        stok: 1
    };

    try {
        const response = await fetch(API_URL + '/buku', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('✅ Berhasil menyimpan buku!');
            document.getElementById('formBuku').reset();
            loadBuku();
        } else {
            const errorData = await response.json();
            alert('❌ Gagal: ' + errorData.error);
        }
    } catch (err) {
        alert('❌ Error Koneksi: Pastikan Worker sudah di-deploy.');
    }
});

async function loadBuku() {
    const listDiv = document.getElementById('listBuku');
    try {
        const response = await fetch(API_URL + '/buku');
        const books = await response.json();
        
        if (books.length === 0) {
            listDiv.innerHTML = '<p>Belum ada koleksi buku.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Kode Lengkap</th><th>Judul</th><th>Aksi</th></tr></thead><tbody>';
        books.forEach(b => {
            const kodeLengkap = b.kode_panggil + '.' + b.klasifikasi + '.' + b.kode_pengarang + '.' + b.kode_judul + '.' + b.kode_koleksi;
            html += '<tr>' +
                '<td><strong>' + kodeLengkap + '</strong></td>' +
                '<td>' + b.judul + '<br><small>Oleh: ' + b.pengarang + '</small></td>' +
                '<td><button onclick="hapusBuku(' + b.id + ')" class="btn btn-delete">Hapus</button></td>' +
            '</tr>';
        });
        listDiv.innerHTML = html + '</tbody></table>';
    } catch (err) {
        listDiv.innerHTML = '<p style="color:red">Gagal mengambil data dari server.</p>';
    }
}

async function hapusBuku(id) {
    if (!confirm('Hapus buku ini?')) return;
    try {
        const response = await fetch(API_URL + '/buku/' + id, { method: 'DELETE' });
        if (response.ok) {
            alert('✅ Terhapus');
            loadBuku();
        }
    } catch (err) {
        alert('Gagal menghapus');
    }
}
