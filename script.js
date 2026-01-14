const API_URL = 'https://perpustakaan.donnyn1980.workers.dev/api';
let currentAuth = localStorage.getItem('perpus_auth');
let html5QrCode;
let selectedAnggota = null;
let selectedBuku = null;

// Auth Check
if (!currentAuth) {
    const user = prompt("Admin User:");
    const pass = prompt("Admin Pass:");
    currentAuth = btoa(user + ':' + pass);
    localStorage.setItem('perpus_auth', currentAuth);
}

function logout() { localStorage.removeItem('perpus_auth'); location.reload(); }

function openTab(name) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.className = "tab-btn px-6 py-2 rounded-md font-medium transition");
    document.getElementById(name).classList.add('active');
    document.getElementById('btn-'+name).classList.add('bg-blue-600', 'text-white');
    if(name==='buku') loadBuku();
    if(name==='anggota') loadAnggota();
}

// --- SCANNER LOGIC ---
function startScan(type) {
    if(html5QrCode) html5QrCode.stop();
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
    (decodedText) => {
        html5QrCode.stop();
        if(type === 'anggota') handleScanAnggota(decodedText);
        else handleScanBuku(decodedText);
    });
}

async function handleScanAnggota(no) {
    const res = await fetch(`${API_URL}/anggota/cek?q=${no}`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
    const data = await res.json();
    if(!data) return alert("Anggota tidak ditemukan!");
    
    selectedAnggota = data;
    document.getElementById('p-detail-anggota').innerHTML = `<div class="text-blue-800 font-bold">${data.nama_lengkap}</div><div class="text-xs">${data.nomor_anggota} - ${data.kelas}</div>`;
    
    // Tampilkan Slot Pinjaman
    const slots = ['pinjaman1', 'pinjaman2', 'pinjaman3'];
    let html = "";
    slots.forEach((s, i) => {
        if(data[s]) {
            const b = JSON.parse(data[s]);
            html += `<div class="p-3 border-l-4 border-red-500 bg-red-50 rounded flex justify-between items-center">
                <div class="text-xs">
                    <b>${b.judul}</b><br>${b.kode_buku} | Batas: ${b.batas_kembali}
                </div>
                <button onclick="kembalikanBuku('${data.nomor_anggota}', '${b.kode_buku}', '${s}')" class="bg-red-600 text-white px-2 py-1 rounded text-[10px]">KEMBALI</button>
            </div>`;
        } else {
            html += `<div class="p-3 border border-dashed rounded bg-gray-50 text-xs text-gray-400 italic">Slot ${i+1}: Kosong</div>`;
        }
    });
    document.getElementById('p-list-pinjaman').innerHTML = html;
}

async function handleScanBuku(kode) {
    if(!selectedAnggota) return alert("Scan Anggota terlebih dahulu!");
    const res = await fetch(`${API_URL}/buku/cek?q=${kode}`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
    const data = await res.json();
    
    if(!data || data.status !== 'Tersedia (SR)') return alert("Buku tidak tersedia untuk dipinjam!");
    
    selectedBuku = data;
    document.getElementById('form-pinjam-final').classList.remove('hidden');
    document.getElementById('p-detail-buku').innerHTML = `<b>${data.judul}</b><br><span class="text-xs">${data.kode_buku}</span>`;
}

async function submitPinjaman() {
    const batas = document.getElementById('p-batas').value;
    if(!batas) return alert("Isi batas kembali!");
    
    const body = {
        kode_peminjaman: 'PJ-' + Date.now(),
        nomor_anggota: selectedAnggota.nomor_anggota,
        kode_buku: selectedBuku.kode_buku,
        judul: selectedBuku.judul,
        pengarang: selectedBuku.pengarang,
        batas_kembali: batas
    };

    const res = await fetch(`${API_URL}/sirkulasi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth },
        body: JSON.stringify(body)
    });
    
    if(res.ok) {
        alert("Peminjaman Berhasil!");
        location.reload();
    } else {
        const err = await res.json();
        alert(err.error);
    }
}

async function kembalikanBuku(noAnggota, kdBuku, slotName) {
    if(!confirm("Proses Pengembalian?")) return;
    const res = await fetch(`${API_URL}/kembali/0`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth },
        body: JSON.stringify({ nomor_anggota: noAnggota, kode_buku: kdBuku, slot: slotName })
    });
    const data = await res.json();
    alert("Berhasil dikembalikan. Denda: Rp" + data.denda);
    location.reload();
}

// --- LOAD DATA (Sama seperti sebelumnya) ---
async function loadBuku() {
    const res = await fetch(`${API_URL}/buku`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
    const data = await res.json();
    document.getElementById('list-buku').innerHTML = data.map(b => `<tr><td class="p-2 border">${b.kode_buku}</td><td class="p-2 border">${b.judul}</td><td class="p-2 border">${b.status}</td></tr>`).join('');
}

async function loadAnggota() {
    const res = await fetch(`${API_URL}/anggota`, { headers: { 'Authorization': 'Basic ' + currentAuth } });
    const data = await res.json();
    document.getElementById('list-anggota-wrapper').innerHTML = `<table class="w-full border"><thead><tr class="bg-gray-100"><th class="p-2 border">NIS</th><th class="p-2 border">Nama</th><th class="p-2 border">Pinjaman Aktif</th></tr></thead><tbody>${data.map(a => {
        let count = [a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x => x).length;
        return `<tr><td class="p-2 border">${a.nomor_anggota}</td><td class="p-2 border">${a.nama_lengkap}</td><td class="p-2 border">${count} Buku</td></tr>`;
    }).join('')}</tbody></table>`;
}

document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const body = {
        klasifikasi: document.getElementById('b_klasifikasi').value,
        kategori: document.getElementById('b_kategori').value,
        pengarang: document.getElementById('b_pengarang').value,
        judul: document.getElementById('b_judul').value,
        stok: document.getElementById('b_stok').value,
        isbn: document.getElementById('b_isbn').value
    };
    await fetch(`${API_URL}/buku`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth }, body: JSON.stringify(body) });
    alert("Buku disimpan!"); loadBuku();
};

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const body = { nomor_anggota: document.getElementById('a_nomor').value, nama_lengkap: document.getElementById('a_nama').value, kelas: document.getElementById('a_kelas').value };
    await fetch(`${API_URL}/anggota`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Basic ' + currentAuth }, body: JSON.stringify(body) });
    alert("Anggota ditambah!"); loadAnggota();
};

function updateKategori() {
    const dd = { "000": "Karya Umum", "800": "Fiksi" };
    document.getElementById('b_kategori').value = dd[document.getElementById('b_klasifikasi').value] || "";
}

window.onload = () => openTab('buku');
