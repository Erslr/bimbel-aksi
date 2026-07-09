const db = require('../config/database');

function getReminderH0H3() {

  return new Promise((resolve, reject) => {

    const query = `
      SELECT 
        p.id_pembayaran,
        p.tanggal_tagihan,
        p.tanggal_bayar,
        p.status,
        p.metode_pembayaran,
        p.wa_terkirim,
        p.custom_pesan,

        s.nama_lengkap,
        s.wa_siswa,
        s.harga_bulanan AS jumlah

      FROM pembayaran p

      JOIN siswa s
        ON p.id_siswa = s.id_siswa

      WHERE
      (
        p.status = 'belum'
        AND DATE(p.tanggal_tagihan)
        BETWEEN CURDATE()
        AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
      )

      ORDER BY p.tanggal_tagihan ASC
    `;

    db.query(query, (err, results) => {

      if (err) {
        return reject(err);
      }

      resolve(results);

    });

  });

}


// ==============================
// TANDAI WA TERKIRIM
// ==============================
function tandaiWaTerkirim(id_pembayaran) {

  return new Promise((resolve, reject) => {

    const query = `
      UPDATE pembayaran
      SET 
        wa_terkirim = 1,
        tanggal_wa = NOW()
      WHERE id_pembayaran = ?
    `;

    db.query(query, [id_pembayaran], (err) => {

      if (err) {

        console.error(
          '❌ Gagal update wa_terkirim:',
          err
        );

        return reject(err);

      }

      resolve();

    });

  });

}

module.exports = {
  getReminderH0H3,
  tandaiWaTerkirim
};