// =====================================
// Middleware Autentikasi
// Digunakan untuk melindungi halaman admin
// =====================================

module.exports = (req, res, next) => {
  // Cek apakah user sudah login
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect('/login');
  }
};
