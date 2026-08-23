// ======================================================
// controllers/pembayaran.controller.js
// ======================================================

const db = require('../config/database');
const PDFDocument = require('pdfkit');

const generateTagihanBulanan = require('../services/generatePembayaran');

const {
  getReminderH0H3,
  tandaiWaTerkirim
} = require('../services/reminderPembayaran');

const { createWALink } = require('../utils/waAdmin');


// ======================================================
// HELPER
// ======================================================

// Format nomor WhatsApp
function formatNomorWA(no) {
  return (no || '')
    .replace(/\D/g, '')
    .replace(/^0/, '62');
}


// ======================================================
// HALAMAN INDEX PEMBAYARAN
// ======================================================

exports.index = (req, res) => {

  const bulan = req.query.bulan || new Date().getMonth() + 1;
  const tahun = req.query.tahun || new Date().getFullYear();

  const filterStatus = req.query.status || 'semua';
  const filterJenjang = req.query.jenjang || 'semua';
  const filterJenisKelamin = req.query.jenis_kelamin || 'semua';
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
      s.jenis_kelamin,
      s.kelas_sekolah,
      s.wa_siswa,
      s.harga_bulanan AS jumlah,
      p.custom_pesan
    FROM pembayaran p
    JOIN siswa s
      ON p.id_siswa = s.id_siswa
    WHERE MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const params = [bulan, tahun];


  // ==================================================
  // FILTER STATUS
  // ==================================================

  if (filterStatus !== 'semua') {
    query += ` AND p.status = ? `;
    params.push(filterStatus);
  }


  // ==================================================
  // FILTER JENJANG
  // ==================================================

  if (filterJenjang !== 'semua') {
    query += ` AND s.jenjang = ? `;
    params.push(filterJenjang);
  }


  // ==================================================
  // FILTER JENIS KELAMIN
  // ==================================================

  if (filterJenisKelamin !== 'semua') {
    query += ` AND s.jenis_kelamin = ? `;
    params.push(filterJenisKelamin);
  }


  // ==================================================
  // SEARCH
  // ==================================================

  if (keyword.trim() !== '') {

    query += `
      AND (
        s.nama_lengkap LIKE ?
        OR s.kelas_sekolah LIKE ?
        OR p.status LIKE ?
        OR p.metode_pembayaran LIKE ?
      )
    `;

    const cari = `%${keyword.trim()}%`;

    params.push(
      cari,
      cari,
      cari,
      cari
    );
  }


  query += `
    ORDER BY p.tanggal_tagihan ASC
  `;


  // ==================================================
  // QUERY TOTAL PEMBAYARAN LUNAS
  // ==================================================

  let queryTotal = `
    SELECT
      SUM(s.harga_bulanan) AS total
    FROM pembayaran p
    JOIN siswa s
      ON p.id_siswa = s.id_siswa
    WHERE p.status = 'lunas'
      AND MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const totalParams = [bulan, tahun];


  if (filterJenjang !== 'semua') {
    queryTotal += ` AND s.jenjang = ? `;
    totalParams.push(filterJenjang);
  }


  if (filterJenisKelamin !== 'semua') {
    queryTotal += ` AND s.jenis_kelamin = ? `;
    totalParams.push(filterJenisKelamin);
  }


  // Search juga diterapkan pada total
  if (keyword.trim() !== '') {

    queryTotal += `
      AND (
        s.nama_lengkap LIKE ?
        OR s.kelas_sekolah LIKE ?
        OR p.status LIKE ?
        OR p.metode_pembayaran LIKE ?
      )
    `;

    const cariTotal = `%${keyword.trim()}%`;

    totalParams.push(
      cariTotal,
      cariTotal,
      cariTotal,
      cariTotal
    );
  }


  // ==================================================
  // JALANKAN QUERY DATA
  // ==================================================

  db.query(query, params, (err, results) => {

    if (err) {

      console.error('Error query pembayaran:', err);

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
        filterJenisKelamin,
        keyword

      });
    }


    // ==================================================
    // QUERY TOTAL
    // ==================================================

    db.query(
      queryTotal,
      totalParams,
      (errTotal, totalResult) => {

        if (errTotal) {

          console.error(
            'Error query total pembayaran:',
            errTotal
          );

          return res.render('pembayaran/index', {

            pembayaran: results,

            admin: req.session.user,

            activePage: 'pembayaran',

            success: req.query.success || '',
            error: 'load',

            bulan,
            tahun,

            totalPembayaran: 0,

            totalData: results.length,

            filterStatus,
            filterJenjang,
            filterJenisKelamin,
            keyword

          });
        }


        return res.render('pembayaran/index', {

          pembayaran: results,

          admin: req.session.user,

          activePage: 'pembayaran',

          success: req.query.success || '',
          error: req.query.error || '',

          bulan,
          tahun,

          filterStatus,
          filterJenjang,
          filterJenisKelamin,
          keyword,

          totalData: results.length,

          totalPembayaran:
            Number(totalResult?.[0]?.total || 0)

        });

      }
    );

  });

};


// ======================================================
// EXPORT PDF PEMBAYARAN
// ======================================================

exports.exportPDF = (req, res) => {

  const bulan = req.query.bulan;
  const tahun = req.query.tahun;

  const status = req.query.status || 'semua';
  const jenjang = req.query.jenjang || 'semua';
  const jenisKelamin =
    req.query.jenis_kelamin || 'semua';

  const keyword = req.query.keyword || '';


  // ==================================================
  // VALIDASI BULAN & TAHUN
  // ==================================================

  if (!bulan || !tahun) {
    return res
      .status(400)
      .send('Bulan dan tahun harus dipilih.');
  }


  // ==================================================
  // QUERY
  // ==================================================

  let query = `
    SELECT
      s.nama_lengkap,
      s.jenjang,
      s.jenis_kelamin,
      s.kelas_sekolah,
      p.tanggal_tagihan,
      s.harga_bulanan AS jumlah,
      p.metode_pembayaran,
      p.status
    FROM pembayaran p
    JOIN siswa s
      ON p.id_siswa = s.id_siswa
    WHERE MONTH(p.tanggal_tagihan) = ?
      AND YEAR(p.tanggal_tagihan) = ?
  `;

  const params = [
    bulan,
    tahun
  ];


  // ==================================================
  // FILTER STATUS
  // ==================================================

  if (status !== 'semua') {

    query += `
      AND p.status = ?
    `;

    params.push(status);
  }


  // ==================================================
  // FILTER JENJANG
  // ==================================================

  if (jenjang !== 'semua') {

    query += `
      AND s.jenjang = ?
    `;

    params.push(jenjang);
  }


  // ==================================================
  // FILTER JENIS KELAMIN
  // ==================================================

  if (jenisKelamin !== 'semua') {

    query += `
      AND s.jenis_kelamin = ?
    `;

    params.push(jenisKelamin);
  }


  // ==================================================
  // SEARCH
  // ==================================================

  if (keyword.trim() !== '') {

    query += `
      AND (
        s.nama_lengkap LIKE ?
        OR s.kelas_sekolah LIKE ?
        OR p.status LIKE ?
        OR p.metode_pembayaran LIKE ?
      )
    `;

    const cari = `%${keyword.trim()}%`;

    params.push(
      cari,
      cari,
      cari,
      cari
    );
  }


  query += `
    ORDER BY p.tanggal_tagihan ASC
  `;


  // ==================================================
  // QUERY DATABASE
  // ==================================================

  db.query(
    query,
    params,
    (err, results) => {

      if (err) {

        console.error(
          'Error export PDF:',
          err
        );

        return res
          .status(500)
          .send(
            'Gagal mengambil data pembayaran'
          );
      }


      // ==================================================
      // BUAT PDF
      // ==================================================

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });


      res.setHeader(
        'Content-Type',
        'application/pdf'
      );

      res.setHeader(
        'Content-Disposition',
        `inline; filename=laporan-pembayaran-${bulan}-${tahun}.pdf`
      );


      doc.pipe(res);


      // ==================================================
      // JUDUL
      // ==================================================

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(
          'LAPORAN PEMBAYARAN SISWA',
          {
            align: 'center'
          }
        );

      doc.moveDown(0.5);


      // ==================================================
      // FILTER INFO
      // ==================================================

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Bulan: ${bulan} | Tahun: ${tahun}`
        );

      doc.text(
        `Status: ${
          status === 'semua'
            ? 'Semua'
            : status
        }`
      );

      doc.text(
        `Jenjang: ${
          jenjang === 'semua'
            ? 'Semua'
            : jenjang
        }`
      );


      let keteranganJK = 'Semua';

      if (jenisKelamin === 'L') {
        keteranganJK = 'Laki-laki';
      }

      if (jenisKelamin === 'P') {
        keteranganJK = 'Perempuan';
      }

      doc.text(
        `Jenis Kelamin: ${keteranganJK}`
      );


      if (keyword.trim() !== '') {

        doc.text(
          `Pencarian: ${keyword.trim()}`
        );
      }


      doc.moveDown();


      // ==================================================
      // GARIS
      // ==================================================

      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();

      doc.moveDown();


      // ==================================================
      // HEADER TABEL
      // ==================================================

      const startX = 40;

      const col = {

        no: startX,

        nama: 65,

        jenjang: 200,

        kelas: 245,

        tanggal: 290,

        jumlah: 365,

        metode: 445,

        status: 510

      };


      function drawTableHeader() {

        const headerY = doc.y;

        doc
          .fontSize(8)
          .font('Helvetica-Bold');

        doc.text(
          'No',
          col.no,
          headerY
        );

        doc.text(
          'Nama',
          col.nama,
          headerY
        );

        doc.text(
          'Jenjang',
          col.jenjang,
          headerY
        );

        doc.text(
          'Kelas',
          col.kelas,
          headerY
        );

        doc.text(
          'Tanggal',
          col.tanggal,
          headerY
        );

        doc.text(
          'Jumlah',
          col.jumlah,
          headerY
        );

        doc.text(
          'Metode',
          col.metode,
          headerY
        );

        doc.text(
          'Status',
          col.status,
          headerY
        );

        doc.moveDown();

        doc.font('Helvetica');
      }


      drawTableHeader();


      // ==================================================
      // DATA
      // ==================================================

      let totalLunas = 0;

      results.forEach((row, i) => {

        // Buat halaman baru jika penuh
        if (doc.y > 750) {

          doc.addPage();

          drawTableHeader();
        }


        const y = doc.y;


        const tanggal = row.tanggal_tagihan
          ? new Date(
              row.tanggal_tagihan
            ).toLocaleDateString('id-ID')
          : '-';


        const jumlah =
          Number(row.jumlah || 0);


        if (row.status === 'lunas') {

          totalLunas += jumlah;
        }


        doc
          .fontSize(8)
          .font('Helvetica');


        doc.text(
          String(i + 1),
          col.no,
          y
        );


        doc.text(
          row.nama_lengkap || '-',
          col.nama,
          y,
          {
            width: 130
          }
        );


        doc.text(
          row.jenjang || '-',
          col.jenjang,
          y
        );


        doc.text(
          row.kelas_sekolah || '-',
          col.kelas,
          y
        );


        doc.text(
          tanggal,
          col.tanggal,
          y
        );


        doc.text(
          `Rp ${jumlah.toLocaleString('id-ID')}`,
          col.jumlah,
          y
        );


        doc.text(
          row.metode_pembayaran || '-',
          col.metode,
          y
        );


        doc.text(
          (row.status || '-').toUpperCase(),
          col.status,
          y
        );


        doc.moveDown(1.5);
      });


      // ==================================================
      // TOTAL
      // ==================================================

      doc.moveDown();


      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();


      doc.moveDown(0.5);


      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(
          `TOTAL PEMBAYARAN LUNAS : Rp ${totalLunas.toLocaleString('id-ID')}`,
          {
            align: 'right'
          }
        );


      // ==================================================
      // FOOTER
      // ==================================================

      doc.moveDown(2);


      doc
        .font('Helvetica')
        .fontSize(8)
        .text(
          'Laporan ini dibuat oleh Sistem Informasi Manajemen Bimbel AKSI.',
          {
            align: 'center'
          }
        );


      doc.end();

    }
  );

};


// ======================================================
// RIWAYAT PEMBAYARAN SISWA
// ======================================================

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


  db.query(
    query,
    [idSiswa],
    (err, results) => {

      if (err) {

        console.error(err);

        return res
          .status(500)
          .send(
            'Gagal mengambil riwayat pembayaran'
          );
      }


      if (results.length === 0) {

        return res.send(
          'Riwayat pembayaran tidak ditemukan'
        );
      }


      res.render(
        'pembayaran/riwayat',
        {

          siswa: results[0],

          riwayat: results,

          admin: req.session.user,

          activePage: 'pembayaran'

        }
      );

    }
  );

};


// ======================================================
// KWITANSI PEMBAYARAN PDF
// ======================================================

exports.kwitansiPembayaran = (req, res) => {

  const id = req.params.id;


  const query = `
    SELECT
      p.id_pembayaran,
      p.tanggal_tagihan,
      p.tanggal_bayar,
      p.status,
      p.metode_pembayaran,

      s.id_siswa,
      s.nama_lengkap,
      s.jenjang,
      s.kelas_sekolah,
      s.harga_bulanan

    FROM pembayaran p

    JOIN siswa s
      ON p.id_siswa = s.id_siswa

    WHERE p.id_pembayaran = ?
  `;


  db.query(
    query,
    [id],
    (err, results) => {

      if (err) {

        console.error(err);

        return res
          .status(500)
          .send(
            'Gagal mengambil data kwitansi'
          );
      }


      if (results.length === 0) {

        return res
          .status(404)
          .send(
            'Data pembayaran tidak ditemukan'
          );
      }


      const data = results[0];


      try {

        // ==================================================
        // NOMOR KWITANSI
        // ==================================================

        const nomorKwitansi =
          `KW-BIMBEL-AKSI-${String(
            data.id_pembayaran
          ).padStart(6, '0')}`;


        // ==================================================
        // TANGGAL
        // ==================================================

        const tanggal =
          data.tanggal_bayar
            ? new Date(
                data.tanggal_bayar
              ).toLocaleDateString('id-ID')

            : data.tanggal_tagihan
              ? new Date(
                  data.tanggal_tagihan
                ).toLocaleDateString('id-ID')

              : '-';


        // ==================================================
        // JUMLAH
        // ==================================================

        const jumlah =
          Number(
            data.harga_bulanan || 0
          );


        // ==================================================
        // STATUS
        // ==================================================

        const status =
          data.status === 'lunas'
            ? 'LUNAS'
            : String(
                data.status || '-'
              ).toUpperCase();


        // ==================================================
        // NAMA FILE PDF
        // ==================================================

        const namaSiswaFile =
          String(
            data.nama_lengkap || 'Siswa'
          )
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^a-zA-Z0-9\-]/g, '');


        const namaFile =
          `Kwitansi-BIMBEL-AKSI-${String(
            data.id_pembayaran
          ).padStart(6, '0')}-${namaSiswaFile}.pdf`;


        // ==================================================
        // PDF
        // ==================================================

        const doc = new PDFDocument({
          size: 'A4',
          margin: 50
        });


        // ==================================================
        // HEADER RESPONSE
        // ==================================================
        // INLINE = PDF dibuka/preview terlebih dahulu.
        // Tidak langsung dipaksa download.

        res.setHeader(
          'Content-Type',
          'application/pdf'
        );


        res.setHeader(
          'Content-Disposition',
          `inline; filename="${namaFile}"`
        );


        doc.pipe(res);


        // ==================================================
        // BORDER LUAR
        // ==================================================

        doc
          .lineWidth(2)
          .rect(
            40,
            40,
            515,
            700
          )
          .stroke();


        // ==================================================
        // HEADER KWITANSI
        // ==================================================

        doc
          .font('Helvetica-Bold')
          .fontSize(24)
          .text(
            'BIMBEL AKSI',
            50,
            75,
            {
              align: 'center',
              width: 495
            }
          );


        doc
          .font('Helvetica')
          .fontSize(14)
          .text(
            'KWITANSI PEMBAYARAN',
            50,
            110,
            {
              align: 'center',
              width: 495
            }
          );


        // ==================================================
        // NOMOR KWITANSI
        // ==================================================

        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .text(
            `No. Kwitansi: ${nomorKwitansi}`,
            390,
            75,
            {
              width: 145,
              align: 'right'
            }
          );


        // ==================================================
        // GARIS
        // ==================================================

        doc
          .moveTo(70, 145)
          .lineTo(525, 145)
          .lineWidth(1)
          .stroke();


        // ==================================================
        // DATA SISWA
        // ==================================================

        let y = 180;


        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .text(
            'Nama Siswa',
            80,
            y
          );


        doc
          .font('Helvetica')
          .fontSize(12)
          .text(
            `: ${data.nama_lengkap || '-'}`,
            210,
            y
          );


        y += 38;


        doc
          .font('Helvetica-Bold')
          .text(
            'Jenjang',
            80,
            y
          );


        doc
          .font('Helvetica')
          .text(
            `: ${data.jenjang || '-'}`,
            210,
            y
          );


        y += 38;


        doc
          .font('Helvetica-Bold')
          .text(
            'Kelas',
            80,
            y
          );


        doc
          .font('Helvetica')
          .text(
            `: ${data.kelas_sekolah || '-'}`,
            210,
            y
          );


        y += 38;


        doc
          .font('Helvetica-Bold')
          .text(
            'Tanggal Pembayaran',
            80,
            y
          );


        doc
          .font('Helvetica')
          .text(
            `: ${tanggal}`,
            210,
            y
          );


        y += 38;


        doc
          .font('Helvetica-Bold')
          .text(
            'Metode Pembayaran',
            80,
            y
          );


        doc
          .font('Helvetica')
          .text(
            `: ${data.metode_pembayaran || '-'}`,
            210,
            y
          );


        // ==================================================
        // TOTAL PEMBAYARAN
        // ==================================================

        y += 55;


        doc
          .roundedRect(
            70,
            y,
            455,
            85,
            8
          )
          .lineWidth(1)
          .stroke();


        doc
          .font('Helvetica-Bold')
          .fontSize(13)
          .text(
            'TOTAL PEMBAYARAN',
            90,
            y + 25
          );


        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .text(
            `Rp ${jumlah.toLocaleString('id-ID')}`,
            300,
            y + 23,
            {
              width: 200,
              align: 'right'
            }
          );


        // ==================================================
        // STATUS
        // ==================================================

        y += 125;


        doc
          .font('Helvetica-Bold')
          .fontSize(18)
          .text(
            `STATUS: ${status}`,
            70,
            y,
            {
              align: 'center',
              width: 455
            }
          );


        // ==================================================
        // KETERANGAN
        // ==================================================

        y += 60;


        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#555')
          .text(
            'Kwitansi ini merupakan bukti pembayaran resmi',
            70,
            y,
            {
              align: 'center',
              width: 455
            }
          );


        doc
          .text(
            'Bimbel AKSI.',
            70,
            y + 16,
            {
              align: 'center',
              width: 455
            }
          );


        // ==================================================
        // FOOTER
        // ==================================================

        doc
          .fillColor('#000')
          .font('Helvetica')
          .fontSize(10)
          .text(
            'Terima kasih telah belajar bersama Bimbel AKSI 😊',
            70,
            650,
            {
              align: 'center',
              width: 455
            }
          );


        // ==================================================
        // SELESAI
        // ==================================================

        doc.end();


      } catch (error) {

        console.error(
          'Gagal membuat kwitansi PDF:',
          error
        );

        return res
          .status(500)
          .send(
            'Gagal membuat kwitansi PDF'
          );
      }

    }
  );

};

// ======================================================
// EXPORT PDF RIWAYAT PEMBAYARAN SISWA
// ======================================================

exports.exportRiwayatPDF = (req, res) => {

  const idSiswa = req.params.id;


  // ==================================================
  // QUERY DATA RIWAYAT PEMBAYARAN
  // ==================================================

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


  db.query(
    query,
    [idSiswa],
    (err, results) => {

      // ==================================================
      // ERROR DATABASE
      // ==================================================

      if (err) {

        console.error(
          'Error export PDF riwayat:',
          err
        );

        return res
          .status(500)
          .send(
            'Gagal mengambil data riwayat pembayaran'
          );
      }


      // ==================================================
      // DATA TIDAK DITEMUKAN
      // ==================================================

      if (
        !results ||
        results.length === 0
      ) {

        return res
          .status(404)
          .send(
            'Riwayat pembayaran tidak ditemukan'
          );
      }


      const siswa = results[0];


      // ==================================================
      // BUAT PDF
      // ==================================================

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });


      // ==================================================
      // HEADER RESPONSE
      // ==================================================

      res.setHeader(
        'Content-Type',
        'application/pdf'
      );


      res.setHeader(
        'Content-Disposition',
        `inline; filename=riwayat-pembayaran-${encodeURIComponent(
          siswa.nama_lengkap
        )}.pdf`
      );


      doc.pipe(res);


      // ==================================================
      // JUDUL
      // ==================================================

      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(
          'RIWAYAT PEMBAYARAN SISWA',
          {
            align: 'center'
          }
        );


      doc.moveDown(1);


      // ==================================================
      // INFORMASI SISWA
      // ==================================================

      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Nama Siswa');


      doc
        .font('Helvetica')
        .text(
          `: ${siswa.nama_lengkap || '-'}`
        );


      doc
        .font('Helvetica-Bold')
        .text('Jenjang');


      doc
        .font('Helvetica')
        .text(
          `: ${siswa.jenjang || '-'}`
        );


      doc
        .font('Helvetica-Bold')
        .text('Kelas');


      doc
        .font('Helvetica')
        .text(
          `: ${siswa.kelas_sekolah || '-'}`
        );


      doc.moveDown();


      // ==================================================
      // GARIS PEMISAH
      // ==================================================

      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();


      doc.moveDown();


      // ==================================================
      // HEADER TABEL
      // ==================================================

      const col = {

        no: 40,

        bulan: 70,

        tanggal: 180,

        metode: 280,

        status: 370,

        nominal: 455

      };


      function drawTableHeader() {

        const headerY = doc.y;


        doc
          .fontSize(8)
          .font('Helvetica-Bold');


        doc.text(
          'No',
          col.no,
          headerY
        );


        doc.text(
          'Bulan Tagihan',
          col.bulan,
          headerY
        );


        doc.text(
          'Tanggal Bayar',
          col.tanggal,
          headerY
        );


        doc.text(
          'Metode',
          col.metode,
          headerY
        );


        doc.text(
          'Status',
          col.status,
          headerY
        );


        doc.text(
          'Nominal',
          col.nominal,
          headerY
        );


        doc.moveDown();


        doc.font('Helvetica');

      }


      drawTableHeader();


      // ==================================================
      // DATA RIWAYAT
      // ==================================================

      results.forEach(
        (row, i) => {

          // ==============================================
          // CEK HALAMAN
          // ==============================================

          if (doc.y > 750) {

            doc.addPage();

            drawTableHeader();

          }


          const y = doc.y;


          // ==============================================
          // TANGGAL TAGIHAN
          // ==============================================

          const bulanTagihan =
            row.tanggal_tagihan
              ? new Date(
                  row.tanggal_tagihan
                ).toLocaleDateString(
                  'id-ID'
                )
              : '-';


          // ==============================================
          // TANGGAL BAYAR
          // ==============================================

          const tanggalBayar =
            row.tanggal_bayar
              ? new Date(
                  row.tanggal_bayar
                ).toLocaleDateString(
                  'id-ID'
                )
              : '-';


          // ==============================================
          // NOMINAL
          // ==============================================
          //
          // BELUM    -> -
          // MENUNGGU -> nominal
          // LUNAS    -> nominal
          //
          // ==============================================

          let nominal = '-';


          if (
            row.status === 'lunas' ||
            row.status === 'menunggu'
          ) {

            nominal =
              `Rp ${Number(
                row.harga_bulanan || 0
              ).toLocaleString(
                'id-ID'
              )}`;

          }


          // ==============================================
          // TULIS DATA
          // ==============================================

          doc
            .fontSize(8)
            .font('Helvetica');


          doc.text(
            String(i + 1),
            col.no,
            y
          );


          doc.text(
            bulanTagihan,
            col.bulan,
            y
          );


          doc.text(
            tanggalBayar,
            col.tanggal,
            y
          );


          doc.text(
            row.metode_pembayaran || '-',
            col.metode,
            y
          );


          doc.text(
            (
              row.status || '-'
            ).toUpperCase(),
            col.status,
            y
          );


          doc.text(
            nominal,
            col.nominal,
            y
          );


          doc.moveDown(1.5);

        }
      );


      // ==================================================
      // FOOTER
      // ==================================================

      doc.moveDown();


      doc
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke();


      doc.moveDown(1);


      doc
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Laporan ini dibuat oleh Sistem Informasi Manajemen Bimbel AKSI.',
          {
            align: 'center'
          }
        );


      // ==================================================
      // SELESAI
      // ==================================================

      doc.end();

    }
  );

};

// ======================================================
// BAYAR ADMIN
// ======================================================

exports.bayar = (req, res) => {

  const { id } = req.params;

  const {
    metode_pembayaran
  } = req.body;


  // ==================================================
  // AMBIL FILTER AKTIF
  // ==================================================

  const {
    bulan,
    tahun,
    status = 'semua',
    jenjang = 'semua',
    jenis_kelamin = 'semua',
    keyword = ''
  } = req.query;


  // ==================================================
  // UPDATE PEMBAYARAN
  // ==================================================

  const query = `
    UPDATE pembayaran

    SET
      status = 'menunggu',
      metode_pembayaran = ?,
      tanggal_bayar = NOW()

    WHERE id_pembayaran = ?
  `;


  db.query(
    query,
    [
      metode_pembayaran,
      id
    ],
    (err) => {

      if (err) {

        console.error(err);

        return res.redirect(
          `/pembayaran?error=bayar` +
          `&bulan=${encodeURIComponent(bulan || '')}` +
          `&tahun=${encodeURIComponent(tahun || '')}` +
          `&status=${encodeURIComponent(status)}` +
          `&jenjang=${encodeURIComponent(jenjang)}` +
          `&jenis_kelamin=${encodeURIComponent(jenis_kelamin)}` +
          `&keyword=${encodeURIComponent(keyword)}`
        );
      }


      return res.redirect(
        `/pembayaran?success=bayar` +
        `&bulan=${encodeURIComponent(bulan || '')}` +
        `&tahun=${encodeURIComponent(tahun || '')}` +
        `&status=${encodeURIComponent(status)}` +
        `&jenjang=${encodeURIComponent(jenjang)}` +
        `&jenis_kelamin=${encodeURIComponent(jenis_kelamin)}` +
        `&keyword=${encodeURIComponent(keyword)}`
      );

    }
  );

};


// ======================================================
// PREVIEW WHATSAPP
// ======================================================

exports.previewWhatsapp = async (req, res) => {

  try {

    const siswa =
      await getReminderH0H3();


    return res.render(
      'pembayaran/whatsapp-preview',
      {

        siswa,

        admin: req.session.user,

        activePage: 'whatsapp'

      }
    );

  } catch (error) {

    console.error(error);

    return res
      .status(500)
      .send(
        'Gagal mengambil data WhatsApp'
      );
  }

};


// ======================================================
// UPDATE PESAN CUSTOM
// ======================================================

exports.updateCustomPesan = (req, res) => {

  const { id } = req.params;

  const {
    custom_pesan
  } = req.body;


  db.query(
    `
      UPDATE pembayaran

      SET custom_pesan = ?

      WHERE id_pembayaran = ?
    `,
    [
      custom_pesan,
      id
    ],
    (err) => {

      if (err) {

        console.error(err);

        return res
          .status(500)
          .send(
            'Gagal memperbarui pesan'
          );
      }


      return res.redirect(
        '/pembayaran/whatsapp/preview'
      );

    }
  );

};


// ======================================================
// TANDAI WA TERKIRIM
// ======================================================

exports.tandaiWhatsapp = async (req, res) => {

  try {

    await tandaiWaTerkirim(
      req.params.id
    );


    return res.redirect(
      '/pembayaran/whatsapp/preview'
    );

  } catch (error) {

    console.error(error);

    return res
      .status(500)
      .send(
        'Gagal menandai WhatsApp terkirim'
      );
  }

};


// ======================================================
// KIRIM WHATSAPP
// ======================================================

exports.kirimWhatsapp = (req, res) => {

  const { id } = req.params;


  const query = `
    SELECT
      p.*,
      s.nama_lengkap,
      s.wa_siswa,
      s.harga_bulanan

    FROM pembayaran p

    JOIN siswa s
      ON p.id_siswa = s.id_siswa

    WHERE p.id_pembayaran = ?
  `;


  db.query(
    query,
    [id],
    (err, rows) => {

      if (err) {

        console.error(err);

        return res.json({
          error: true,
          message:
            'Gagal mengambil data pembayaran'
        });
      }


      if (rows.length === 0) {

        return res.json({
          error: true,
          message:
            'Data pembayaran tidak ditemukan'
        });
      }


      const data = rows[0];


      // ==================================================
      // CEK NOMOR WA
      // ==================================================

      if (!data.wa_siswa) {

        return res.json({
          error: true,
          message:
            'Nomor WA siswa kosong'
        });
      }


      const nomor =
        formatNomorWA(
          data.wa_siswa
        );


      // ==================================================
      // TANGGAL
      // ==================================================

      const tanggal =
        data.tanggal_tagihan
          ? new Date(
              data.tanggal_tagihan
            ).toLocaleDateString('id-ID')
          : '-';


      // ==================================================
      // JUMLAH
      // ==================================================

      const jumlah =
        data.harga_bulanan
          ? Number(
              data.harga_bulanan
            ).toLocaleString('id-ID')
          : '0';


      // ==================================================
      // PESAN
      // ==================================================

      const pesan =
        data.custom_pesan || '';


      // ==================================================
      // BUAT LINK WA
      // ==================================================

      const linkWA =
        createWALink(
          nomor,
          pesan,
          req.headers['user-agent']
        );


      return res.json({
        success: true,
        waLink: linkWA
      });

    }
  );

};


// ======================================================
// GENERATE TAGIHAN
// ======================================================

exports.generateTagihan = async (
  req,
  res
) => {

  try {

    await generateTagihanBulanan();


    return res.json({

      success: true,

      message:
        'Tagihan berhasil digenerate.'

    });

  } catch (err) {

    console.error(
      'Gagal generate tagihan:',
      err
    );


    return res.status(500).json({

      success: false,

      message:
        'Gagal generate tagihan.'

    });

  }

};


// ======================================================
// VERIFIKASI PEMBAYARAN
// ======================================================

exports.verifikasiPembayaran = async (
  req,
  res
) => {

  const id = req.params.id;


  try {

    // ==================================================
    // AMBIL DATA PEMBAYARAN + SISWA
    // ==================================================

    const rows =
      await new Promise(
        (resolve, reject) => {

          db.query(
            `
              SELECT
                p.id_pembayaran,
                p.status,
                p.tanggal_bayar,

                s.id_siswa,
                s.nama_lengkap,
                s.wa_siswa

              FROM pembayaran p

              JOIN siswa s
                ON p.id_siswa = s.id_siswa

              WHERE p.id_pembayaran = ?
            `,
            [id],
            (err, result) => {

              if (err) {
                reject(err);
              } else {
                resolve(result);
              }

            }
          );

        }
      );


    // ==================================================
    // DATA TIDAK DITEMUKAN
    // ==================================================

    if (
      !rows ||
      rows.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          'Data pembayaran tidak ditemukan.'

      });

    }


    const siswa = rows[0];


    // ==================================================
    // VALIDASI STATUS
    // ==================================================

    if (siswa.status !== 'menunggu') {

      return res.status(400).json({

        success: false,

        message:
          'Pembayaran tidak berada dalam status menunggu.'

      });

    }


    // ==================================================
    // UPDATE STATUS MENJADI LUNAS
    // ==================================================

    await new Promise(
      (resolve, reject) => {

        db.query(
          `
            UPDATE pembayaran

            SET
              status = 'lunas',
              tanggal_bayar = NOW()

            WHERE id_pembayaran = ?
          `,
          [id],
          (err) => {

            if (err) {
              reject(err);
            } else {
              resolve();
            }

          }
        );

      }
    );


    // ==================================================
    // LINK WHATSAPP
    // ==================================================
    // Tidak ada pesan otomatis.
    // WhatsApp hanya membuka chat siswa.
    // Admin kemudian mengirim PDF kwitansi secara manual.

    let waLink = null;


    if (siswa.wa_siswa) {

      const nomorSiswa =
        formatNomorWA(
          siswa.wa_siswa
        );


      // HANYA MEMBUKA CHAT
      waLink =
        createWALink(
          nomorSiswa,
          '',
          req.headers['user-agent']
        );

    }


    // ==================================================
    // RESPONSE
    // ==================================================

    return res.json({

      success: true,

      message:
        'Pembayaran berhasil diverifikasi dan status pembayaran menjadi LUNAS.',

      waLink: waLink

    });


  } catch (error) {

    console.error(
      'Error verifikasi pembayaran:',
      error
    );


    return res.status(500).json({

      success: false,

      message:
        'Terjadi kesalahan saat memverifikasi pembayaran.'

    });

  }

};