// Konfigurasi API
const API_URL = 'https://perpustakaan.donnyn1980.workers.dev/api';

function prosesLogin() {
    const user = document.getElementById('login-user').value;
    const pass = document.getElementById('login-pass').value;
    const errorMsg = document.getElementById('login-error');

    if (!user || !pass) {
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "Isi semua kolom!";
        return;
    }

    // Buat Basic Auth
    const authString = btoa(`${user}:${pass}`);
    localStorage.setItem('perpus_auth', authString);

    // Cek koneksi ke API sebagai validasi
    fetch(`${API_URL}/buku`, {
        headers: { 'Authorization': 'Basic ' + authString }
    }).then(res => {
        if (res.ok) {
            errorMsg.classList.add('hidden');
            showDashboard();
        } else {
            throw new Error();
        }
    }).catch(() => {
        localStorage.removeItem('perpus_auth');
        errorMsg.classList.remove('hidden');
        errorMsg.innerText = "Username atau Password Salah!";
    });
}

function showDashboard() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('dashboard-page').classList.add('active');
    openTab('buku');
}

function logout() {
    localStorage.removeItem('perpus_auth');
    location.reload();
}

// Check session saat pertama load
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('perpus_auth')) {
        showDashboard();
    }
});
