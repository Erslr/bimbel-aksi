const db = require('../config/database');
const { getReminderH0H3 } = require('../services/reminderPembayaran');

exports.index = async (req, res) => {
  const queries = {
  totalSiswa: 'SELECT COUNT(*) total FROM siswa',
  siswaAktif: "SELECT COUNT(*) total FROM siswa WHERE status_siswa='aktif'",
  siswaNonaktif: "SELECT COUNT(*) total FROM siswa WHERE status_siswa='nonaktif'",
  totalKelas: 'SELECT COUNT(*) total FROM kelas',
  totalTentor: 'SELECT COUNT(*) total FROM tentor',
  belumAssign: 'SELECT COUNT(*) total FROM siswa WHERE id_kelas IS NULL',

  lakiLaki: "SELECT COUNT(*) total FROM siswa WHERE jenis_kelamin='L'",
  perempuan: "SELECT COUNT(*) total FROM siswa WHERE jenis_kelamin='P'"
};

  try {

    // ================= QUERY STATISTIK (ASLI KAMU) =================
    const result = await Promise.all(
      Object.values(queries).map(
        q =>
          new Promise((resolve, reject) => {
            db.query(q, (err, r) => {
              if (err) return reject(err);
              resolve(r[0].total);
            });
          })
      )
    );

    // ================= REMINDER (ASLI KAMU) =================
    const reminders = await getReminderH0H3();


    // =========================================================
    // 🔹 TAMBAHAN 1 — JADWAL HARI INI
    // =========================================================
    const hariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long' });

const jadwalHariIni = await new Promise((resolve) => {
  db.query(
    `SELECT nama_kelas, jenjang, jam_mulai, jam_selesai, tempat_les AS tempat
     FROM kelas
     WHERE LOWER(hari) = LOWER(?)
     ORDER BY jam_mulai ASC`,
    [hariIni],
    (err, rows) => {
      if (err) return resolve([]);

      const sekarang = new Date();
      
      const hasil = rows.map(j => {
        const jamMulai = new Date();
        const jamSelesai = new Date();

        const [h1, m1] = j.jam_mulai.split(':');
        const [h2, m2] = j.jam_selesai.split(':');

        jamMulai.setHours(h1, m1, 0);
        jamSelesai.setHours(h2, m2, 0);

        // 🔥 DETEKSI STATUS
        let status = 'belum';
        if (sekarang >= jamMulai && sekarang <= jamSelesai) {
          status = 'berlangsung';
        } else if (sekarang > jamSelesai) {
          status = 'selesai';
        }

        // 🔥 SESI OTOMATIS (berdasarkan jam)
        let sesi = 'Sesi 1';
        if (h1 >= 15 && h1 < 18) {
          sesi = 'Sesi 2';
        }
        if (h1 >= 18) {
          sesi = 'Sesi 3';
        }

        return {
          ...j,
          status,
          sesi
        };
      });

      resolve(hasil);
    }
  );
});

    // =========================================================
    // 🔹 TAMBAHAN 2 — KELAS HAMPIR PENUH
    // =========================================================
    const kelasPenuh = await new Promise((resolve) => {
      db.query(
        `SELECT k.nama_kelas, k.jenjang, k.kapasitas,
                COUNT(s.id_siswa) AS jumlah_siswa
         FROM kelas k
         LEFT JOIN siswa s ON s.id_kelas = k.id_kelas
         GROUP BY k.id_kelas
         HAVING jumlah_siswa >= k.kapasitas * 0.8`,
        (err, rows) => {
          if (err) return resolve([]);
          resolve(rows);
        }
      );
    });


    // ================= RENDER =================
    res.render('dashboard', {
      admin: req.session.user || { username: 'Admin' },
      activePage: 'dashboard',

      siswaBaru,

      totalSiswa: result[0],
      siswaAktif: result[1],
      siswaNonaktif: result[2],
      totalKelas: result[3],
      totalTentor: result[4],
      belumAssign: result[5],
      totalLaki: result[6],
      totalPerempuan: result[7],

      reminders,

      // 🔹 TAMBAHAN
      jadwalHariIni,
      kelasPenuh
    });

  } catch (err) {
  console.error("❌ ERROR DASHBOARD:");
  console.error(err);

  res.render('dashboard', {
    admin: req.session.user || { username: 'Admin' },
    activePage: 'dashboard',

    siswaBaru: 0,
    
    totalSiswa: 0,
    siswaAktif: 0,
    siswaNonaktif: 0,
    totalKelas: 0,
    totalTentor: 0,
    belumAssign: 0,
    lakiLaki: 0,
    perempuan: 0,

    reminders: [],
    jadwalHariIni: [],
    kelasPenuh: []
  });

  }
};
// =========================================================
// 🔹 JUMLAH SISWA BARU (UNTUK BADGE & POPUP)
// =========================================================
const siswaBaru = await new Promise((resolve) => {

  db.query(
    "SELECT COUNT(*) AS total FROM siswa WHERE status_siswa='baru'",
    (err, result) => {

      if (err) return resolve(0);

      resolve(result[0].total);

    }
  );

});
// ====================== NOTIFIKASI SISWA BARU ======================
exports.notifPendaftarBaru = async (req, res) => {
  try {
    const [row] = await new Promise((resolve, reject) => {
      db.query(
        `SELECT COUNT(*) AS jumlah 
         FROM siswa 
         WHERE status_siswa='baru'`,
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    });

    res.json({ jumlah: row.jumlah || 0 });

  } catch (err) {
    console.error('❌ Error notif siswa baru:', err);
    res.json({ jumlah: 0 });
  }
};