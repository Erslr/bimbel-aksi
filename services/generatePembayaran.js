const db = require('../config/database');

let isGenerating = false; // 🔒 LOCK

async function generateTagihanBulanan() {

  if (isGenerating) {
    return Promise.reject(
        new Error("Generate masih berjalan.")
    );
}

  isGenerating = true; // 🔐 KUNCI

  return new Promise((resolve, reject) => {

    const querySiswa = `
      SELECT id_siswa, tanggal_masuk
      FROM siswa
      WHERE status_siswa = 'aktif'
        AND tanggal_masuk IS NOT NULL
    `;

    db.query(querySiswa, async (err, siswaList) => {

      if (err) {
        console.error('❌ Gagal ambil siswa:', err);
        isGenerating = false;
        return reject(err);
      }

      const batas = new Date();
      batas.setMonth(batas.getMonth() + 1); // sampai bulan depan

      try {

        for (const siswa of siswaList) {

          // Ambil tagihan terakhir
          const lastTagihan = await new Promise((resolveLast, rejectLast) => {

            db.query(
              `
              SELECT MAX(tanggal_tagihan) AS terakhir
              FROM pembayaran
              WHERE id_siswa = ?
              `,
              [siswa.id_siswa],
              (err, result) => {

                if (err) rejectLast(err);
                else resolveLast(result[0].terakhir);

              }
            );

          });

          let tanggal;

          if (lastTagihan) {
            tanggal = new Date(lastTagihan);
            tanggal.setMonth(tanggal.getMonth() + 1);
          } else {
            tanggal = new Date(siswa.tanggal_masuk);
            tanggal.setMonth(tanggal.getMonth() + 1);
          }

          while (tanggal <= batas) {

            await new Promise((resolveInsert, rejectInsert) => {

              db.query(
                `
                INSERT INTO pembayaran (id_siswa, tanggal_tagihan, status)
                VALUES (?, ?, 'belum')
                `,
                [siswa.id_siswa, tanggal],
                (err) => {

                  if (err) rejectInsert(err);
                  else resolveInsert();

                }
              );

            });

            tanggal.setMonth(tanggal.getMonth() + 1);

          }

        }

        console.log('✅ Generate pembayaran selesai & aman');

        resolve();

      } catch (error) {

        console.error('❌ Error saat generate:', error);

        reject(error);

      } finally {

        isGenerating = false; // 🔓 BUKA KUNCI

      }

    });

  });

}

module.exports = generateTagihanBulanan;