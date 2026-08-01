// controllers/pembayaran.controller.js
const db = require('../config/database');
const ExcelJS = require('exceljs');
const generateTagihanBulanan = require('../services/generatePembayaran');
const { getReminderH0H3, tandaiWaTerkirim } = require('../services/reminderPembayaran');
const { createWALink } = require('../utils/waAdmin');

function formatNomorWA(no) {
  return (no || '')
    .replace(/\D/g, '')   // hapus selain angka
    .replace(/^0/, '62'); // ubah 08 jadi 628
}

/* ==============================
   HALAMAN INDEX PEMBAYARAN
================================ */
exports.index = (req, res) => {

  const bulan = req.query.bulan || new Date().getMonth() + 1;
  const tahun = req.query.tahun || new Date().getFullYear();

  const filterStatus = req.query.status || 'semua';
  const filterJenjang = req.query.jenjang || 'semua';
  const keyword = req.query.keyword || '';

  let query = `
    SELECT 
      p.id_pembayaran,
      s.id_siswa,
      p.tanggal_tagihan,
      p.tanggal_bayar,
      p.status,
      p.metode_pembayaran,
      p.wa_terkirim,
      s.nama_lengkap,
      s.jenjang,
      s.kelas_sekolah,
      s.wa_siswa,
      s.harga_bulanan AS jumlah,
      p.custom_pesan
    FROM pembayaran p
    JOIN siswa s ON p.id_siswa = s.id_siswa
    WHERE MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const params = [bulan, tahun];

  // =========================
  // FILTER STATUS PEMBAYARAN
  // =========================
  if (filterStatus !== 'semua') {
    query += ` AND p.status = ? `;
    params.push(filterStatus);
  }

  // =========================
  // FILTER JENJANG
  // =========================
  if (filterJenjang !== 'semua') {
    query += ` AND s.jenjang = ? `;
    params.push(filterJenjang);
  }

  // =========================
  // SEARCH
  // =========================
  if (keyword) {

    query += `
      AND (
        s.nama_lengkap LIKE ?
        OR s.kelas_sekolah LIKE ?
        OR p.status LIKE ?
        OR p.metode_pembayaran LIKE ?
      )
    `;

    const cari = `%${keyword}%`;

    params.push(
      cari,
      cari,
      cari,
      cari
    );

  }

  query += ` ORDER BY p.tanggal_tagihan ASC `;

  // =========================
  // QUERY TOTAL
  // =========================
  let queryTotal = `
    SELECT SUM(s.harga_bulanan) AS total
    FROM pembayaran p
    JOIN siswa s ON p.id_siswa = s.id_siswa
    WHERE p.status = 'lunas'
      AND MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const totalParams = [bulan, tahun];

  if (filterJenjang !== 'semua') {
    queryTotal += ` AND s.jenjang = ? `;
    totalParams.push(filterJenjang);
  }

  db.query(query, params, (err, results) => {

    if (err) {
      console.log(err);

      return res.render('pembayaran/index', {
        pembayaran: [],
        admin: req.session.user,
        activePage: 'pembayaran',

        success: '',
        error: req.query.error || 'load',

        bulan,
        tahun,

        totalPembayaran: 0,
        totalData: 0,

        filterStatus,
        filterJenjang,
        keyword
      });
    }

    db.query(queryTotal, totalParams, (errTotal, totalResult) => {

      res.render('pembayaran/index', {
        pembayaran: results,
        admin: req.session.user,
        activePage: 'pembayaran',

        success: req.query.success || '',
        error: req.query.error || '',

        bulan,
        tahun,

        filterStatus,
        filterJenjang,
        keyword,

        totalData: results.length,
        totalPembayaran: totalResult?.[0]?.total || 0
      });

    });

  });
};

/* ==============================
   EXPORT EXCEL PEMBAYARAN
================================ */

exports.exportExcel = (req, res) => {

  const bulan = req.query.bulan;
  const tahun = req.query.tahun;

  const status = req.query.status || 'semua';
  const jenjang = req.query.jenjang || 'semua';

  let query = `
    SELECT
      s.nama_lengkap,
      s.jenjang,
      s.kelas_sekolah,
      p.tanggal_tagihan,
      s.harga_bulanan AS jumlah,
      p.metode_pembayaran,
      p.status
    FROM pembayaran p
    JOIN siswa s ON p.id_siswa = s.id_siswa
    WHERE MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const params = [bulan, tahun];

  // FILTER STATUS
  if (status !== 'semua') {
    query += ` AND p.status = ? `;
    params.push(status);
  }

  // FILTER JENJANG
  if (jenjang !== 'semua') {
    query += ` AND s.jenjang = ? `;
    params.push(jenjang);
  }

  query += ` ORDER BY p.tanggal_tagihan ASC `;

  let queryTotal = `
    SELECT SUM(s.harga_bulanan) AS total
    FROM pembayaran p
    JOIN siswa s ON p.id_siswa = s.id_siswa
    WHERE p.status = 'lunas'
      AND MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const totalParams = [bulan, tahun];

  if (jenjang !== 'semua') {
    queryTotal += ` AND s.jenjang = ? `;
    totalParams.push(jenjang);
  }

  db.query(query, params, async (err, results) => {

    if (err) {
      return res.send('Gagal export data pembayaran');
    }

    db.query(queryTotal, totalParams, async (errTotal, totalResult) => {

      const totalPembayaran =
        totalResult?.[0]?.total || 0;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan Pembayaran');

      // =========================
      // JUDUL
      // =========================
      worksheet.mergeCells('A1:H1');

      worksheet.getCell('A1').value =
        'LAPORAN PEMBAYARAN SISWA';

      worksheet.getCell('A1').font = {
        bold: true,
        size: 14
      };

      worksheet.getCell('A1').alignment = {
        horizontal: 'center'
      };

      worksheet.mergeCells('A2:H2');

      worksheet.getCell('A2').value =
        `Bulan: ${bulan} | Tahun: ${tahun} | Status: ${status === 'semua' ? 'Semua' : status} | Jenjang: ${jenjang === 'semua' ? 'Semua' : jenjang}`;

      worksheet.getCell('A2').alignment = {
        horizontal: 'center'
      };

      worksheet.addRow([]);
      worksheet.addRow([]);

      const tableStartRow =
        worksheet.lastRow.number + 1;

      // =========================
      // TABEL
      // =========================
      worksheet.addTable({
        name: 'TabelPembayaran',
        ref: `A${tableStartRow}`,
        headerRow: true,

        style: {
          theme: 'TableStyleMedium9',
          showRowStripes: true
        },

        columns: [
          { name: 'No' },
          { name: 'Nama Siswa' },
          { name: 'Jenjang' },
          { name: 'Kelas' },
          { name: 'Tanggal Tagihan' },
          { name: 'Jumlah (Rp)' },
          { name: 'Metode Pembayaran' },
          { name: 'Status' }
        ],

        rows: results.map((row, i) => [
          i + 1,
          row.nama_lengkap,
          row.jenjang || '-',
          row.kelas_sekolah || '-',
          new Date(row.tanggal_tagihan)
            .toLocaleDateString('id-ID'),
          row.jumlah,
          row.metode_pembayaran || '-',
          row.status.toUpperCase()
        ])
      });

      // =========================
      // LEBAR KOLOM
      // =========================
      worksheet.columns = [
        { width: 8 },
        { width: 30 },
        { width: 15 },
        { width: 12 },
        { width: 18 },
        { width: 18 },
        { width: 20 },
        { width: 15 }
      ];

      // =========================
      // FORMAT RUPIAH KOLOM F
      // =========================
      for (
        let i = tableStartRow + 1;
        i <= tableStartRow + results.length;
        i++
      ) {
        worksheet.getCell(`F${i}`).numFmt =
          '"Rp " #,##0';
      }

// =========================
// BARIS TOTAL
// =========================

worksheet.addRow([]);

const totalRow = worksheet.addRow([
  '',
  '',
  '',
  '',
  '',
  '',
  totalPembayaran,
  ''
]);

worksheet.mergeCells(
  `A${totalRow.number}:F${totalRow.number}`
);

worksheet.getCell(`A${totalRow.number}`).value =
  'TOTAL PEMBAYARAN LUNAS';

worksheet.getCell(`A${totalRow.number}`).alignment = {
  horizontal: 'right'
};

worksheet.getCell(`G${totalRow.number}`).value =
  Number(totalPembayaran);

worksheet.getCell(`G${totalRow.number}`).numFmt =
  '"Rp" #,##0';

totalRow.font = {
  bold: true
};

for (let col = 1; col <= 8; col++) {

  worksheet.getRow(totalRow.number)
    .getCell(col)
    .border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };

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
        `attachment; filename=laporan-pembayaran-${bulan}-${tahun}.xlsx`
      );

      await workbook.xlsx.write(res);

      res.end();

    });

  });

};

/* ==============================
   RIWAYAT PEMBAYARAN SISWA
================================ */
exports.riwayatSiswa = (req, res) => {

  const idSiswa = req.params.id;

  const query = `
    SELECT
      s.id_siswa,
      s.nama_lengkap,
      s.jenjang,
      s.kelas_sekolah,
      s.harga_bulanan,
      p.id_pembayaran,
      p.tanggal_tagihan,
      p.tanggal_bayar,
      p.status,
      p.metode_pembayaran
    FROM pembayaran p
    JOIN siswa s
      ON p.id_siswa = s.id_siswa
    WHERE s.id_siswa = ?
    ORDER BY p.tanggal_tagihan ASC
  `;

  db.query(query, [idSiswa], (err, results) => {

    if (err) {
      console.log(err);
      return res.send('Gagal mengambil riwayat pembayaran');
    }

    if (results.length === 0) {
      return res.send('Riwayat pembayaran tidak ditemukan');
    }
    
    res.render('pembayaran/riwayat', {
      siswa: results[0],
      riwayat: results,
      admin: req.session.user,
      activePage: 'pembayaran'
    });

  });

};

/* ==============================
   EXPORT EXCEL RIWAYAT SISWA
================================ */
exports.exportRiwayatSiswa = (req, res) => {

  const idSiswa = req.params.id;

  const query = `
    SELECT
      s.nama_lengkap,
      s.jenjang,
      s.kelas_sekolah,
      s.harga_bulanan,
      p.tanggal_tagihan,
      p.tanggal_bayar,
      p.metode_pembayaran,
      p.status
    FROM pembayaran p
    JOIN siswa s
      ON p.id_siswa = s.id_siswa
    WHERE s.id_siswa = ?
    ORDER BY p.tanggal_tagihan ASC
  `;

  db.query(query, [idSiswa], async (err, results) => {

    if (err || results.length === 0) {
      return res.send('Data tidak ditemukan');
    }

    const siswa = results[0];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Riwayat Pembayaran');

    /* =========================
   JUDUL
========================= */
worksheet.mergeCells('A1:F1');

worksheet.getCell('A1').value =
  'RIWAYAT PEMBAYARAN SISWA';

worksheet.getCell('A1').font = {
  bold: true,
  size: 16
};

worksheet.getCell('A1').alignment = {
  horizontal: 'center',
  vertical: 'middle'
};

worksheet.addRow([]);

/* =========================
   DATA SISWA
========================= */

worksheet.getCell('A3').value = 'Nama Siswa';
worksheet.getCell('B3').value = siswa.nama_lengkap;

worksheet.getCell('A4').value = 'Jenjang';
worksheet.getCell('B4').value = siswa.jenjang;

worksheet.getCell('A5').value = 'Kelas';
worksheet.getCell('B5').value = siswa.kelas_sekolah;

worksheet.getCell('A6').value = 'Biaya Bulanan';
worksheet.getCell('B6').value = siswa.harga_bulanan;

worksheet.getCell('B6').numFmt =
  '"Rp" #,##0';

for (let row = 3; row <= 6; row++) {

  worksheet.getCell(`A${row}`).font = {
    bold: true
  };

  worksheet.getCell(`A${row}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'EAEAEA' }
  };

  worksheet.getCell(`B${row}`).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'F8F8F8' }
  };

  worksheet.getCell(`A${row}`).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.getCell(`B${row}`).border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

}

worksheet.addRow([]);

/* =========================
   TABEL RIWAYAT
========================= */

const tableStartRow = 8;

worksheet.addTable({
  name: 'RiwayatPembayaran',
  ref: `A${tableStartRow}`,
  headerRow: true,

  style: {
    theme: 'TableStyleMedium9',
    showRowStripes: true
  },

  columns: [
    { name: 'No' },
    { name: 'Tanggal Tagihan' },
    { name: 'Tanggal Bayar' },
    { name: 'Jumlah' },
    { name: 'Metode' },
    { name: 'Status' }
  ],

  rows: results.map((row, i) => [

    i + 1,

    row.tanggal_tagihan
      ? new Date(row.tanggal_tagihan)
          .toLocaleDateString('id-ID')
      : '-',

    row.tanggal_bayar
      ? new Date(row.tanggal_bayar)
          .toLocaleDateString('id-ID')
      : '-',

    row.harga_bulanan,

    row.metode_pembayaran || '-',

    row.status.toUpperCase()

  ])
});

/* =========================
   LEBAR KOLOM
========================= */

worksheet.columns = [
  { width: 10 },
  { width: 20 },
  { width: 20 },
  { width: 18 },
  { width: 20 },
  { width: 15 }
];

/* =========================
   FORMAT RUPIAH
========================= */

for (
  let i = tableStartRow + 1;
  i <= tableStartRow + results.length;
  i++
) {
  worksheet.getCell(`D${i}`).numFmt =
    '"Rp" #,##0';
}

/* =========================
   TOTAL LUNAS
========================= */

const totalLunas = results
  .filter(r => r.status === 'lunas')
  .reduce(
    (sum, r) =>
      sum + Number(r.harga_bulanan),
    0
  );

worksheet.addRow([]);
worksheet.addRow([]);

const labelRow = worksheet.addRow([]);

worksheet.mergeCells(
  `A${labelRow.number}:F${labelRow.number}`
);

worksheet.getCell(`A${labelRow.number}`).value =
  'TOTAL PEMBAYARAN LUNAS';

worksheet.getCell(`A${labelRow.number}`).font = {
  bold: true,
  size: 12
};

worksheet.getCell(`A${labelRow.number}`).alignment = {
  horizontal: 'center'
};

const nominalRow = worksheet.addRow([]);

worksheet.mergeCells(
  `A${nominalRow.number}:F${nominalRow.number}`
);

worksheet.getCell(`A${nominalRow.number}`).value =
  `Rp ${Number(totalLunas).toLocaleString('id-ID')}`;

worksheet.getCell(`A${nominalRow.number}`).font = {
  bold: true,
  size: 14
};

worksheet.getCell(`A${nominalRow.number}`).alignment = {
  horizontal: 'center'
};

/* =========================
   DOWNLOAD
========================= */

res.setHeader(
  'Content-Type',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
);

res.setHeader(
  'Content-Disposition',
  `attachment; filename=riwayat-${siswa.nama_lengkap}.xlsx`
);

await workbook.xlsx.write(res);

res.end();

});

};
/* ==============================
   BAYAR (ADMIN)
================================ */
exports.bayar = (req, res) => {

  const { id } = req.params;
  const { metode_pembayaran } = req.body;

  const query = `
    UPDATE pembayaran
    SET
      status = 'menunggu',
      metode_pembayaran = ?,
      tanggal_bayar = NOW()
    WHERE id_pembayaran = ?
  `;

  db.query(query, [metode_pembayaran, id], (err) => {

    if (err) {
      console.log(err);
      return res.redirect('/pembayaran?error=bayar');
    }

    res.redirect('/pembayaran?success=bayar');

  });

};

/* ==============================
   PREVIEW WHATSAPP
================================ */
exports.previewWhatsapp = async (req, res) => {
  try {
    const siswa = await getReminderH0H3();
    res.render('pembayaran/whatsapp-preview', {
      siswa,
      admin: req.session.user,
      activePage: 'whatsapp'
    });
  } catch {
    res.send('Gagal mengambil data WhatsApp');
  }
};

/* ==============================
   UPDATE PESAN CUSTOM
================================ */
exports.updateCustomPesan = (req, res) => {
  const { id } = req.params;
  const { custom_pesan } = req.body;

  db.query(
    'UPDATE pembayaran SET custom_pesan = ? WHERE id_pembayaran = ?',
    [custom_pesan, id],
    () => res.redirect('/pembayaran/whatsapp/preview')
  );
};

/* ==============================
   TANDAI WA TERKIRIM
================================ */
exports.tandaiWhatsapp = async (req, res) => {
  await tandaiWaTerkirim(req.params.id);
  res.redirect('/pembayaran/whatsapp/preview');
};

/* ==============================
   🔥 KIRIM WHATSAPP (1 DATA - TANPA TAB BARU)
================================ */
exports.kirimWhatsapp = (req, res) => {
  const { id } = req.params;

  db.query(`
    SELECT 
      p.*,
      s.nama_lengkap,
      s.wa_siswa,
      s.harga_bulanan
    FROM pembayaran p
    JOIN siswa s ON p.id_siswa = s.id_siswa
    WHERE p.id_pembayaran = ?
  `, [id], (err, rows) => {

    if (err || rows.length === 0) {
      return res.json({ error: true });
    }

    const data = rows[0];

    if (!data.wa_siswa) {
      return res.json({ error: true, message: 'Nomor WA siswa kosong' });
    }
    // format nomor
    let nomor = formatNomorWA(data.wa_siswa);

    // format tanggal
    const tanggal = data.tanggal_tagihan
      ? new Date(data.tanggal_tagihan).toLocaleDateString('id-ID')
      : '-';

    // format rupiah
    const jumlah = data.harga_bulanan
      ? Number(data.harga_bulanan).toLocaleString('id-ID')
      : '0';

    // pesan
    const pesan = data.custom_pesan && data.custom_pesan.trim() !== ''
      ? data.custom_pesan
      : `Halo ${data.nama_lengkap} 👋

Kami dari Bimbel AKSI ingin mengingatkan pembayaran les :

📅 Jatuh Tempo: ${tanggal}
💰 Jumlah: Rp ${jumlah}

Sebelumnya kami juga ingin menanyakan, apakah lesnya masih ingin dilanjutkan untuk bulan berikutnya? 😊

Mohon konfirmasinya, Terima kasih 🙏`;

    const linkWA = createWALink(nomor, pesan, req.headers['user-agent'])

    res.json({ waLink: linkWA });
  });
};

/* ==============================
   GENERATE TAGIHAN
================================ */
exports.generateTagihan = async (req, res) => {

  try {

    await generateTagihanBulanan();

    return res.json({
      success: true,
      message: 'Tagihan berhasil digenerate.'
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      success: false,
      message: 'Gagal generate tagihan.'
    });

  }

};

/* ==============================
   ADMIN VERIFIKASI (FIXED + VALIDASI)
================================ */
exports.verifikasiPembayaran = async (req, res) => {
  const id = req.params.id;

  try {
    // =========================
    // AMBIL DATA PEMBAYARAN
    // =========================
    const pembayaran = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM pembayaran WHERE id_pembayaran = ?',
        [id],
        (err, result) => {
          if (err) reject(err);
          else resolve(result[0]);
        }
      );
    });

    if (!pembayaran) {
      return res.send('Data pembayaran tidak ditemukan');
    }

    // =========================
    // AMBIL NAMA SISWA
    // =========================
    const rows = await new Promise((resolve, reject) => {
      db.query(`
        SELECT 
          s.nama_lengkap,
          s.wa_siswa
        FROM pembayaran p
        JOIN siswa s ON p.id_siswa = s.id_siswa
        WHERE p.id_pembayaran = ?
      `, [id], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    if (rows.length > 0) {

  const siswa = rows[0];

  await new Promise((resolve, reject) => {
  db.query(
    `UPDATE pembayaran
     SET
       status = 'lunas',
       tanggal_bayar = NOW()
     WHERE id_pembayaran = ?`,
    [id],
    (err) => {
      if (err) reject(err);
      else resolve();
    }
  );
});

  const pesanWA = `Halo ${siswa.nama_lengkap} 👋

Terima kasih, pembayaran les Anda telah kami terima dan berhasil diverifikasi.

Status Pembayaran: LUNAS

Terima kasih telah belajar bersama Bimbel AKSI 😊`;

  let linkWA = null;

  if(siswa.wa_siswa){

  const nomorSiswa = formatNomorWA(siswa.wa_siswa);

  linkWA = createWALink(
    nomorSiswa,
    pesanWA,
    req.headers['user-agent']
  );

}

  return res.json({
  success:true,
  message:'Pembayaran berhasil diverifikasi',
  waLink:linkWA
});
}
  } catch (error) {
    console.error(error);
    res.redirect('/pembayaran');
  }
};
