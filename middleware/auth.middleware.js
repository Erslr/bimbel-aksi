// =====================================
// Middleware Autentikasi
// Digunakan untuk melindungi halaman admin
// =====================================

module.exports = (req, res, next) => {

  // ==================================================
  // CEK APAKAH USER SUDAH LOGIN
  // ==================================================

  if (req.session && req.session.user) {

    return next();

  }


  // ==================================================
  // JIKA REQUEST MENGHARAPKAN JSON
  // JANGAN REDIRECT KE LOGIN
  // ==================================================

  const wantsJSON =
    req.headers.accept &&
    req.headers.accept.includes('application/json');


  if (wantsJSON) {

    return res.status(401).json({
      success: false,
      message: 'Sesi login telah berakhir. Silakan login kembali.'
    });

  }


  // ==================================================
  // REQUEST HALAMAN BIASA
  // TETAP REDIRECT KE LOGIN
  // ==================================================

  return res.redirect('/login');

};