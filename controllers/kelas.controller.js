const db = require('../config/database');

// ==============================
// TAMPILKAN SEMUA KELAS
// ==============================
exports.index = (req, res) => {

  const keyword = req.query.keyword || '';

  let query = `
    SELECT *
    FROM kelas
    WHERE 1=1
  `;

  const params = [];

  if (keyword) {

    query += `
      AND (
        nama_kelas LIKE ?
        OR jenjang LIKE ?
        OR mapel LIKE ?
        OR tempat_les LIKE ?
        OR jadwal LIKE ?
      )
    `;

    const cari = `%${keyword}%`;

    params.push(
      cari,
      cari,
      cari,
      cari,
      cari
    );

  }

  query += `
    ORDER BY id_kelas DESC
  `;

  db.query(query, params, (err, results) => {

    if (err) {
      console.log(err);
      return res.send('Gagal mengambil data kelas');
    }

    res.render('kelas/index', {
      kelas: results,
      keyword,
      totalData: results.length,
      success: req.query.success,
      error: req.query.error,
      admin: req.session.admin,
      activePage: 'kelas'
    });

  });

};

// ==============================
// FORM TAMBAH KELAS
// ==============================
exports.formAdd = (req, res) => {

  res.render('kelas/form', {
    kelas: null,
    activePage: 'kelas'
  });

};

// ==============================
// SIMPAN KELAS
// ==============================
exports.store = (req, res) => {

  const {
    nama_kelas,
    jenjang,
    mapel,
    hari,
    jadwal,
    jam_mulai,
    jam_selesai,
    tempat_les,
    kapasitas
  } = req.body;

  const query = `
    INSERT INTO kelas
    (
      nama_kelas,
      jenjang,
      mapel,
      hari,
      jam_mulai,
      jam_selesai,
      tempat_les,
      jadwal,
      kapasitas
    )
    VALUES (?,?,?,?,?,?,?,?,?)
  `;

  db.query(
    query,
    [
      nama_kelas,
      jenjang,
      mapel,
      hari,
      jam_mulai,
      jam_selesai,
      tempat_les,
      jadwal,
      kapasitas
    ],
    (err) => {

      if (err) {
        console.log('ERROR TAMBAH KELAS:', err);

        return res.redirect('/kelas?error=tambah');
      }

      res.redirect('/kelas?success=tambah');

    }
  );

};

// ==============================
// FORM EDIT KELAS
// ==============================
exports.formEdit = (req, res) => {

  const { id } = req.params;

  db.query(
    'SELECT * FROM kelas WHERE id_kelas = ?',
    [id],
    (err, result) => {

      if (err || !result.length) {

        console.log('ERROR FORM EDIT:', err);

        return res.send('Data kelas tidak ditemukan');

      }

      res.render('kelas/form', {
  kelas: result[0],
  activePage: 'kelas'
});

    }
  );

};

// ==============================
// UPDATE KELAS
// ==============================
exports.update = (req, res) => {

  const { id } = req.params;

  const {
    nama_kelas,
    jenjang,
    mapel,
    hari,
    jadwal,
    jam_mulai,
    jam_selesai,
    tempat_les,
    kapasitas
  } = req.body;

  const query = `
    UPDATE kelas SET
      nama_kelas = ?,
      jenjang = ?,
      mapel = ?,
      hari = ?,
      jam_mulai = ?,
      jam_selesai = ?,
      tempat_les = ?,
      jadwal = ?,
      kapasitas = ?
    WHERE id_kelas = ?
  `;

  db.query(
    query,
    [
      nama_kelas,
      jenjang,
      mapel,
      hari,
      jam_mulai,
      jam_selesai,
      tempat_les,
      jadwal,
      kapasitas,
      id
    ],
    (err) => {

      if (err) {

        console.log('ERROR UPDATE KELAS:', err);

        return res.redirect('/kelas?error=edit');

      }

        res.redirect('/kelas?success=edit');

    }
  );

};

// ==============================
// HAPUS KELAS
// ==============================
exports.delete = (req, res) => {

  db.query(
    'DELETE FROM kelas WHERE id_kelas = ?',
    [req.params.id],
    (err) => {

      if (err) {

        console.log('ERROR HAPUS KELAS:', err);

        return res.redirect('/kelas?error=hapus');

      }

      res.redirect('/kelas?success=hapus');

    }
  );

};