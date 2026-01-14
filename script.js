const API_URL = window.location.origin + '/api';

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
        const res = await fetch(API_URL + '/buku', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('Buku Berhasil Disimpan');
            document.getElementById('formBuku').reset();
            loadBuku();
        }
    } catch (err) {
        alert('Error: ' + err.message);
    }
});

async function loadBuku() {
    const res = await fetch(API_URL + '/buku');
    const books = await res.json();
    let html = '<table><thead><tr><th>Kode</th><th>Judul</th><th>Aksi</th></tr></thead><tbody>';
    books.forEach(b => {
        const kodeLengkap = b.kode_panggil + '.' + b.klasifikasi + '.' + b.kode_pengarang + '.' + b.kode_judul + '.' + b.kode_koleksi;
        html += '<tr>' +
            '<td><strong>' + kodeLengkap + '</strong></td>' +
            '<td>' + b.judul + '</td>' +
            '<td><button onclick="hapusBuku(' + b.id + ')" class="btn btn-delete">Hapus</button></td>' +
        '</tr>';
    });
    document.getElementById('listBuku').innerHTML = html + '</tbody></table>';
}

async function hapusBuku(id) {
    if (!confirm('Hapus data?')) return;
    const res = await fetch(API_URL + '/buku/' + id, { method: 'DELETE' });
    if (res.ok) {
        // Cek JSON dengan aman
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            await res.json();
        }
        loadBuku();
    }
}
