const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api";

document.addEventListener('DOMContentLoaded', loadBuku);

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Menyimpan...';

    const data = {
        kode_panggil: document.getElementById('kode_panggil').value,
        klasifikasi: document.getElementById('klasifikasi').value,
        pengarang: document.getElementById('pengarang').value,
        judul: document.getElementById('judul').value,
        isbn: document.getElementById('isbn').value,
        penerbit: document.getElementById('penerbit').value,
        tahun_terbit: document.getElementById('tahun_terbit').value,
        stok: document.getElementById('stok').value // Jumlah baris yang akan dibuat
    };

    try {
        const res = await fetch(API_URL + '/buku', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('✅ Berhasil menyimpan ' + data.stok + ' data buku!');
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

async function loadBuku() {
    try {
        const res = await fetch(API_URL + '/buku');
        const books = await res.json();
        let html = '<table><thead><tr><th>Kode</th><th>Kategori</th><th>Judul</th><th>Penerbit</th><th>Aksi</th></tr></thead><tbody>';
        books.forEach(b => {
            const kode = b.kode_panggil + '.' + b.klasifikasi + '.' + b.kode_pengarang + '.' + b.kode_judul + '.' + b.kode_koleksi;
            html += '<tr>' +
                '<td><strong>' + kode + '</strong></td>' +
                '<td>' + b.kategori + '</td>' +
                '<td>' + b.judul + '</td>' +
                '<td>' + (b.penerbit || '-') + ' (' + (b.tahun_terbit || '-') + ')</td>' +
                '<td><button onclick="hapusBuku(' + b.id + ')" style="background:red; color:white; border:none; padding:5px; cursor:pointer; border-radius:3px;">Hapus</button></td>' +
            '</tr>';
        });
        document.getElementById('listBuku').innerHTML = html + '</tbody></table>';
    } catch (e) {
        document.getElementById('listBuku').innerHTML = 'Gagal memuat data.';
    }
}

async function hapusBuku(id) {
    if (!confirm('Hapus data koleksi ini?')) return;
    const res = await fetch(API_URL + '/buku/' + id, { method: 'DELETE' });
    if (res.ok) loadBuku();
}
