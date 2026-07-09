const bcrypt = require('bcrypt');
const db = require('../config/database');

// ==========================
// HALAMAN LOGIN
// ==========================
exports.showLogin = (req, res) => {

  const errorMessage = req.session.loginError || null;

  // Hapus error setelah ditampilkan sekali
  req.session.loginError = null;

  res.render('login', {
    error: errorMessage
  });

};

// ==========================
// PROSES LOGIN ADMIN
// ==========================
exports.login = (req, res) => {

  const { username, password } = req.body;

  const query = `
    SELECT id_admin, username, password, nomor_wa
    FROM admin
    WHERE username = ?
  `;

  db.query(query, [username], async (err, result) => {

    if (err) {

      console.error(err);

      req.session.loginError = "Terjadi kesalahan server";
      return res.redirect("/login");

    }

    if (result.length === 0) {

      req.session.loginError = "Username tidak ditemukan";
      return res.redirect("/login");

    }

    const admin = result[0];

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {

      req.session.loginError = "Password salah";
      return res.redirect("/login");

    }

    req.session.user = {
      id: admin.id_admin,
      username: admin.username,
      nomor_wa: admin.nomor_wa || ''
    };

    res.redirect("/dashboard");

  });

};

// ==========================
// LOGOUT
// ==========================
exports.logout = (req, res) => {

  req.session.destroy(err => {

    if (err) {

      console.error(err);
      return res.send("Gagal logout");

    }

    res.clearCookie('connect.sid');

    res.redirect("/login");

  });

};