// ========================================
// DATA USERS (Diambil dari Google Sheets)
// ========================================
let USERS_DATA = [];
let isLoadingUsers = true;

// ========================================
// KONFIGURASI GOOGLE SHEETS
// ========================================
let SCRIPT_URL = localStorage.getItem('SCRIPT_URL') || 'https://script.google.com/macros/s/AKfycby2swlvFhVjffQp2ezW4yEvEJ22UGTSp81zc-bLlwgE2zJm7JWabN4XlSSYCiXKmGU/exec';

function setScriptUrl(url) {
    if (!url) return false;
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
        showAlert('error', 'Format URL tidak valid. Mulai dengan http:// atau https://');
        return false;
    }
    SCRIPT_URL = trimmed;
    localStorage.setItem('SCRIPT_URL', trimmed);
    showAlert('success', 'URL Google Apps Script disimpan.');
    return true;
}

// ========================================
// LOAD DATA USER DARI GOOGLE SHEETS
// ========================================
async function loadUsersFromSheets() {
    try {
        isLoadingUsers = true;
        const response = await fetch(SCRIPT_URL + '?action=getUsers');
        const result = await response.json();
        
        if (result.status === 'success' && result.users) {
            USERS_DATA = result.users;
            console.log('✅ Data users berhasil dimuat:', USERS_DATA.length, 'user(s)');
        } else {
            console.error('❌ Gagal memuat users:', result.message);
            USERS_DATA = [];
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
        showAlert('error', 'Gagal memuat data user dari Google Sheets');
        USERS_DATA = [];
    } finally {
        isLoadingUsers = false;
    }
}

// ========================================
// STATE MANAGEMENT
// ========================================
let currentUser = null;
let userAbsenList = [];
let filterType = 'semua';

window.onload = async function() {
    // Muat users dari Google Sheets
    await loadUsersFromSheets();
    
    // Cek apakah ada user yang tersimpan di localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser && !isLoadingUsers) {
        currentUser = JSON.parse(savedUser);
        loadUserAbsenHistory();
        showMainApp();
        showPage('dashboard');
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
    
    // Cek apakah data user masih loading
    if (isLoadingUsers) {
        showAlert('error', 'Data user masih dimuat, silakan tunggu...');
        return;
    }
    
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    
    const user = USERS_DATA.find(u => u.email.toLowerCase() === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        showAlert('success', 'Login berhasil! Selamat datang, ' + user.nama);
        
        setTimeout(() => {
            loadUserAbsenHistory();
            showMainApp();
            showPage('dashboard');
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
        userAbsenList = [];
        filterType = 'semua';
        document.getElementById('loginForm').reset();
        showLoginPage();
        showAlert('success', 'Logout berhasil!');
    }
}

// ========================================
// FUNGSI SHOW/HIDE PAGE
// ========================================
function showLoginPage() {
    document.getElementById('loginPage').classList.add('show');
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('loginPage').classList.remove('show');
    document.getElementById('mainApp').style.display = 'block';
    updateUserInfo();
}

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('show');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (pageName === 'dashboard') {
        document.getElementById('dashboardPage').classList.add('show');
        document.querySelector('[data-page="dashboard"]').classList.add('active');
    } else if (pageName === 'riwayat') {
        document.getElementById('riwayatPage').classList.add('show');
        document.querySelector('[data-page="riwayat"]').classList.add('active');
        filterType = 'semua';
        displayRiwayat();
    } else if (pageName === 'profile') {
        document.getElementById('profilePage').classList.add('show');
        document.querySelector('[data-page="profile"]').classList.add('active');
        updateProfilePage();
    }
}

// ========================================
// FUNGSI UPDATE USER INFO
// ========================================
function updateUserInfo() {
    if (!currentUser) return;
}

// ========================================
// FUNGSI LOAD ABSEN HISTORY
// ========================================
function loadUserAbsenHistory() {
    const saved = localStorage.getItem('userAbsenHistory_' + currentUser.email);
    userAbsenList = saved ? JSON.parse(saved) : [];
}

function saveUserAbsenHistory() {
    localStorage.setItem('userAbsenHistory_' + currentUser.email, JSON.stringify(userAbsenList));
}

// ========================================
// FUNGSI DISPLAY RIWAYAT
// ========================================
function displayRiwayat() {
    const riwayatList = document.getElementById('riwayatList');
    
    if (userAbsenList.length === 0) {
        riwayatList.innerHTML = '<div class="empty-state"><p>📭 Belum ada riwayat absensi</p></div>';
        return;
    }
    
    let filtered = [...userAbsenList];
    
    if (filterType !== 'semua') {
        filtered = filtered.filter(a => a.tipeAbsen === filterType);
    }
    
    filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    if (filtered.length === 0) {
        riwayatList.innerHTML = '<div class="empty-state"><p>📭 Tidak ada data untuk filter ini</p></div>';
        return;
    }
    
    let html = '';
    filtered.forEach((absen, index) => {
        const icon = absen.tipeAbsen === 'Masuk' ? '➡️' : absen.tipeAbsen === 'Pulang' ? '⬅️' : '⚠️';
        const alasan = absen.alasan && absen.alasan !== '-' ? `<div class="riwayat-detail"><strong>Alasan:</strong> ${absen.alasan}</div>` : '';
        const scope = absen.scopePekerjaan && absen.scopePekerjaan !== '-' ? `<div class="riwayat-detail"><strong>Scope:</strong> ${absen.scopePekerjaan}</div>` : '';
        const jenisPulang = absen.jenisPulang ? `<div class="riwayat-detail"><strong>Jenis:</strong> ${absen.jenisPulang}</div>` : '';
        
        html += `
            <div class="riwayat-item" data-index="${index}" data-type="${absen.tipeAbsen}">
                <div class="riwayat-header">
                    <span class="riwayat-type">${icon} ${absen.tipeAbsen}</span>
                    <span class="riwayat-time">${absen.waktu}</span>
                </div>
                <div class="riwayat-date">${absen.tanggal}</div>
                ${alasan}
                ${jenisPulang}
                ${scope}
            </div>
        `;
    });
    
    riwayatList.innerHTML = html;
}

// ========================================
// FUNGSI FILTER BY TYPE
// ========================================
function filterByType(type) {
    filterType = type;
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.getElementById('searchRiwayat').value = '';
    
    displayRiwayat();
}

// ========================================
// FUNGSI FILTER BY SEARCH
// ========================================
function filterRiwayat() {
    const searchTerm = document.getElementById('searchRiwayat').value.toLowerCase();
    const items = document.querySelectorAll('.riwayat-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const visible = text.includes(searchTerm);
        item.style.display = visible ? 'block' : 'none';
    });
}

// ========================================
// FUNGSI UPDATE PROFILE PAGE
// ========================================
function updateProfilePage() {
    if (!currentUser) return;
    
    const avatar = currentUser.nama.charAt(0).toUpperCase();
    
    const elAvatarProfile = document.getElementById('userAvatarProfile');
    const elNameProfile = document.getElementById('userNameProfile');
    const elEmail = document.getElementById('profileEmail');
    const elNim = document.getElementById('profileNim');
    const elJurusan = document.getElementById('profileJurusan');
    const elPerusahaan = document.getElementById('profilePerusahaan');
    const elAlamat = document.getElementById('profileAlamat');
    const elStatAbsen = document.getElementById('statAbsen');
    const elStatIzin = document.getElementById('statIzin');
    
    if (elAvatarProfile) elAvatarProfile.textContent = avatar;
    if (elNameProfile) elNameProfile.textContent = currentUser.nama;
    if (elEmail) elEmail.textContent = currentUser.email || '-';
    if (elNim) elNim.textContent = currentUser.nim || '-';
    if (elJurusan) elJurusan.textContent = currentUser.jurusan || '-';
    if (elPerusahaan) elPerusahaan.textContent = currentUser.perusahaan || '-';
    if (elAlamat) elAlamat.textContent = currentUser.alamat || '-';
    
    const totalAbsen = userAbsenList.filter(a => a.tipeAbsen === 'Masuk' || a.tipeAbsen === 'Pulang').length;
    const totalIzin = userAbsenList.filter(a => a.tipeAbsen === 'Izin').length;
    
    if (elStatAbsen) elStatAbsen.textContent = totalAbsen;
    if (elStatIzin) elStatIzin.textContent = totalIzin;
}

// ========================================
// FUNGSI UPDATE RADIO STYLE
// ========================================
function updateRadioStyle() {
    const radios = document.querySelectorAll('.radio-option');
    radios.forEach(option => {
        if (option.querySelector('input[type="radio"]').checked) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

// ========================================
// FUNGSI TOGGLE ALASAN & SCOPE FIELD
// ========================================
function toggleAlasanField() {
    const tipeAbsen = document.getElementById('tipeAbsen').value;
    const alasanGroup = document.getElementById('alasanGroup');
    const alasanInput = document.getElementById('alasan');
    const scopeGroup = document.getElementById('scopePekerjaanGroup');
    const scopeInput = document.getElementById('scopePekerjaan');
    const pulangOptionsGroup = document.getElementById('pulangOptionsGroup');
    const jenisPulangRadios = document.querySelectorAll('input[name="jenisPulang"]');
    
    alasanGroup.style.display = 'none';
    alasanInput.required = false;
    alasanInput.value = '';
    scopeGroup.style.display = 'none';
    scopeInput.required = false;
    scopeInput.value = '';
    pulangOptionsGroup.style.display = 'none';
    jenisPulangRadios.forEach(radio => {
        radio.checked = false;
        radio.closest('.radio-option').classList.remove('selected');
    });
    
    if (tipeAbsen === 'Izin') {
        alasanGroup.style.display = 'block';
        alasanInput.required = true;
    } else if (tipeAbsen === 'Pulang') {
        pulangOptionsGroup.style.display = 'block';
        scopeGroup.style.display = 'block';
        scopeInput.required = true;
    }
}

// ========================================
// FUNGSI CEK ABSEN MASUK HARI INI
// ========================================
function checkAbsenMasukHariIni() {
    const today = new Date().toLocaleDateString('id-ID');
    return userAbsenList.some(absen => {
        const absenDate = new Date(absen.timestamp).toLocaleDateString('id-ID');
        return absen.tipeAbsen === 'Masuk' && absenDate === today;
    });
}

// ========================================
// FUNGSI SUBMIT ABSENSI
// ========================================
document.getElementById('absenForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const tipeAbsen = document.getElementById('tipeAbsen').value;
    const alasan = document.getElementById('alasan').value.trim();
    const scopePekerjaan = document.getElementById('scopePekerjaan').value.trim();
    const jenisPulang = document.querySelector('input[name="jenisPulang"]:checked')?.value || '';

    if (!tipeAbsen) {
        showAlert('error', 'Mohon pilih tipe absensi!');
        return;
    }

    if (tipeAbsen === 'Masuk') {
        if (checkAbsenMasukHariIni()) {
            showAlert('error', 'Anda sudah melakukan absen masuk hari ini!');
            return;
        }
    }

    if (tipeAbsen === 'Izin' && !alasan) {
        showAlert('error', 'Mohon isi alasan izin!');
        return;
    }

    if (tipeAbsen === 'Pulang') {
        if (!jenisPulang) {
            showAlert('error', 'Mohon pilih jenis pulang (Normal atau Lembur)!');
            return;
        }
        if (!scopePekerjaan) {
            showAlert('error', 'Mohon isi scope pekerjaan!');
            return;
        }
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('absenForm').style.display = 'none';

    const now = new Date();
    const tanggal = now.toLocaleDateString('id-ID');
    const waktu = now.toLocaleTimeString('id-ID');

    const data = {
        timestamp: now.toISOString(),
        tanggal: tanggal,
        waktu: waktu,
        nama: currentUser.nama,
        nim: currentUser.nim,
        email: currentUser.email,
        jurusan: currentUser.jurusan,
        tipeAbsen: tipeAbsen,
        alasan: tipeAbsen === 'Izin' ? alasan : '-',
        jenisPulang: tipeAbsen === 'Pulang' ? jenisPulang : '-',
        scopePekerjaan: tipeAbsen === 'Pulang' ? scopePekerjaan : '-'
    };

    try {
        userAbsenList.push(data);
        saveUserAbsenHistory();
        
        if (SCRIPT_URL) {
            const formData = new FormData();
            formData.append('action', 'saveAbsensi');
            formData.append('data', JSON.stringify(data));

            await fetch(SCRIPT_URL, {
                method: 'POST',
                body: formData,
                redirect: 'follow'
            });
        }

        let message = '';
        if (tipeAbsen === 'Masuk') {
            message = 'Absen masuk berhasil dicatat! Selamat bekerja 💪';
        } else if (tipeAbsen === 'Pulang') {
            if (jenisPulang === 'Lembur') {
                message = 'Absen lembur berhasil dicatat. Terima kasih atas kerja kerasnya! 🙏';
            } else {
                message = 'Absen pulang berhasil dicatat! Hati-hati di jalan 🙏';
            }
        } else {
            message = 'Izin Anda berhasil dicatat. Semoga cepat sembuh/selesai urusannya 🙏';
        }
        
        showAlert('success', message);
        
        setTimeout(() => {
            document.getElementById('absenForm').reset();
            toggleAlasanField();
        }, 2000);

    } catch (error) {
        console.error('Error:', error);
        showAlert('error', 'Gagal mengirim data: ' + error.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('absenForm').style.display = 'block';
    }
});

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