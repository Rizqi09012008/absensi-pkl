    // ========================================
    // DATA USERS (Akun PKL yang terdaftar)
    // ========================================
    let USERS_DATA = [];
    
    // Load data dari file JSON
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            USERS_DATA = data.users;
        })
        .catch(error => console.error('Error loading data:', error));
    // ========================================
    // KONFIGURASI GOOGLE SHEETS
    // ========================================
        // Ambil dari localStorage jika tersedia, atau kosongkan
        let SCRIPT_URL = localStorage.getItem('https://script.google.com/macros/s/AKfycbyKV1Ju40kN5_Bf-hYBVSLLqbX5X-nPegAZ2WCh8Mey0miGZwd2p2mdCBLmZWJtgaNEhg/exec') || 'https://script.google.com/macros/s/AKfycbyKV1Ju40kN5_Bf-hYBVSLLqbX5X-nPegAZ2WCh8Mey0miGZwd2p2mdCBLmZWJtgaNEhg/exec';
        // Simpan URL Google Apps Script ke localStorage (dipanggil setelah user memasukkan URL)
        function setScriptUrl(url) {
            if (!url) return false;
            const trimmed = url.trim();
            // Validasi sederhana: harus diawali http atau https
            if (!/^https?:\/\//i.test(trimmed)) {
                showAlert('error', 'Format URL tidak valid. Mulai dengan http:// atau https://');
                return false;
            }
            SCRIPT_URL = trimmed;
            localStorage.setItem('SCRIPT_URL', trimmed);
            showAlert('success', 'URL Google Apps Script disimpan.');
            return true;
        }

        // Prompt interaktif untuk meminta URL dari user bila belum dikonfigurasi
        function promptForScriptUrl() {
            const input = prompt('Masukkan URL Google Apps Script (contoh: https://script.google.com/...)', SCRIPT_URL || '');
            if (input === null) return false; // user cancel
            return setScriptUrl(input);
        }
    // ========================================
    // STATE MANAGEMENT
    // ========================================
    let currentUser = null;
    // Cek apakah user sudah login sebelumnya
    window.onload = function() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            showAbsenPage();
        }
    };
    // ========================================
    // FUNGSI JAM DAN TANGGAL
    // ========================================
    function updateClock() {
        const now = new Date();
        
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        document.getElementById('clock').textContent = `${hours}:${minutes}:${seconds}`;
        
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        const dayName = days[now.getDay()];
        const day = now.getDate();
        const month = months[now.getMonth()];
        const year = now.getFullYear();
        
        document.getElementById('date').textContent = `${dayName}, ${day} ${month} ${year}`;
    }
    setInterval(updateClock, 1000);
    updateClock();
    // ========================================
    // FUNGSI LOGIN
    // ========================================
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        // Cari user di database
        const user = USERS_DATA.find(u => u.email.toLowerCase() === email && u.password === password);
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            showAlert('success', 'Login berhasil! Selamat datang, ' + user.nama);
            
            setTimeout(() => {
                showAbsenPage();
            }, 1000);
        } else {
            showAlert('error', 'Email atau password salah!');
        }
    });
    // ========================================
    // FUNGSI LOGOUT
    // ========================================
    function logout() {
        if (confirm('Apakah Anda yakin ingin logout?')) {
            currentUser = null;
            localStorage.removeItem('currentUser');
            showLoginPage();
            showAlert('success', 'Logout berhasil!');
        }
    }
    // ========================================
    // FUNGSI SHOW/HIDE PAGE
    // ========================================
    function showLoginPage() {
        document.getElementById('loginPage').classList.add('show');
        document.getElementById('absenPage').classList.remove('show');
        document.getElementById('loginForm').reset();
    }
    function showAbsenPage() {
        document.getElementById('loginPage').classList.remove('show');
        document.getElementById('absenPage').classList.add('show');
        document.getElementById('userInfo').style.display = 'block';
        
        // Update user info
        document.getElementById('userName').textContent = currentUser.nama;
        document.getElementById('userEmail').textContent = currentUser.email;
        document.getElementById('userAvatar').textContent = currentUser.nama.charAt(0).toUpperCase();
    }
    // ========================================
    // FUNGSI TOGGLE ALASAN FIELD
    // ========================================
    function toggleAlasanField() {
        const tipeAbsen = document.getElementById('tipeAbsen').value;
        const alasanGroup = document.getElementById('alasanGroup');
        const alasanInput = document.getElementById('alasan');
        
        if (tipeAbsen === 'Izin') {
            alasanGroup.style.display = 'block';
            alasanInput.required = true;
        } else {
            alasanGroup.style.display = 'none';
            alasanInput.required = false;
            alasanInput.value = '';
        }
    }
// ========================================
// FUNGSI SUBMIT ABSENSI - FIXED VERSION
// ========================================
document.getElementById('absenForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tipeAbsen = document.getElementById('tipeAbsen').value;
    const alasan = document.getElementById('alasan').value.trim();

    if (!tipeAbsen) {
        showAlert('error', 'Mohon pilih tipe absensi!');
        return;
    }

    if (tipeAbsen === 'Izin' && !alasan) {
        showAlert('error', 'Mohon isi alasan izin!');
        return;
    }

    // Validasi URL Script
    if (!SCRIPT_URL) {
        const configured = promptForScriptUrl();
        if (!configured) {
            showAlert('error', 'URL Google Apps Script belum dikonfigurasi!');
            return;
        }
    }

    // Tampilkan loading
    document.getElementById('loading').style.display = 'block';
    document.getElementById('absenForm').style.display = 'none';

    // Ambil waktu saat ini
    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID');
    const waktu = now.toLocaleTimeString('id-ID');

    // Data yang akan dikirim
    const data = {
        timestamp: now.toISOString(),
        tanggal: tanggal,
        waktu: waktu,
        nama: currentUser.nama,
        nim: currentUser.nim,
        email: currentUser.email,
        jurusan: currentUser.jurusan,
        tipeAbsen: tipeAbsen,
        alasan: tipeAbsen === 'Izin' ? alasan : '-'
    };

    try {
        // METODE 1: Gunakan FormData dengan redirect=false
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));

        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            redirect: 'follow'
        });

        // Cek response
        const result = await response.text();
        console.log('Response:', result);

        // Tampilkan pesan sukses
        let message = '';
        if (tipeAbsen === 'Masuk') {
            message = 'Absen masuk berhasil dicatat! Selamat bekerja 💪';
        } else if (tipeAbsen === 'Keluar') {
            message = 'Absen keluar berhasil dicatat! Hati-hati di jalan 🙏';
        } else {
            message = 'Izin Anda berhasil dicatat. Semoga cepat sembuh/selesai urusannya 🙏';
        }
        
        showAlert('success', message);
        
        // Reset form setelah 2 detik
        setTimeout(() => {
            document.getElementById('absenForm').reset();
            toggleAlasanField();
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Gagal mengirim data: ' + error.message);
    } finally {
        // Sembunyikan loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('absenForm').style.display = 'block';
    }
});

// ========================================
// ALTERNATIF: GUNAKAN GOOGLE FORM METHOD
// ========================================
// Jika fetch tetap error, gunakan ini sebagai backup
async function submitViaGoogleForm(data) {
    // Buat form tersembunyi
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = SCRIPT_URL;
    form.target = 'hidden_iframe';
    
    // Tambahkan data ke form
    for (let key in data) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = data[key];
        form.appendChild(input);
    }
    
    // Buat iframe tersembunyi untuk menangkap response
    let iframe = document.getElementById('hidden_iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.name = 'hidden_iframe';
        iframe.id = 'hidden_iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }
    
    // Submit form
    document.body.appendChild(form);
    form.submit();
    
    // Hapus form setelah submit
    setTimeout(() => {
        document.body.removeChild(form);
    }, 1000);
    
    return true;
}
    // ========================================
    // FUNGSI ALERT
    // ========================================
    function showAlert(type, message) {
        const alertSuccess = document.getElementById('alertSuccess');
        const alertError = document.getElementById('alertError');
        alertSuccess.style.display = 'none';
        alertError.style.display = 'none';
        if (type === 'success') {
            alertSuccess.textContent = '✓ ' + message;
            alertSuccess.style.display = 'block';
        } else {
            alertError.textContent = '✗ ' + message;
            alertError.style.display = 'block';
        }
        setTimeout(() => {
            alertSuccess.style.display = 'none';
            alertError.style.display = 'none';
        }, 5000);
    }