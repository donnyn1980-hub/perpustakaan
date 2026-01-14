// ... kode API_URL dan event listener tetap sama ...

async function loadBuku() {
    try {
        const res = await fetch(API_URL + '/api/buku');
        const books = await res.json();
        let html = '<table><thead><tr><th>Kode Panggil (Label)</th><th>Klasifikasi & Kategori</th><th>Judul</th><th>Penerbit</th><th>Aksi</th></tr></thead><tbody>';
        books.forEach(b => {
            // Mengambil angka klasifikasi saja untuk tampilan Kode Panggil (Contoh: "297.1")
            const klasifikasiAngka = b.klasifikasi.split(' ')[0]; 
            const kodeLengkap = `${b.kode_panggil}.${klasifikasiAngka}.${b.kode_pengarang}.${b.kode_judul}.${b.kode_koleksi}`;
            
            html += `<tr>
                <td><strong>${kodeLengkap}</strong></td>
                <td><strong>${b.klasifikasi}</strong><br><small>Kategori: ${b.kategori}</small></td>
                <td>${b.judul}<br><small>Pengarang: ${b.pengarang}</small></td>
                <td>${b.penerbit || '-'}<br>${b.tahun_terbit || '-'}</td>
                <td><button onclick="hapusBuku(${b.id})" style="background:red; color:white; border:none; padding:5px; cursor:pointer; border-radius:4px;">Hapus</button></td>
            </tr>`;
        });
        document.getElementById('listBuku').innerHTML = html + '</tbody></table>';
    } catch (e) { document.getElementById('listBuku').innerHTML = 'Gagal memuat data.'; }
}
