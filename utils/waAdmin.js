// utils/waAdmin.js
const db = require('../config/database');

/* =========================
   FORMAT NOMOR INDONESIA — SUPER AMAN
========================= */
function formatNomorWA(nomor) {
  if (!nomor) return null;

  nomor = String(nomor).trim();

  // hapus semua selain angka
  nomor = nomor.replace(/[^0-9]/g, '');

  // jika mulai dengan 0 → ganti 62
  if (nomor.startsWith('0')) {
    nomor = '62' + nomor.substring(1);
  }

  // jika mulai dengan 8 → tambahkan 62
  if (nomor.startsWith('8')) {
    nomor = '62' + nomor;
  }

  // harus diawali 62
  if (!nomor.startsWith('62')) return null;

  // minimal panjang nomor valid
  if (nomor.length < 10) return null;

  return nomor;
}

/* =========================
   AMBIL NOMOR WA ADMIN (DB + FALLBACK ENV)
========================= */
function getAdminWANumber() {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT nomor_wa FROM admin LIMIT 1',
      (err, rows) => {
        if (err) return reject(err);

        // ambil dari DB kalau ada
        if (rows.length && rows[0].nomor_wa) {
          return resolve(formatNomorWA(rows[0].nomor_wa));
        }

        // fallback ke .env
        return resolve(formatNomorWA(process.env.ADMIN_WA));
      }
    );
  });
}

/* =========================
   AMBIL NOMOR WA SISWA
========================= */
function getSiswaWANumber(id) {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT wa_siswa FROM siswa WHERE id_siswa = ?',
      [id],
      (err, rows) => {
        if (err) return reject(err);

        if (!rows.length || !rows[0].wa_siswa) {
          return resolve(null);
        }

        resolve(formatNomorWA(rows[0].wa_siswa));
      }
    );
  });
}

/* =========================
   FORMAT PESAN WA (ANTI ANEH)
========================= */
function formatPesanWA(pesan) {
  if (!pesan) return '';

  return pesan
    .replace(/\r?\n/g, '\n') // rapihin enter
    .replace(/\n{3,}/g, '\n\n') // max 2 enter
    .trim();
}

/* =========================
   DETEKSI DEVICE
========================= */
function isMobile(userAgent = '') {
  return /Android|iPhone|iPad|iPod/i.test(userAgent);
}

/* =========================
   LINK WA PALING STABIL (SMART)
========================= */
function createWALink(nomor, pesan, userAgent = '') {

  if (!nomor) return '#';

  const text = encodeURIComponent(pesan);

  if (isMobile(userAgent)) {
    return `https://wa.me/${nomor}?text=${text}`;
  }

  return `https://web.whatsapp.com/send?phone=${nomor}&text=${text}`;

}

/* =========================
   EXPORT
========================= */
module.exports = {
  formatNomorWA,
  getAdminWANumber,
  getSiswaWANumber,
  createWALink,
};