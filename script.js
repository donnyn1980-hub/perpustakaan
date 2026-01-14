    const API_URL = "https://perpustakaan.donnyn1980.workers.dev/api/buku";

    function checkManual() {
        const select = document.getElementById('klasifikasi');
        document.getElementById('manualPanel').style.display = (select.value === 'manual') ? 'block' : 'none';
    }

    document.getElementById('formBuku').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSimpan');
        btn.disabled = true;
        btn.innerText = "Menyimpan...";

        const payload = {
            kode_panggil: document.getElementById('kode_panggil').value,
            klasifikasi: document.getElementById('klasifikasi').value,
            klasifikasi_manual: document.getElementById('klasifikasi_manual').value,
            kategori_manual: document.getElementById('kategori_manual').value,
            pengarang: document.getElementById('pengarang').value,
            judul: document.getElementById('judul').value,
            isbn: document.getElementById('isbn').value,
            stok: document.getElementById('stok').value
        };

        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("✅ Data Berhasil Disimpan!");
                document.getElementById('formBuku').reset();
                checkManual();
                loadBuku();
            }
        } catch (err) {
            alert("❌ Gagal simpan: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerText = "SIMPAN KE DATABASE";
        }
    });

    async function loadBuku() {
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            
            let html = `<table>
                <thead>
                    <tr>
                        <th>Kode Panggil (Label)</th>
                        <th>Klasifikasi/Kategori</th>
                        <th>Judul / Pengarang</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>`;
            
            data.forEach(b => {
                // Menampilkan label sesuai format: SR.297.HIR.b.C.1
                const klsAngka = b.klasifikasi.split(' ')[0];
                const label = `${b.kode_panggil}.${klsAngka}.${b.kode_pengarang}.${b.kode_judul}.${b.kode_koleksi}`;
                
                html += `<tr>
                    <td><span class="badge-kode">${label}</span></td>
                    <td><strong>${b.klasifikasi}</strong><br><small>${b.kategori}</small></td>
                    <td><strong>${b.judul}</strong><br><small>Oleh: ${b.pengarang}</small></td>
                    <td><button class="btn-delete" onclick="hapusBuku(${b.id})">Hapus</button></td>
                </tr>`;
            });

            document.getElementById('listBuku').innerHTML = html + `</tbody></table>`;
        } catch (e) {
            document.getElementById('listBuku').innerHTML = "Gagal memuat data.";
        }
    }

    async function hapusBuku(id) {
        if (confirm("Hapus data ini?")) {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            loadBuku();
        }
    }

    loadBuku();
