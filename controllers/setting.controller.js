const bcrypt = require('bcrypt');
const db = require('../config/database');


// ======================================================
// HALAMAN UTAMA SETTING
// ======================================================

exports.index = (req, res) => {

  res.render('setting/index', {
    activePage: 'setting',
    user: req.session.user
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

  console.log('===== UPDATE PROFIL =====');
  console.log('SESSION USER:', req.session.user);
  console.log('BODY:', req.body);

  const idAdmin = req.session.user.id;

  console.log('ID ADMIN:', idAdmin);

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

  console.log('===== UPDATE PASSWORD =====');
  console.log('SESSION USER:', req.session.user);
  console.log('BODY:', req.body);

  const idAdmin = req.session.user.id;

  console.log('ID ADMIN:', idAdmin);

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

  // ====================================================
  // CEK LOGIN
  // ====================================================

  if (!req.session.user) {

    return res.status(401).send(
      'Silakan login terlebih dahulu.'
    );

  }


  // ====================================================
  // CEK ROLE ADMIN UTAMA
  // ====================================================

  if (req.session.user.role !== 'utama') {

    return res.status(403).send(
      'Akses ditolak. Hanya Admin Utama yang dapat mengakses Manajemen Admin.'
    );

  }


  // ====================================================
  // ID ADMIN YANG SEDANG LOGIN
  // ====================================================

  const idAdminLogin =
    Number(req.session.user.id);


  // ====================================================
  // QUERY DATA ADMIN
  // ====================================================

  const query = `
    SELECT
      id_admin,
      username,
      nama_admin,
      nomor_wa,
      role
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


      // ==================================================
      // AMBIL ADMIN YANG SEDANG ONLINE
      // ==================================================

      const onlineAdmins =
        req.app.locals.onlineAdmins || new Map();


      // ==================================================
      // TAMBAHKAN STATUS ONLINE KE DATA ADMIN
      // ==================================================

      const admins =
        (results || []).map(admin => {

          const idAdmin =
            Number(admin.id_admin);


          return {

            ...admin,

            online:
              onlineAdmins.has(idAdmin)

          };

        });


      // ==================================================
      // RENDER HALAMAN
      // ==================================================

      return res.render(
        'setting/admin',
        {

          admins,

          idAdminLogin,

          activePage: 'setting'

        }
      );

    }
  );

};



// ======================================================
// TAMBAH ADMIN
// ======================================================

exports.tambahAdmin = async (req, res) => {

  // ====================================================
  // CEK LOGIN
  // ====================================================

  if (!req.session.user) {

    return res.status(401).json({

      success: false,

      message:
        'Silakan login terlebih dahulu.'

    });

  }


  // ====================================================
  // HANYA ADMIN UTAMA
  // ====================================================

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({

      success: false,

      message:
        'Akses ditolak. Hanya Admin Utama yang dapat menambahkan admin.'

    });

  }


  // ====================================================
  // AMBIL DATA FORM
  // ====================================================

  const {
    nama_admin,
    username,
    nomor_wa,
    role,
    password
  } = req.body;


  // ====================================================
  // ROLE DEFAULT
  // ====================================================
  // Kalau form tambah admin belum mengirim role,
  // otomatis dianggap sebagai admin biasa.

  const roleAdmin =
    role && role.trim()
      ? role.trim()
      : 'admin';


  // ====================================================
  // VALIDASI
  // ====================================================

  if (
    !nama_admin ||
    !nama_admin.trim() ||
    !username ||
    !username.trim() ||
    !password
  ) {

    return res.json({

      success: false,

      message:
        'Nama admin, username, dan password wajib diisi.'

    });

  }


  // ====================================================
  // VALIDASI PASSWORD
  // ====================================================

  if (password.length < 6) {

    return res.json({

      success: false,

      message:
        'Password minimal 6 karakter.'

    });

  }


  try {

    // ==================================================
    // CEK USERNAME
    // ==================================================

    const checkQuery = `
      SELECT
        id_admin
      FROM admin
      WHERE username = ?
    `;


    db.query(
      checkQuery,
      [username.trim()],
      async (checkErr, result) => {

        if (checkErr) {

          console.error(
            'Error cek username admin:',
            checkErr
          );

          return res.status(500).json({

            success: false,

            message:
              'Terjadi kesalahan server.'

          });

        }


        // ==============================================
        // USERNAME SUDAH ADA
        // ==============================================

        if (result.length > 0) {

          return res.json({

            success: false,

            message:
              'Username sudah digunakan admin lain.'

          });

        }


        // ==============================================
        // HASH PASSWORD
        // ==============================================

        const passwordHash =
          await bcrypt.hash(
            password,
            10
          );


        // ==============================================
        // INSERT ADMIN
        // ==============================================

        const insertQuery = `
          INSERT INTO admin
          (
            username,
            password,
            nama_admin,
            nomor_wa,
            role
          )
          VALUES (?, ?, ?, ?, ?)
        `;


        db.query(
          insertQuery,
          [

            username.trim(),

            passwordHash,

            nama_admin.trim(),

            nomor_wa
              ? nomor_wa.trim()
              : null,

            roleAdmin

          ],
          (insertErr) => {

            if (insertErr) {

              console.error(
                'Error tambah admin:',
                insertErr
              );

              return res.status(500).json({

                success: false,

                message:
                  'Gagal menambahkan admin.'

              });

            }


            // ==========================================
            // BERHASIL
            // ==========================================

            return res.json({

              success: true,

              message:
                'Admin berhasil ditambahkan.'

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

      message:
        'Terjadi kesalahan saat menambahkan admin.'

    });

  }

};



// ======================================================
// EDIT ADMIN
// ======================================================

exports.editAdmin = (req, res) => {

  // ====================================================
  // CEK LOGIN
  // ====================================================

  if (!req.session.user) {

    return res.status(401).json({

      success: false,

      message:
        'Silakan login terlebih dahulu.'

    });

  }


  // ====================================================
  // CEK ROLE
  // ====================================================

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({

      success: false,

      message:
        'Akses ditolak. Hanya Admin Utama yang dapat mengedit admin.'

    });

  }


  const idAdmin =
    Number(req.params.id);


  const {
    nama_admin,
    username,
    nomor_wa
  } = req.body;


  // ====================================================
  // VALIDASI ID
  // ====================================================

  if (!idAdmin) {

    return res.status(400).json({

      success: false,

      message:
        'ID admin tidak valid.'

    });

  }


  // ====================================================
  // VALIDASI DATA
  // ====================================================

  if (
    !nama_admin ||
    !nama_admin.trim() ||
    !username ||
    !username.trim()
  ) {

    return res.json({

      success: false,

      message:
        'Nama admin dan username wajib diisi.'

    });

  }


  // ====================================================
  // CEK USERNAME
  // ====================================================

  const checkQuery = `
    SELECT
      id_admin
    FROM admin
    WHERE username = ?
      AND id_admin != ?
  `;


  db.query(
    checkQuery,
    [
      username.trim(),
      idAdmin
    ],
    (checkErr, result) => {

      if (checkErr) {

        console.error(
          'Error cek username saat edit admin:',
          checkErr
        );

        return res.status(500).json({

          success: false,

          message:
            'Terjadi kesalahan server.'

        });

      }


      // ================================================
      // USERNAME SUDAH DIGUNAKAN
      // ================================================

      if (result.length > 0) {

        return res.json({

          success: false,

          message:
            'Username sudah digunakan admin lain.'

        });

      }


      // ================================================
      // UPDATE DATA ADMIN
      // ================================================

      const updateQuery = `
        UPDATE admin
        SET
          nama_admin = ?,
          username = ?,
          nomor_wa = ?
        WHERE id_admin = ?
      `;


      db.query(
        updateQuery,
        [

          nama_admin.trim(),

          username.trim(),

          nomor_wa
            ? nomor_wa.trim()
            : null,

          idAdmin

        ],
        (updateErr) => {

          if (updateErr) {

            console.error(
              'Error edit admin:',
              updateErr
            );

            return res.status(500).json({

              success: false,

              message:
                'Gagal memperbarui data admin.'

            });

          }


          return res.json({

            success: true,

            message:
              'Data admin berhasil diperbarui.'

          });

        }
      );

    }
  );

};



// ======================================================
// RESET PASSWORD ADMIN
// ======================================================

exports.resetPasswordAdmin = async (req, res) => {

  // ====================================================
  // CEK LOGIN
  // ====================================================

  if (!req.session.user) {

    return res.status(401).json({

      success: false,

      message:
        'Silakan login terlebih dahulu.'

    });

  }


  // ====================================================
  // CEK ROLE
  // ====================================================

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({

      success: false,

      message:
        'Akses ditolak. Hanya Admin Utama yang dapat mereset password admin.'

    });

  }


  const idAdmin =
    Number(req.params.id);


  const {
    password_baru,
    konfirmasi_password
  } = req.body;


  // ====================================================
  // VALIDASI
  // ====================================================

  if (!idAdmin) {

    return res.status(400).json({

      success: false,

      message:
        'ID admin tidak valid.'

    });

  }


  if (!password_baru) {

    return res.json({

      success: false,

      message:
        'Password baru wajib diisi.'

    });

  }


  if (password_baru.length < 6) {

    return res.json({

      success: false,

      message:
        'Password minimal 6 karakter.'

    });

  }


  if (
    password_baru !==
    konfirmasi_password
  ) {

    return res.json({

      success: false,

      message:
        'Konfirmasi password tidak sesuai.'

    });

  }


  try {

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
      (err, result) => {

        if (err) {

          console.error(
            'Error reset password admin:',
            err
          );

          return res.status(500).json({

            success: false,

            message:
              'Gagal mengubah password admin.'

          });

        }


        if (
          result.affectedRows === 0
        ) {

          return res.json({

            success: false,

            message:
              'Admin tidak ditemukan.'

          });

        }


        return res.json({

          success: true,

          message:
            'Password admin berhasil diubah.'

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

      message:
        'Terjadi kesalahan saat mereset password admin.'

    });

  }

};



// ======================================================
// HAPUS ADMIN
// ======================================================

exports.hapusAdmin = (req, res) => {

  // ====================================================
  // CEK LOGIN
  // ====================================================

  if (!req.session.user) {

    return res.status(401).json({

      success: false,

      message:
        'Silakan login terlebih dahulu.'

    });

  }


  // ====================================================
  // CEK ROLE
  // ====================================================

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({

      success: false,

      message:
        'Akses ditolak. Hanya Admin Utama yang dapat menghapus admin.'

    });

  }


  const idAdmin =
    Number(req.params.id);


  const idAdminLogin =
    Number(req.session.user.id);


  // ====================================================
  // VALIDASI ID
  // ====================================================

  if (!idAdmin) {

    return res.status(400).json({

      success: false,

      message:
        'ID admin tidak valid.'

    });

  }


  // ====================================================
  // ADMIN TIDAK BOLEH MENGHAPUS DIRI SENDIRI
  // ====================================================

  if (
    idAdmin ===
    idAdminLogin
  ) {

    return res.status(403).json({

      success: false,

      message:
        'Akun yang sedang digunakan tidak dapat dihapus.'

    });

  }


  // ====================================================
  // HAPUS ADMIN
  // ====================================================

  const deleteQuery = `
    DELETE FROM admin
    WHERE id_admin = ?
  `;


  db.query(
    deleteQuery,
    [idAdmin],
    (err, result) => {

      if (err) {

        console.error(
          'Error hapus admin:',
          err
        );

        return res.status(500).json({

          success: false,

          message:
            'Gagal menghapus admin.'

        });

      }


      if (
        result.affectedRows === 0
      ) {

        return res.json({

          success: false,

          message:
            'Admin tidak ditemukan.'

        });

      }


      // ==================================================
      // HAPUS DARI DAFTAR ONLINE
      // ==================================================

      const onlineAdmins =
        req.app.locals.onlineAdmins;


      if (onlineAdmins) {

        onlineAdmins.delete(idAdmin);

      }


      return res.json({

        success: true,

        message:
          'Admin berhasil dihapus.'

      });

    }
  );

};

// ======================================================
// TAMBAH ADMIN
// ======================================================

exports.tambahAdmin = async (req, res) => {

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak. Hanya Admin Utama yang dapat menambahkan admin.'
    });

  }

  const {
    nama_admin,
    username,
    nomor_wa,
    role,
    password
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (
    !nama_admin ||
    !username ||
    !password ||
    !role
  ) {

    return res.json({
      success: false,
      message: 'Nama admin, username, password, dan role wajib diisi.'
    });

  }


  if (password.length < 6) {

    return res.json({
      success: false,
      message: 'Password minimal 6 karakter.'
    });

  }


  try {

    // ==================================================
    // CEK USERNAME
    // ==================================================

    const checkQuery = `
      SELECT id_admin
      FROM admin
      WHERE username = ?
    `;

    db.query(
      checkQuery,
      [username.trim()],
      async (checkErr, result) => {

        if (checkErr) {

          console.error(
            'Error cek username admin:',
            checkErr
          );

          return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan server.'
          });

        }


        if (result.length > 0) {

          return res.json({
            success: false,
            message: 'Username sudah digunakan admin lain.'
          });

        }


        // ==================================================
        // HASH PASSWORD
        // ==================================================

        const passwordHash =
          await bcrypt.hash(password, 10);


        // ==================================================
        // INSERT ADMIN
        // ==================================================

        const insertQuery = `
          INSERT INTO admin
          (
            username,
            password,
            nama_admin,
            nomor_wa,
            role
          )
          VALUES (?, ?, ?, ?, ?)
        `;


        db.query(
          insertQuery,
          [
            username.trim(),
            passwordHash,
            nama_admin.trim(),
            nomor_wa
              ? nomor_wa.trim()
              : null,
            role
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

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak.'
    });

  }


  const idAdmin = req.params.id;

  const {
    nama_admin,
    username,
    nomor_wa,
    role
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (
    !nama_admin ||
    !username ||
    !role
  ) {

    return res.json({
      success: false,
      message: 'Nama admin, username, dan role wajib diisi.'
    });

  }


  const checkQuery = `
    SELECT id_admin
    FROM admin
    WHERE username = ?
      AND id_admin != ?
  `;


  db.query(
    checkQuery,
    [
      username.trim(),
      idAdmin
    ],
    (checkErr, result) => {

      if (checkErr) {

        console.error(
          'Error cek username admin:',
          checkErr
        );

        return res.status(500).json({
          success: false,
          message: 'Terjadi kesalahan server.'
        });

      }


      if (result.length > 0) {

        return res.json({
          success: false,
          message: 'Username sudah digunakan admin lain.'
        });

      }


      // ==================================================
      // UPDATE ADMIN
      // ==================================================

      const updateQuery = `
        UPDATE admin
        SET
          nama_admin = ?,
          username = ?,
          nomor_wa = ?,
          role = ?
        WHERE id_admin = ?
      `;


      db.query(
        updateQuery,
        [
          nama_admin.trim(),
          username.trim(),
          nomor_wa
            ? nomor_wa.trim()
            : null,
          role,
          idAdmin
        ],
        (updateErr) => {

          if (updateErr) {

            console.error(
              'Error edit admin:',
              updateErr
            );

            return res.status(500).json({
              success: false,
              message: 'Gagal menyimpan perubahan admin.'
            });

          }


          return res.json({
            success: true,
            message: 'Data admin berhasil diperbarui.'
          });

        }
      );

    }
  );

};



// ======================================================
// HAPUS ADMIN
// ======================================================

exports.hapusAdmin = (req, res) => {

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak.'
    });

  }


  const idAdmin = Number(req.params.id);

  const idAdminLogin =
    Number(req.session.user.id);


  // ==================================================
  // ADMIN TIDAK BOLEH MENGHAPUS DIRI SENDIRI
  // ==================================================

  if (idAdmin === idAdminLogin) {

    return res.json({
      success: false,
      message: 'Admin yang sedang login tidak dapat dihapus.'
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


      if (result.affectedRows === 0) {

        return res.json({
          success: false,
          message: 'Data admin tidak ditemukan.'
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

  if (req.session.user.role !== 'utama') {

    return res.status(403).json({
      success: false,
      message: 'Akses ditolak.'
    });

  }


  const idAdmin =
    Number(req.params.id);


  const {
    password
  } = req.body;


  // ==================================================
  // VALIDASI
  // ==================================================

  if (!password) {

    return res.json({
      success: false,
      message: 'Password baru wajib diisi.'
    });

  }


  if (password.length < 6) {

    return res.json({
      success: false,
      message: 'Password minimal 6 karakter.'
    });

  }


  try {

    // ==================================================
    // HASH PASSWORD BARU
    // ==================================================

    const passwordHash =
      await bcrypt.hash(
        password,
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


        if (result.affectedRows === 0) {

          return res.json({
            success: false,
            message: 'Data admin tidak ditemukan.'
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
      message: 'Terjadi kesalahan saat mereset password.'
    });

  }

};