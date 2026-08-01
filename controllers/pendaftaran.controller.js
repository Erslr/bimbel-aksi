// controllers/pendaftaran.controller.js
const db = require('../config/database');
const { getAdminWANumber, createWALink } = require('../utils/waAdmin');

/* =====================================
   TAMPILKAN FORM PENDAFTARAN SISWA
===================================== */
exports.form = (req, res) => {
  res.render('pendaftaran_siswa');
};

/* =====================================
   SIMPAN DATA PENDAFTARAN SISWA
===================================== */
exports.store = async (req, res) => {
  try {
    const data = req.body;

    // 🔥 VALIDASI DASAR
    if (!data || !data.nama_lengkap) {
      return res.json({
        success: false,
        message: 'Data tidak lengkap'
      });
    }

    const sql = `
      INSERT INTO siswa (
        nama_lengkap,
        nama_panggilan,
        tempat_lahir,
        tanggal_lahir,
        alamat,
        jenis_kelamin,
        wa_siswa,
        asal_sekolah,
        kelas_sekolah,
        jenjang,
        organisasi,
        nama_ortu,
        wa_ortu,
        pekerjaan_ortu,
        hari_les,
        tanggal_masuk,
        mapel,
        jurusan_impian,
        kampus_impian,
        sumber_info,
        id_kelas,
        status_siswa
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `;

    const values = [
      data.nama_lengkap,
      data.nama_panggilan,
      data.tempat_lahir,
      data.tanggal_lahir,
      data.alamat,
      data.jenis_kelamin,
      data.wa_siswa,
      data.asal_sekolah,
      data.kelas_sekolah,
      data.jenjang,
      data.organisasi,
      data.nama_ortu,
      data.wa_ortu,
      data.pekerjaan_ortu,
      data.hari_les,
      data.tanggal_masuk,
      data.mapel,
      data.jurusan_impian,
      data.kampus_impian,
      data.sumber_info,
      null,
      'baru'
    ];

    // =========================
    // INSERT DATA
    // =========================
    await new Promise((resolve, reject) => {
      db.query(sql, values, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

      // =========================
// SIMPAN KE TABEL NOTIFIKASI
// =========================
console.log("=== MASUK INSERT NOTIF PENDAFTARAN ===");

await new Promise((resolve, reject) => {

  db.query(
    `INSERT INTO notifikasi
    (judul,pesan,tipe,untuk_role)
    VALUES (?,?,?,?)`,
    [
      'Pendaftaran Baru',
      `${data.nama_lengkap} telah melakukan pendaftaran.`,
      'pendaftaran',
      'admin'
    ],
    (err, result) => {

      if (err) {
        console.error("❌ INSERT NOTIF GAGAL");
        console.error(err);
        return reject(err);
      }

      console.log("✅ INSERT NOTIF BERHASIL");
      console.log(result);

      resolve();

    }
  );

});
    // =========================
    // 🔔 REALTIME NOTIF
    // =========================
    const io = req.app.get('io');
    if (io) {
      io.emit('pendaftarBaru',{

    nama:data.nama_lengkap,

    pesan:`${data.nama_lengkap} telah melakukan pendaftaran.`

    });
    }

    // =========================
    // 🔥 WHATSAPP ADMIN (FIX EMOJI)
    // =========================
    const nomorAdmin = await getAdminWANumber();

    if (nomorAdmin) {

      const pesanWA = `Halo Admin

*SISWA BARU MENDAFTAR*

Nama: ${data.nama_lengkap}
Panggilan: ${data.nama_panggilan || '-'}
WA: ${data.wa_siswa || '-'}
Sekolah: ${data.asal_sekolah || '-'}
Jenjang: ${data.jenjang || '-'}

Silakan cek dashboard admin.`;

      const userAgent = req.headers['user-agent'] || '';

      const linkWA = createWALink(
        nomorAdmin,
        pesanWA,
        userAgent
      );

      return res.json({
        success: true,
        waLink: linkWA
      });
    }

    // =========================
    // FALLBACK
    // =========================
    return res.json({
      success: true,
      message: 'Pendaftaran berhasil (WA admin tidak tersedia)'
    });

  } catch (error) {
    console.error(error);

    return res.json({
      success: false,
      message: 'Terjadi kesalahan: ' + error.message
    });
  }
};