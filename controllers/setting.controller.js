const bcrypt = require('bcrypt');
const db = require('../config/database');


// ======================================================
// HALAMAN UTAMA SETTING
// ======================================================

exports.index = (req, res) => {

  res.render('setting/index', {
    activePage: 'setting'
  });

};


// ======================================================
// HALAMAN AKUN SAYA
// ======================================================

exports.akun = (req, res) => {

  const idAdmin = req.session.user.id;

  const query = `
    SELECT
      id_admin,
      username,
      nama_admin,
      nomor_wa
    FROM admin
    WHERE id_admin = ?
  `;

  db.query(
    query,
    [idAdmin],
    (err, result) => {

      if (err) {

        console.error(
          'Error mengambil data akun admin:',
          err
        );

        return res.status(500).send(
          'Gagal mengambil data akun admin.'
        );

      }


      if (
        !result ||
        result.length === 0
      ) {

        return res.status(404).send(
          'Data admin tidak ditemukan.'
        );

      }


      res.render('setting/akun', {
        admin: result[0],
        activePage: 'setting'
      });

    }
  );

};


// ======================================================
// UPDATE PROFIL ADMIN
// ======================================================

exports.updateProfil = (req, res) => {

  const idAdmin = req.session.user.id;

  const {
    nama_admin,
    username,
    nomor_wa
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (
    !nama_admin ||
    !username
  ) {

    return res.json({
      success: false,
      message: 'Nama admin dan username wajib diisi.'
    });

  }


  const query = `
    UPDATE admin
    SET
      nama_admin = ?,
      username = ?,
      nomor_wa = ?
    WHERE id_admin = ?
  `;


  db.query(
    query,
    [
      nama_admin.trim(),
      username.trim(),
      nomor_wa
        ? nomor_wa.trim()
        : null,
      idAdmin
    ],
    (err) => {

      if (err) {

        console.error(
          'Error update profil admin:',
          err
        );


        // Username kemungkinan sudah digunakan
        if (
          err.code === 'ER_DUP_ENTRY'
        ) {

          return res.json({
            success: false,
            message: 'Username sudah digunakan admin lain.'
          });

        }


        return res.status(500).json({
          success: false,
          message: 'Gagal menyimpan perubahan profil.'
        });

      }


      // ==================================================
      // UPDATE SESSION
      // ==================================================

      req.session.user.nama_admin =
        nama_admin.trim();

      req.session.user.username =
        username.trim();

      req.session.user.nomor_wa =
        nomor_wa
          ? nomor_wa.trim()
          : '';


      return res.json({
        success: true,
        message: 'Profil admin berhasil diperbarui.'
      });

    }
  );

};


// ======================================================
// UBAH PASSWORD AKUN SENDIRI
// ======================================================

exports.updatePassword = async (req, res) => {

  const idAdmin = req.session.user.id;

  const {
    password_lama,
    password_baru,
    konfirmasi_password
  } = req.body;


  // ==================================================
  // VALIDASI KOLOM
  // ==================================================

  if (
    !password_lama ||
    !password_baru ||
    !konfirmasi_password
  ) {

    return res.json({
      success: false,
      message: 'Semua kolom password wajib diisi.'
    });

  }


  // ==================================================
  // VALIDASI PASSWORD BARU
  // ==================================================

  if (
    password_baru !== konfirmasi_password
  ) {

    return res.json({
      success: false,
      message: 'Konfirmasi password baru tidak sesuai.'
    });

  }


  // ==================================================
  // VALIDASI PANJANG PASSWORD
  // ==================================================

  if (
    password_baru.length < 6
  ) {

    return res.json({
      success: false,
      message: 'Password baru minimal 6 karakter.'
    });

  }


  try {

    // ==================================================
    // AMBIL PASSWORD LAMA
    // ==================================================

    const query = `
      SELECT password
      FROM admin
      WHERE id_admin = ?
    `;


    db.query(
      query,
      [idAdmin],
      async (err, result) => {

        if (err) {

          console.error(
            'Error mengambil password:',
            err
          );

          return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server.'
          });

        }


        if (
          !result ||
          result.length === 0
        ) {

          return res.status(404).json({
            success: false,
            message: 'Data admin tidak ditemukan.'
          });

        }


        // ==================================================
        // CEK PASSWORD LAMA
        // ==================================================

        const passwordCocok =
          await bcrypt.compare(
            password_lama,
            result[0].password
          );


        if (!passwordCocok) {

          return res.json({
            success: false,
            message: 'Password lama salah.'
          });

        }


        // ==================================================
        // HASH PASSWORD BARU
        // ==================================================

        const passwordHash =
          await bcrypt.hash(
            password_baru,
            10
          );


        // ==================================================
        // UPDATE PASSWORD
        // ==================================================

        const updateQuery = `
          UPDATE admin
          SET password = ?
          WHERE id_admin = ?
        `;


        db.query(
          updateQuery,
          [
            passwordHash,
            idAdmin
          ],
          (updateErr) => {

            if (updateErr) {

              console.error(
                'Error update password:',
                updateErr
              );

              return res.status(500).json({
                success: false,
                message: 'Gagal mengubah password.'
              });

            }


            return res.json({
              success: true,
              message: 'Password berhasil diubah.'
            });

          }
        );

      }
    );

  } catch (error) {

    console.error(
      'Error ubah password:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengubah password.'
    });

  }

};


// ======================================================
// HALAMAN MANAJEMEN ADMIN
// ======================================================

exports.manajemenAdmin = (req, res) => {

  const idAdminLogin =
    req.session.user.id;


  const query = `
    SELECT
      id_admin,
      username,
      nama_admin,
      nomor_wa,
      created_at
    FROM admin
    ORDER BY id_admin ASC
  `;


  db.query(
    query,
    (err, results) => {

      if (err) {

        console.error(
          'Error mengambil data admin:',
          err
        );

        return res.status(500).send(
          'Gagal mengambil data admin.'
        );

      }


      res.render('setting/admin', {
        admins: results || [],
        idAdminLogin: idAdminLogin,
        activePage: 'setting'
      });

    }
  );

};


// ======================================================
// TAMBAH ADMIN
// ======================================================

exports.tambahAdmin = async (req, res) => {

  const {
    nama_admin,
    username,
    password,
    nomor_wa
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (
    !nama_admin ||
    !username ||
    !password
  ) {

    return res.json({
      success: false,
      message: 'Nama admin, username, dan password wajib diisi.'
    });

  }


  if (
    password.length < 6
  ) {

    return res.json({
      success: false,
      message: 'Password minimal 6 karakter.'
    });

  }


  try {

    // ==================================================
    // CEK USERNAME
    // ==================================================

    const cekQuery = `
      SELECT id_admin
      FROM admin
      WHERE username = ?
    `;


    db.query(
      cekQuery,
      [username.trim()],
      async (cekErr, result) => {

        if (cekErr) {

          console.error(
            'Error cek username admin:',
            cekErr
          );

          return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server.'
          });

        }


        if (
          result &&
          result.length > 0
        ) {

          return res.json({
            success: false,
            message: 'Username sudah digunakan.'
          });

        }


        // ==================================================
        // HASH PASSWORD
        // ==================================================

        const passwordHash =
          await bcrypt.hash(
            password,
            10
          );


        // ==================================================
        // INSERT ADMIN
        // ==================================================

        const insertQuery = `
          INSERT INTO admin
          (
            username,
            password,
            nama_admin,
            nomor_wa
          )
          VALUES (?, ?, ?, ?)
        `;


        db.query(
          insertQuery,
          [
            username.trim(),
            passwordHash,
            nama_admin.trim(),
            nomor_wa
              ? nomor_wa.trim()
              : null
          ],
          (insertErr) => {

            if (insertErr) {

              console.error(
                'Error tambah admin:',
                insertErr
              );

              return res.status(500).json({
                success: false,
                message: 'Gagal menambahkan admin.'
              });

            }


            return res.json({
              success: true,
              message: 'Admin berhasil ditambahkan.'
            });

          }
        );

      }
    );

  } catch (error) {

    console.error(
      'Error tambah admin:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menambahkan admin.'
    });

  }

};


// ======================================================
// EDIT ADMIN
// ======================================================

exports.editAdmin = (req, res) => {

  const idAdmin =
    req.params.id;


  const {
    nama_admin,
    username,
    nomor_wa
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (
    !nama_admin ||
    !username
  ) {

    return res.json({
      success: false,
      message: 'Nama admin dan username wajib diisi.'
    });

  }


  const query = `
    UPDATE admin
    SET
      nama_admin = ?,
      username = ?,
      nomor_wa = ?
    WHERE id_admin = ?
  `;


  db.query(
    query,
    [
      nama_admin.trim(),
      username.trim(),
      nomor_wa
        ? nomor_wa.trim()
        : null,
      idAdmin
    ],
    (err) => {

      if (err) {

        console.error(
          'Error edit admin:',
          err
        );


        if (
          err.code === 'ER_DUP_ENTRY'
        ) {

          return res.json({
            success: false,
            message: 'Username sudah digunakan.'
          });

        }


        return res.status(500).json({
          success: false,
          message: 'Gagal mengubah data admin.'
        });

      }


      return res.json({
        success: true,
        message: 'Data admin berhasil diperbarui.'
      });

    }
  );

};


// ======================================================
// HAPUS ADMIN
// ======================================================

exports.hapusAdmin = (req, res) => {

  const idAdmin =
    Number(req.params.id);


  const idAdminLogin =
    Number(req.session.user.id);


  // ==================================================
  // CEGAH HAPUS AKUN SENDIRI
  // ==================================================

  if (
    idAdmin === idAdminLogin
  ) {

    return res.json({
      success: false,
      message: 'Akun yang sedang digunakan tidak dapat dihapus.'
    });

  }


  const query = `
    DELETE FROM admin
    WHERE id_admin = ?
  `;


  db.query(
    query,
    [idAdmin],
    (err, result) => {

      if (err) {

        console.error(
          'Error hapus admin:',
          err
        );

        return res.status(500).json({
          success: false,
          message: 'Gagal menghapus admin.'
        });

      }


      if (
        result.affectedRows === 0
      ) {

        return res.json({
          success: false,
          message: 'Admin tidak ditemukan.'
        });

      }


      return res.json({
        success: true,
        message: 'Admin berhasil dihapus.'
      });

    }
  );

};


// ======================================================
// RESET PASSWORD ADMIN
// ======================================================

exports.resetPasswordAdmin = async (req, res) => {

  const idAdmin =
    Number(req.params.id);


  const {
    password_baru,
    konfirmasi_password
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (
    !password_baru ||
    !konfirmasi_password
  ) {

    return res.json({
      success: false,
      message: 'Password baru dan konfirmasi password wajib diisi.'
    });

  }


  if (
    password_baru !== konfirmasi_password
  ) {

    return res.json({
      success: false,
      message: 'Konfirmasi password tidak sesuai.'
    });

  }


  if (
    password_baru.length < 6
  ) {

    return res.json({
      success: false,
      message: 'Password minimal 6 karakter.'
    });

  }


  try {

    // ==================================================
    // HASH PASSWORD
    // ==================================================

    const passwordHash =
      await bcrypt.hash(
        password_baru,
        10
      );


    // ==================================================
    // UPDATE PASSWORD
    // ==================================================

    const query = `
      UPDATE admin
      SET password = ?
      WHERE id_admin = ?
    `;


    db.query(
      query,
      [
        passwordHash,
        idAdmin
      ],
      (err, result) => {

        if (err) {

          console.error(
            'Error reset password admin:',
            err
          );

          return res.status(500).json({
            success: false,
            message: 'Gagal mereset password admin.'
          });

        }


        if (
          result.affectedRows === 0
        ) {

          return res.json({
            success: false,
            message: 'Admin tidak ditemukan.'
          });

        }


        return res.json({
          success: true,
          message: 'Password admin berhasil direset.'
        });

      }
    );

  } catch (error) {

    console.error(
      'Error reset password admin:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mereset password admin.'
    });

  }

};