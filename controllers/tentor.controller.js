const db = require('../config/database');

// ================================
// TAMPILKAN DATA TENTOR
// ================================
exports.index = (req, res) => {

  const query = `
    SELECT *
    FROM tentor
    ORDER BY id_tentor DESC
  `;

  db.query(query, (err, results) => {

    if (err) return res.send(err.sqlMessage);

    res.render('tentor/index', {
      tentor: results,
      admin: req.session.admin,
      activePage: 'tentor',

      // SweetAlert
      success: req.query.success || '',
      error: req.query.error || ''
    });

  });

};

// ================================
// FORM TAMBAH TENTOR
// ================================
exports.add = (req, res) => {

  res.render('tentor/form', {
    tentor: null,
    activePage: 'tentor'
  });

};

// ================================
// SIMPAN TENTOR
// ================================
exports.store = (req, res) => {
      const {
      nama_tentor,
      perguruan_tinggi,
      no_wa,
      alamat,
      mapel,
      status
    } = req.body;

      const query = `
      INSERT INTO tentor
      (nama_tentor, perguruan_tinggi, no_wa, alamat, mapel, status)
      VALUES (?,?,?,?,?,?)
    `;

  db.query(
    query,
    [
      nama_tentor,
      perguruan_tinggi,
      no_wa,
      alamat,
      mapel,
      status
    ],
    (err) => {

      if (err) {
        console.log(err);
        return res.redirect('/tentor?error=tambah');
      }

      res.redirect('/tentor?success=tambah');

    }
  );
};

// ================================
// FORM EDIT TENTOR
// ================================
exports.edit = (req, res) => {

  const { id } = req.params;

  const query = 'SELECT * FROM tentor WHERE id_tentor = ?';

  db.query(query, [id], (err, result) => {

    if (err) {
      console.log(err);
      return res.send(err.sqlMessage);
    }

    res.render('tentor/form', {
      tentor: result[0],
      activePage: 'tentor'
    });

  });

};

// ================================
// UPDATE TENTOR
// ================================
exports.update = (req, res) => {
  const { id } = req.params;
  const {
  nama_tentor,
  perguruan_tinggi,
  no_wa,
  alamat,
  mapel,
  status
} = req.body;

  const query = `
  UPDATE tentor SET
    nama_tentor = ?,
    perguruan_tinggi = ?,
    no_wa = ?,
    alamat = ?,
    mapel = ?,
    status = ?
  WHERE id_tentor = ?
`;

  db.query(
  query,
  [
  nama_tentor,
  perguruan_tinggi,
  no_wa,
  alamat,
  mapel,
  status,
  id
],
  (err) => {

    if (err) {
      return res.redirect('/tentor?error=edit');
    }

    res.redirect('/tentor?success=edit');

  }
);
};

// ================================
// HAPUS TENTOR
// ================================
exports.delete = (req, res) => {

  const { id } = req.params;

  db.query(
    'DELETE FROM tentor WHERE id_tentor = ?',
    [id],
    (err) => {

      if (err) {
        console.log(err);
        return res.redirect('/tentor?error=hapus');
      }

      res.redirect('/tentor?success=hapus');

    }
  );

};