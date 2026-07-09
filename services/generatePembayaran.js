const db = require('../config/database');

let isGenerating = false; // 🔒 LOCK

function generateTagihanBulanan() {
  if (isGenerating) {
    console.log('⛔ Generate masih berjalan, dibatalkan');
    return;
  }

  isGenerating = true; // 🔐 KUNCI

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
      return;
    }

    const batas = new Date();
    batas.setMonth(batas.getMonth() + 1); // sampai bulan depan

    try {
      for (const siswa of siswaList) {
        // Ambil tagihan terakhir
        const lastTagihan = await new Promise((resolve, reject) => {
          db.query(
            `
            SELECT MAX(tanggal_tagihan) AS terakhir
            FROM pembayaran
            WHERE id_siswa = ?
            `,
            [siswa.id_siswa],
            (err, result) => {
              if (err) reject(err);
              else resolve(result[0].terakhir);
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
          await new Promise((resolve, reject) => {
            db.query(
              `
              INSERT INTO pembayaran (id_siswa, tanggal_tagihan, status)
              VALUES (?, ?, 'belum')
              `,
              [siswa.id_siswa, tanggal],
              err => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          tanggal.setMonth(tanggal.getMonth() + 1);
        }
      }

      console.log('✅ Generate pembayaran selesai & aman');

    } catch (error) {
      console.error('❌ Error saat generate:', error);

    } finally {
      isGenerating = false; // 🔓 BUKA KUNCI
    }
  });
}

module.exports = generateTagihanBulanan;
