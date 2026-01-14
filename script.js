const API = 'https://perpustakaan.donnyn1980.workers.dev/api';
let qr;
let angSel = null;
let bukSel = null;

// --- KEAMANAN & INISIALISASI ---
function initApp() {
    const auth = localStorage.getItem('perpus_auth');
    if (auth) {
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard-page').classList.replace('hidden-secure', 'active-secure');
        openTab('sirkulasi');
    } else {
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('dashboard-page').classList.replace('active-secure', 'hidden-secure');
    }
}

async function prosesLogin() {
    const u = document.getElementById('l-user').value;
    const p = document.getElementById('l-pass').value;
    if (!u || !p) return alert("Isi Username & Password!");

    const str = btoa(`${u}:${p}`);
    const btn = document.getElementById('btn-login-submit');
    btn.innerText = "MEMVERIFIKASI...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API}/buku`, { 
            headers: { 'Authorization': 'Basic ' + str } 
        });
        if (res.ok) {
            localStorage.setItem('perpus_auth', str);
            document.getElementById('l-err').classList.add('hidden');
            initApp();
        } else {
            throw new Error();
        }
    } catch (e) {
        document.getElementById('l-err').classList.remove('hidden');
        btn.innerText = "MASUK KE SISTEM";
        btn.disabled = false;
    }
}

function logout() {
    if(confirm("Apakah Anda yakin ingin keluar?")) {
        localStorage.removeItem('perpus_auth');
        location.reload();
    }
}

// --- TAB & HEADER HELPER ---
function getH() {
    return { 
        'Authorization': 'Basic ' + localStorage.getItem('perpus_auth'),
        'Content-Type': 'application/json' 
    };
}

function openTab(n) {
    document.querySelectorAll('.tab-content, section.hidden-secure').forEach(s => {
        if(s.id.startsWith('view')) s.classList.replace('active-secure', 'hidden-secure');
    });
    document.querySelectorAll('.tab-btn').forEach(b => b.className = "tab-btn flex-1 py-2 rounded-lg font-bold text-xs uppercase transition text-gray-500 bg-gray-50");
    
    document.getElementById('view-'+n).classList.replace('hidden-secure', 'active-secure');
    document.getElementById('btn-'+n).classList.replace('text-gray-500', 'text-white');
    document.getElementById('btn-'+n).classList.replace('bg-gray-50', 'bg-blue-600');

    if(n==='buku') loadBuku();
    if(n==='anggota') loadAnggota();
}

// --- SIRKULASI (SCANNER & LOGIKA DATABASE) ---
function scan(t) {
    if(qr) qr.stop().then(() => initScan(t)).catch(() => initScan(t));
    else initScan(t);
}

function initScan(t) {
    qr = new Html5Qrcode("reader");
    qr.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, (txt) => {
        qr.stop();
        if(t==='anggota') { document.getElementById('in-ang').value = txt; cekAng(txt); }
        else { document.getElementById('in-buk').value = txt; cekBuk(txt); }
    }).catch(err => alert("Kamera tidak ditemukan!"));
}

async function cekAng(no) {
    if(!no) return;
    try {
        const res = await fetch(`${API}/anggota/cek?q=${no}`, { headers: getH() });
        const d = await res.json();
        if(!d) return alert("NIS tidak ditemukan!");
        
        angSel = d;
        document.getElementById('det-ang').innerHTML = `
            <div class="font-black text-blue-900 text-lg uppercase">${d.nama_lengkap}</div>
            <div class="font-bold text-gray-400">NIS: ${d.nomor_anggota} | KELAS: ${d.kelas}</div>
        `;
        
        let h = "";
        ['pinjaman1', 'pinjaman2', 'pinjaman3'].forEach((s, i) => {
            if(d[s]) {
                const b = JSON.parse(d[s]);
                h += `
                    <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex justify-between items-center shadow-sm">
                        <div class="text-[10px]">
                            <div class="font-black uppercase">${b.judul}</div>
                            <div class="text-red-600 font-bold">BATAS KEMBALI: ${b.batas_kembali}</div>
                        </div>
                        <button onclick="kembali('${d.nomor_anggota}','${b.kode_buku}','${s}')" class="bg-red-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-red-700">Kembalikan</button>
                    </div>`;
            } else {
                h += `<div class="p-3 border-2 border-dashed border-gray-100 rounded-xl text-center text-gray-300 font-bold text-[10px]">SLOT ${i+1} TERSEDIA</div>`;
            }
        });
        document.getElementById('det-sl').innerHTML = h;
    } catch(e) { alert("Gagal mengambil data anggota"); }
}

async function cekBuk(k) {
    if(!angSel) return alert("Silakan Scan Identitas Anggota terlebih dahulu!");
    try {
        const res = await fetch(`${API}/buku/cek?q=${k}`, { headers: getH() });
        const d = await res.json();
        if(!d) return alert("Buku tidak ditemukan di database!");
        if(!d.status.includes('Tersedia (SR)')) return alert("Buku ini adalah koleksi RF (Referensi) atau sedang dipinjam!");
        
        bukSel = d;
        document.getElementById('form-pj').classList.remove('hidden');
        document.getElementById('det-bk').innerHTML = `
            <div class="font-black text-orange-900 uppercase">${d.judul}</div>
            <div class="font-mono font-bold text-orange-400 tracking-tighter">${d.kode_buku}</div>
        `;
        const dt = new Date(); dt.setDate(dt.getDate() + 7);
        document.getElementById('in-tgl').value = dt.toISOString().split('T')[0];
    } catch(e) { alert("Gagal mengambil data buku"); }
}

async function pinjam() {
    if(!angSel || !bukSel) return;
    const body = { 
        kode_peminjaman: 'PJ-' + Date.now(), 
        nomor_anggota: angSel.nomor_anggota, 
        kode_buku: bukSel.kode_buku, 
        judul: bukSel.judul, 
        batas_kembali: document.getElementById('in-tgl').value 
    };
    
    const res = await fetch(`${API}/sirkulasi`, { 
        method: 'POST', headers: getH(), body: JSON.stringify(body) 
    });
    
    if(res.ok) { 
        alert("Peminjaman Berhasil Dicatat!"); 
        cekAng(angSel.nomor_anggota); 
        document.getElementById('form-pj').classList.add('hidden');
        document.getElementById('in-buk').value = "";
    } else { 
        const e = await res.json(); alert(e.error); 
    }
}

async function kembali(no, kd, sl) {
    if(!confirm("Proses pengembalian buku?")) return;
    const res = await fetch(`${API}/kembali/0`, { 
        method: 'POST', headers: getH(), 
        body: JSON.stringify({ nomor_anggota: no, kode_buku: kd, slot: sl }) 
    });
    const d = await res.json();
    alert("Buku telah diterima.\nTotal Denda: Rp" + d.denda);
    cekAng(no);
    loadBuku();
}

// --- MASTER DATA LOAD ---
async function loadBuku() {
    const res = await fetch(`${API}/buku`, { headers: getH() });
    const d = await res.json();
    document.getElementById('l-buku').innerHTML = d.map(b => `
        <tr class="border-b hover:bg-gray-50">
            <td class="p-3 font-mono font-bold text-blue-600">${b.kode_buku}</td>
            <td class="p-3 uppercase font-bold text-gray-700">${b.judul}</td>
            <td class="p-3"><span class="px-2 py-1 rounded-full font-black text-[9px] ${b.status.includes('Tersedia')?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}">${b.status}</span></td>
        </tr>`).join('');
}

async function loadAnggota() {
    const res = await fetch(`${API}/anggota`, { headers: getH() });
    const d = await res.json();
    document.getElementById('l-anggota').innerHTML = `
        <table class="w-full border text-left text-xs">
            <thead class="bg-gray-100 uppercase font-black"><tr><th class="p-3">NIS</th><th>NAMA LENGKAP</th><th class="text-center">PINJAMAN</th></tr></thead>
            <tbody>${d.map(a => `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-bold">${a.nomor_anggota}</td>
                    <td class="p-3 uppercase font-black">${a.nama_lengkap}</td>
                    <td class="p-3 text-center font-bold text-blue-600">${[a.pinjaman1, a.pinjaman2, a.pinjaman3].filter(x=>x).length} / 3</td>
                </tr>`).join('')}
            </tbody>
        </table>`;
}

// --- FORM HANDLERS ---
document.getElementById('form-buku').onsubmit = async (e) => {
    e.preventDefault();
    const b = { 
        klasifikasi: document.getElementById('b-klas').value, 
        kategori: document.getElementById('b-cat').value, 
        pengarang: document.getElementById('b-pgr').value, 
        judul: document.getElementById('b-judul').value, 
        stok: document.getElementById('b-stok').value, 
        isbn: document.getElementById('b-isbn').value 
    };
    const res = await fetch(`${API}/buku`, { method: 'POST', headers: getH(), body: JSON.stringify(b) });
    if(res.ok) { alert("Buku Berhasil Disimpan!"); loadBuku(); e.target.reset(); upCat(); }
};

document.getElementById('form-anggota').onsubmit = async (e) => {
    e.preventDefault();
    const a = { 
        nomor_anggota: document.getElementById('a-no').value, 
        nama_lengkap: document.getElementById('a-nama').value, 
        kelas: document.getElementById('a-kls').value 
    };
    const res = await fetch(`${API}/anggota`, { method: 'POST', headers: getH(), body: JSON.stringify(a) });
    if(res.ok) { alert("Anggota Berhasil Terdaftar!"); loadAnggota(); e.target.reset(); }
};

function upCat() {
    const d = { "000": "Umum", "500": "Sains", "800": "Fiksi" };
    document.getElementById('b-cat').value = d[document.getElementById('b-klas').value] || "Lainnya";
}

window.onload = initApp;
