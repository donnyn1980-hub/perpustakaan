const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api";

document.addEventListener('DOMContentLoaded', loadBuku);

document.getElementById('formBuku').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true;

    const data = {
        kode_panggil: document.getElementById('kode_panggil').value,
        klasifikasi: document.getElementById('klasifikasi').value,
        klasifikasi_manual: document.getElementById('klasifikasi_manual').value,
        kategori_manual: document.getElementById('kategori_manual').value,
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('✅ Berhasil disimpan!');
            document.getElementById('formBuku').reset();
            document.getElementById('manualPanel').style.display = 'none';
            loadBuku();
        }
    } catch (e) { alert('❌ Error koneksi'); }
    finally { submitBtn.disabled = false; }
});

async function loadBuku() {
    try {
        const res = await fetch(API_URL + '/buku');
        const books = await res.json();
        let html = '<table><thead><tr><th>Kode Panggil</th><th>Kategori</th><th>Judul</th><th>Penerbit</th><th>Aksi</th></tr></thead><tbody>';
        books.forEach(b => {
            const kode = b.kode_panggil + '.' + b.klasifikasi + '.' + b.kode_pengarang + '.' + b.kode_judul + '.' + b.kode_koleksi;
            html += `<tr>
                <td><strong>${kode}</strong></td>
                <td><small>${b.klasifikasi}</small><br>${b.kategori}</td>
                <td>${b.judul}<br><small>Oleh: ${b.pengarang}</small></td>
                <td>${b.penerbit || '-'}<br>${b.tahun_terbit || '-'}</td>
                <td><button onclick="hapusBuku(${b.id})" style="background:#e74c3c; color:white; border:none; padding:5px; cursor:pointer; border-radius:4px;">Hapus</button></td>
            </tr>`;
        });
        document.getElementById('listBuku').innerHTML = html + '</tbody></table>';
    } catch (e) { document.getElementById('listBuku').innerHTML = 'Gagal memuat.'; }
}

async function hapusBuku(id) {
    if (confirm('Hapus koleksi ini?')) {
        await fetch(API_URL + '/buku/' + id, { method: 'DELETE' });
        loadBuku();
    }
}
