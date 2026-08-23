const bcrypt = require('bcrypt');
const db = require('../config/database');

// ==========================================
// HALAMAN SETTING
// ==========================================

exports.index = (req, res) => {

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

  db.query(query, [idAdmin], (err, result) => {

    if (err) {

      console.error('Error mengambil data admin:', err);

      return res.status(500).send(
        'Gagal mengambil data admin.'
      );

    }

    if (!result || result.length === 0) {

      return res.status(404).send(
        'Data admin tidak ditemukan.'
      );

    }

    res.render('setting', {
        admin: result[0],
        activePage: 'setting'
    });

  });

};


// ==========================================
// UPDATE PROFIL ADMIN
// ==========================================

exports.updateProfil = (req, res) => {

  const idAdmin = req.session.user.id;

  const {
    nama_admin,
    username,
    nomor_wa
  } = req.body;

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
      nama_admin,
      username,
      nomor_wa || null,
      idAdmin
    ],
    (err) => {

      if (err) {

        console.error(
          'Error update profil admin:',
          err
        );

        return res.status(500).json({
          success: false,
          message: 'Gagal menyimpan perubahan profil.'
        });

      }

      // Update session agar nama/username langsung berubah
      req.session.user.nama_admin =
        nama_admin;

      req.session.user.username =
        username;

      req.session.user.nomor_wa =
        nomor_wa || '';

      return res.json({
        success: true,
        message: 'Profil admin berhasil diperbarui.'
      });

    }
  );

};


// ==========================================
// UBAH PASSWORD
// ==========================================

exports.updatePassword = async (req, res) => {

  const idAdmin = req.session.user.id;

  const {
    password_lama,
    password_baru,
    konfirmasi_password
  } = req.body;


  // ========================================
  // CEK PASSWORD BARU
  // ========================================

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


  // ========================================
  // CEK KONFIRMASI PASSWORD
  // ========================================

  if (
    password_baru !== konfirmasi_password
  ) {

    return res.json({
      success: false,
      message: 'Konfirmasi password baru tidak sesuai.'
    });

  }


  try {

    // ======================================
    // AMBIL PASSWORD LAMA DARI DATABASE
    // ======================================

    const query =
      `SELECT password FROM admin WHERE id_admin = ?`;

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


        // ==================================
        // CEK PASSWORD LAMA
        // ==================================

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


        // ==================================
        // HASH PASSWORD BARU
        // ==================================

        const passwordHash =
          await bcrypt.hash(
            password_baru,
            10
          );


        // ==================================
        // SIMPAN PASSWORD BARU
        // ==================================

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