// ===================== HELPER FUNCTIONS =====================
function handleCors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...handleCors(),
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

// ===================== DATABASE FUNCTIONS =====================
async function getBuku(db) {
  try {
    const { results } = await db.prepare(
      'SELECT * FROM buku ORDER BY created_at DESC'
    ).all();
    return results;
  } catch (error) { throw error; }
}

async function tambahBuku(db, data) {
  try {
    const mapKategori = {
      "000": "Komputer",
      "100": "Filsafat dan psikologi",
      "200": "Agama",
      "300": "Ilmu sosial",
      "400": "Bahasa",
      "500": "Sains dan Matematika",
      "600": "Teknologi",
      "700": "Kesenian dan Rekreasi",
      "800": "Sastra",
      "900": "Sejarah dan Geografi"
    };
    const kategori = mapKategori[data.klasifikasi] || "Umum";

    // Logika Kode Pengarang: Ambil 3 huruf pertama dari kata terakhir
    const namaArray = data.pengarang.trim().split(/\s+/);
    const kataTerakhir = namaArray[namaArray.length - 1];
    const kodePengarang = kataTerakhir.substring(0, 3).toUpperCase();
    
    const kodeJudul = data.judul.trim().charAt(0).toLowerCase();
    
    // Ambil jumlah perulangan berdasarkan input stok
    const jumlahInput = parseInt(data.stok) || 1;
    let lastId = null;

    // Loop untuk memasukkan data sebanyak jumlah stok
    for (let i = 0; i < jumlahInput; i++) {
      const checkKoleksi = await db.prepare('SELECT COUNT(*) as total FROM buku WHERE judul = ?').bind(data.judul).first();
      const koleksiKe = (checkKoleksi?.total || 0) + 1;
      const kodeKoleksi = 'C.' + koleksiKe;
      
      const result = await db.prepare(
        'INSERT INTO buku (kode_panggil, klasifikasi, kategori, pengarang, kode_pengarang, judul, kode_judul, koleksi_ke, kode_koleksi, isbn, penerbit, tahun_terbit, stok) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        data.kode_panggil,
        data.klasifikasi,
        kategori,
        data.pengarang,
        kodePengarang,
        data.judul,
        kodeJudul,
        koleksiKe,
        kodeKoleksi,
        data.isbn || "", // ISBN tetap sama sesuai input user
        data.penerbit || "",
        data.tahun_terbit || "",
        1 
      ).run();
      
      lastId = result.meta.last_row_id;
    }
    
    return { success: true, message: jumlahInput + " data berhasil dimasukkan", last_id: lastId };
  } catch (error) { throw error; }
}

async function deleteBuku(db, id) {
  try {
    const result = await db.prepare('DELETE FROM buku WHERE id = ?').bind(id).run();
    return { success: result.meta.changes > 0 };
  } catch (error) { throw error; }
}

// ===================== MAIN WORKER HANDLER =====================
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const DB = env["perpustakaan-db"];
    
    if (method === 'OPTIONS') return new Response(null, { headers: handleCors() });

    try {
      if (path === '/api/buku' && method === 'GET') return jsonResponse(await getBuku(DB));
      if (path === '/api/buku' && method === 'POST') {
        const data = await request.json();
        return jsonResponse(await tambahBuku(DB, data), 201);
      }
      if (path.match(/^\/api\/buku\/\d+$/) && method === 'DELETE') {
        return jsonResponse(await deleteBuku(DB, path.split('/').pop()));
      }
    } catch (e) { return errorResponse(e.message, 500); }
    return errorResponse('Not Found', 404);
  }
};
