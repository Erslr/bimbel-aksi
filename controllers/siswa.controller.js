const db = require('../config/database');
const ExcelJS = require('exceljs');
const { getSiswaWANumber, createWALink } = require('../utils/waAdmin');

/* ==============================
   TAMPILKAN SEMUA SISWA (ADMIN)
================================ */
exports.index = (req, res) => {

  const filterStatus = req.query.status || 'semua';
  const filterJenjang = req.query.jenjang || 'semua';
  const filterJenisKelamin = req.query.jenis_kelamin || 'semua';
  const keyword = req.query.keyword || '';

  let query = `
    SELECT siswa.*, kelas.nama_kelas
    FROM siswa
    LEFT JOIN kelas ON siswa.id_kelas = kelas.id_kelas
    WHERE 1=1
  `;

  const params = [];

  // =========================
  // FILTER STATUS
  // =========================
  if (filterStatus !== 'semua') {
    query += ` AND siswa.status_siswa = ? `;
    params.push(filterStatus);
  }

  // =========================
  // FILTER JENJANG
  // =========================
  if (filterJenjang !== 'semua') {
    query += ` AND siswa.jenjang = ? `;
    params.push(filterJenjang);
  }

  // =========================
  // FILTER JENIS KELAMIN
  // =========================
  if (filterJenisKelamin !== 'semua') {
    query += ` AND siswa.jenis_kelamin = ? `;
    params.push(filterJenisKelamin);
  }

  // =========================
  // SEARCH
  // =========================
  if (keyword) {

    query += `
      AND (
        siswa.nama_lengkap LIKE ?
        OR siswa.nama_panggilan LIKE ?
        OR siswa.wa_siswa LIKE ?
        OR siswa.asal_sekolah LIKE ?
        OR siswa.nama_ortu LIKE ?
        OR kelas.nama_kelas LIKE ?
      )
    `;

    const cari = `%${keyword}%`;

    params.push(
      cari,
      cari,
      cari,
      cari,
      cari,
      cari
    );

  }

  query += ` ORDER BY siswa.id_siswa DESC`;

db.query(query, params, (err, results) => {

  if (err) {
    console.log(err);
    return res.send('Gagal mengambil data siswa');
  }

  // =========================
  // HITUNG SISWA STATUS BARU
  // =========================
  db.query(
    `SELECT COUNT(*) AS jumlah
     FROM siswa
     WHERE status_siswa = 'baru'`,
    (err2, notif) => {

      if (err2) {
        console.log(err2);
        return res.send('Gagal mengambil data notifikasi');
      }

      res.render('siswa/index', {
      siswa: results,
      admin: req.session.user,
      activePage: 'siswa',

      filterStatus,
      filterJenjang,
      filterJenisKelamin,
      keyword,
      totalData: results.length,

      siswaBaru: notif[0].jumlah
      });

    }
  );

});
}
/* ==============================
   DETAIL SISWA
================================ */
exports.detail = (req, res) => {
  const { id } = req.params;

  const query = `
    SELECT s.*, k.nama_kelas
    FROM siswa s
    LEFT JOIN kelas k ON s.id_kelas = k.id_kelas
    WHERE s.id_siswa = ?
  `;

  db.query(query, [id], (err, result) => {
    if (err || result.length === 0) return res.send('Data siswa tidak ditemukan');

    const siswa = result[0];

    res.render('siswa/detail', {
      siswa,
      admin: req.session.admin,
      activePage: 'siswa'
    });
  });
};

/* ==============================
   EDIT DATA SISWA
================================ */
exports.editForm = (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT * FROM siswa WHERE id_siswa = ?',
    [id],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.send('Gagal mengambil data siswa');
      }

      if (result.length === 0) {
        return res.send('Data siswa tidak ditemukan');
      }

      res.render('siswa/edit', {
        siswa: result[0],
        admin: req.session.admin,
        activePage: 'siswa'
      });

    }
  );
};


/* ==============================
   SIMPAN PERUBAHAN DATA SISWA
================================ */
exports.editStore = (req, res) => {

  const { id } = req.params;
  const data = req.body;

  // =========================
  // VALIDASI DATA WAJIB
  // =========================
  if (
    !data.nama_lengkap ||
    !data.nama_panggilan ||
    !data.tempat_lahir ||
    !data.tanggal_lahir ||
    !data.jenis_kelamin ||
    !data.agama ||
    !data.alamat ||
    !data.wa_siswa ||
    !data.asal_sekolah ||
    !data.kelas_sekolah ||
    !data.jenjang ||
    !data.organisasi ||
    !data.nama_ortu ||
    !data.wa_ortu ||
    !data.pekerjaan_ortu ||
    !data.hari_les ||
    !data.tanggal_masuk ||
    !data.mapel
  ) {
    return res.send('Mohon lengkapi seluruh data siswa.');
  }

  // =========================
  // UPDATE DATA SISWA
  // =========================
  const sql = `
    UPDATE siswa SET

      nama_lengkap = ?,
      nama_panggilan = ?,
      tempat_lahir = ?,
      tanggal_lahir = ?,
      alamat = ?,
      jenis_kelamin = ?,
      agama = ?,
      wa_siswa = ?,
      asal_sekolah = ?,
      kelas_sekolah = ?,
      jenjang = ?,
      organisasi = ?,
      nama_ortu = ?,
      wa_ortu = ?,
      pekerjaan_ortu = ?,
      hari_les = ?,
      tanggal_masuk = ?,
      mapel = ?,
      jurusan_impian = ?,
      kampus_impian = ?,
      sumber_info = ?

    WHERE id_siswa = ?
  `;

  const values = [
    data.nama_lengkap,
    data.nama_panggilan,
    data.tempat_lahir,
    data.tanggal_lahir,
    data.alamat,
    data.jenis_kelamin,
    data.agama,
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
    data.jurusan_impian || null,
    data.kampus_impian || null,
    data.sumber_info || null,
    id
  ];

  db.query(sql, values, (err) => {

    if (err) {
      console.error(err);
      return res.send('Gagal memperbarui data siswa');
    }

    // Setelah edit, kembali ke halaman Data Siswa
    // dengan pencarian berdasarkan nama siswa
    const namaSiswa = encodeURIComponent(data.nama_lengkap);
    res.redirect('/siswa/detail/' + id);

  });

};

/* ==============================
   EXPORT EXCEL DATA SISWA
================================ */
exports.exportExcel = (req, res) => {

  const status = req.query.status || 'semua';
  const jenjang = req.query.jenjang || 'semua';
  const jenisKelamin = req.query.jenis_kelamin || 'semua';

  let query = `
    SELECT s.*, k.nama_kelas
    FROM siswa s
    LEFT JOIN kelas k ON s.id_kelas = k.id_kelas
    WHERE 1=1
  `;

  const params = [];

  // =========================
  // FILTER STATUS
  // =========================
  if (status !== 'semua') {
    query += ` AND s.status_siswa = ? `;
    params.push(status);
  }

  // =========================
  // FILTER JENJANG
  // =========================
  if (jenjang !== 'semua') {
    query += ` AND s.jenjang = ? `;
    params.push(jenjang);
  }

  // =========================
  // FILTER JENIS KELAMIN
  // =========================
  if (jenisKelamin !== 'semua') {
    query += ` AND s.jenis_kelamin = ? `;
    params.push(jenisKelamin);
  }

  query += ` ORDER BY s.id_siswa ASC`;

  db.query(query, params, async (err, results) => {

    if (err) return res.send('Gagal export data siswa');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data Siswa');

    // =========================
    // JUDUL
    // =========================
    worksheet.mergeCells('A1:Y1');
    worksheet.getCell('A1').value = 'LAPORAN DATA SISWA';
    worksheet.getCell('A1').font = {
      bold: true,
      size: 14
    };
    worksheet.getCell('A1').alignment = {
      horizontal: 'center'
    };

    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9EAD3' }
    };

    // =========================
    // FILTER INFO
    // =========================
    worksheet.mergeCells('A2:Y2');
    worksheet.getCell('A2').value =
    `Status: ${status.toUpperCase()} | Jenjang: ${jenjang.toUpperCase()} | Jenis Kelamin: ${jenisKelamin === 'L' ? 'LAKI-LAKI' : jenisKelamin === 'P' ? 'PEREMPUAN' : 'SEMUA'}`;
    worksheet.getCell('A2').alignment = {
      horizontal: 'center'
    };

    worksheet.addRow([]);
    worksheet.addRow([]);

    const tableStartRow = worksheet.lastRow.number + 1;

    // =========================
    // TABEL
    // =========================
    worksheet.addTable({
      name: 'TabelSiswa',
      ref: `A${tableStartRow}`,
      headerRow: true,
      style: {
        theme: 'TableStyleMedium9',
        showRowStripes: true
      },
      columns: [
        { name: 'No' },
        { name: 'Nama Lengkap' },
        { name: 'Nama Panggilan' },
        { name: 'Tempat Lahir' },
        { name: 'Tanggal Lahir' },
        { name: 'Alamat' },
        { name: 'Jenis Kelamin' },
        { name: 'Agama' },
        { name: 'WA Siswa' },
        { name: 'Asal Sekolah' },
        { name: 'Kelas Sekolah' },
        { name: 'Jenjang' },
        { name: 'Organisasi' },
        { name: 'Nama Orang Tua' },
        { name: 'WA Orang Tua' },
        { name: 'Pekerjaan Orang Tua' },
        { name: 'Hari Les' },
        { name: 'Tanggal Masuk' },
        { name: 'Mata Pelajaran' },
        { name: 'Jurusan Impian' },
        { name: 'Kampus Impian' },
        { name: 'Sumber Informasi' },
        { name: 'Kelas Bimbel' },
        { name: 'Harga Bulanan' },
        { name: 'Status' }
      ],

      rows: results.map((siswa, index) => [
        index + 1,
        siswa.nama_lengkap,
        siswa.nama_panggilan,
        siswa.tempat_lahir,
        siswa.tanggal_lahir
          ? new Date(siswa.tanggal_lahir).toLocaleDateString('id-ID')
          : '-',
        siswa.alamat,
        siswa.jenis_kelamin,
        siswa.agama,
        siswa.wa_siswa,
        siswa.asal_sekolah,
        siswa.kelas_sekolah,
        siswa.jenjang,
        siswa.organisasi,
        siswa.nama_ortu,
        siswa.wa_ortu,
        siswa.pekerjaan_ortu,
        siswa.hari_les,
        siswa.tanggal_masuk
          ? new Date(siswa.tanggal_masuk).toLocaleDateString('id-ID')
          : '-',
        siswa.mapel,
        siswa.jurusan_impian,
        siswa.kampus_impian,
        siswa.sumber_info,
        siswa.nama_kelas || '-',
        siswa.harga_bulanan || 0,
        siswa.status_siswa.toUpperCase()
      ])
    });

    // =========================
    // LEBAR KOLOM
    // =========================
    worksheet.getColumn('A').width = 5;

    worksheet.getColumn('B').width = 30;
    worksheet.getColumn('F').width = 35;
    worksheet.getColumn('M').width = 25;
    worksheet.getColumn('X').width = 18;

    // SISANYA
for (let i = 3; i <= 25; i++) {

  const col = worksheet.getColumn(i);

  // skip yang sudah diatur manual
  if (
    col.number !== 6 &&
    col.number !== 13 &&
    col.number !== 24
  ) {
    col.width = 18;
  }

}
    // =========================
    // FORMAT RUPIAH
    // KOLOM X = Harga Bulanan
    // =========================
    const startDataRow = tableStartRow + 1;
    const endDataRow = tableStartRow + results.length;

    for (let row = startDataRow; row <= endDataRow; row++) {

      worksheet.getCell(`X${row}`).numFmt =
        '"Rp " #,##0';
    }

    // =========================
    // BORDER SELURUH TABEL
    // =========================
    for (let row = tableStartRow; row <= endDataRow; row++) {

        for (let col = 1; col <= 25; col++) {

          const cell = worksheet.getRow(row).getCell(col);

          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };

        }

      }

    // =========================
    // DOWNLOAD
    // =========================
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename=laporan-data-siswa-${status}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

  });

};

/* ==============================
   HAPUS DATA SISWA
   SISWA AKTIF WAJIB DINONAKTIFKAN
================================ */
exports.delete = (req, res) => {

  const { id } = req.params;

  // Cek status siswa terlebih dahulu
  db.query(
    'SELECT status_siswa FROM siswa WHERE id_siswa = ?',
    [id],
    (err, result) => {

      if (err) {
        console.error(err);
        return res.send('Gagal memeriksa status siswa');
      }

      if (result.length === 0) {
        return res.send('Data siswa tidak ditemukan');
      }

      const status = result[0].status_siswa;

      // =========================
      // SISWA AKTIF TIDAK BOLEH DIHAPUS
      // =========================
      if (status === 'aktif') {
        return res.redirect(
          `/siswa/detail/${id}?error=aktif`
        );
      }

      // =========================
      // HAPUS DATA PEMBAYARAN
      // =========================
      db.query(
        'DELETE FROM pembayaran WHERE id_siswa = ?',
        [id],
        (err) => {

          if (err) {
            console.error(err);
            return res.send('Gagal menghapus pembayaran');
          }

          // =========================
          // HAPUS DATA SISWA
          // =========================
          db.query(
            'DELETE FROM siswa WHERE id_siswa = ?',
            [id],
            (err) => {

              if (err) {
                console.error(err);
                return res.send('Gagal menghapus data siswa');
              }

              res.redirect('/siswa');
            }
          );

        }
      );

    }
  );

};

/* ==============================
   ASSIGN KELAS BIMBEL
================================ */
exports.assignForm = (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM siswa WHERE id_siswa = ?', [id], (err, siswa) => {
    if (err || siswa.length === 0) return res.send('Data siswa tidak ditemukan');

    const kelasQuery = `
      SELECT kelas.*,
      COUNT(s.id_siswa) AS jumlah_siswa
      FROM kelas
      LEFT JOIN siswa s ON s.id_kelas = kelas.id_kelas
      GROUP BY kelas.id_kelas
    `;

    db.query(kelasQuery, (err, kelas) => {
      if (err) return res.send('Gagal mengambil data kelas');

      res.render('siswa/assign-kelas', {
        siswa: siswa[0],
        kelas,
        admin: req.session.admin,
        activePage: 'siswa'
      });
    });
  });
};

exports.assignStore = (req, res) => {
  const { id } = req.params;
  const { id_kelas } = req.body;

  const cekQuery = `
    SELECT kelas.kapasitas, COUNT(siswa.id_siswa) AS jumlah_siswa
    FROM kelas
    LEFT JOIN siswa ON siswa.id_kelas = kelas.id_kelas
    WHERE kelas.id_kelas = ?
    GROUP BY kelas.id_kelas
  `;

  db.query(cekQuery, [id_kelas], (err, result) => {
    if (err) return res.send('Gagal cek kapasitas');

    const kapasitas = result[0]?.kapasitas || 0;
    const terisi = result[0]?.jumlah_siswa || 0;

    if (kapasitas > 0 && terisi >= kapasitas) {
      return res.send('Kelas sudah penuh');
    }

    db.query('UPDATE siswa SET id_kelas = ? WHERE id_siswa = ?', [id_kelas, id], (err) => {
      if (err) return res.send('Gagal assign kelas');
      res.redirect('/siswa/detail/' + id);
    });
  });
};

/* ==============================
   INPUT HARGA BULANAN
================================ */
exports.hargaForm = (req, res) => {
  const { id } = req.params;

  db.query('SELECT * FROM siswa WHERE id_siswa = ?', [id], (err, siswa) => {
    if (err || siswa.length === 0) return res.send('Data siswa tidak ditemukan');

    res.render('siswa/harga', {
      siswa: siswa[0],
      admin: req.session.admin,
      activePage: 'siswa'
    });
  });
};

exports.hargaStore = (req, res) => {
  const { id } = req.params;
  const { harga_bulanan } = req.body;

  db.query('UPDATE siswa SET harga_bulanan = ? WHERE id_siswa = ?', [harga_bulanan, id], (err) => {
    if (err) return res.send('Gagal menyimpan harga');
    res.redirect('/siswa/detail/' + id);
  });
};

/* ==============================
   KONFIRMASI SISWA + NOTIFIKASI REALTIME
================================ */
exports.konfirmasi = async (req, res) => {
  try {
    const { id } = req.params;

    const siswa = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM siswa WHERE id_siswa = ?', [id], (err, result) => {
        if (err) reject(err);
        else resolve(result[0]);
      });
    });

    if (!siswa) return res.send('Data siswa tidak ditemukan');

    if (!siswa.harga_bulanan) {
      return res.send('Harga bulanan belum diatur');
    }

    await new Promise((resolve, reject) => {
      db.query(
        `UPDATE siswa SET status_siswa='aktif', tanggal_konfirmasi=CURDATE() WHERE id_siswa=?`,
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    const io = req.app.get('io');

    await new Promise((resolve) => {
      db.query(
        `INSERT INTO notifikasi (judul, pesan, tipe, untuk_role) VALUES (?, ?, ?, ?)`,
        ['Siswa Dikonfirmasi', `${siswa.nama_lengkap} berhasil dikonfirmasi`, 'konfirmasi', 'admin'],
        () => resolve()
      );
    });

    if (io) {
      io.emit('notif_admin', {
        judul: 'Siswa Dikonfirmasi',
        pesan: `${siswa.nama_lengkap} berhasil dikonfirmasi`
      });
    }

    /* ======================
       🔥 KIRIM WA STABIL
    ====================== */

    const nomor = await getSiswaWANumber(id);

    if (!nomor) {
      return res.send('Nomor WA siswa tidak valid');
    }

    const pesanWA = `Halo ${siswa.nama_lengkap} 👋

Pendaftaran kamu telah dikonfirmasi ✅
Status kamu sekarang AKTIF 🎉

Terima kasih sudah bergabung di BIMBEL AKSI 💚`;

    const linkWA = createWALink(nomor, pesanWA, req.headers['user-agent']);
    return res.json({ waLink: linkWA });

  } catch (error) {
    console.error(error);
    res.send('Terjadi kesalahan saat konfirmasi');
  }
};

/* ==============================
   NONAKTIFKAN SISWA
================================ */
exports.nonaktifkan = (req, res) => {
  const { id } = req.params;

  db.query("UPDATE siswa SET status_siswa='nonaktif' WHERE id_siswa=?", [id], (err) => {
    if (err) return res.send('Gagal menonaktifkan');
    res.redirect('/siswa/detail/' + id);
  });
};