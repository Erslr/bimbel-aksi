const db = require('../config/database');

// =============================
// AMBIL NOTIFIKASI YANG BELUM DIBACA
// =============================
exports.getNotif = (req, res) => {

    db.query(
        `SELECT *
         FROM notifikasi
         WHERE dibaca = 0
         ORDER BY id_notif DESC`,
        (err, result) => {

            if (err) {
                console.error(err);
                return res.json([]);
            }

            res.json(result);

        }
    );

};

// =============================
// TANDAI SUDAH DIBACA
// =============================
exports.readNotif = (req, res) => {

    db.query(
        `UPDATE notifikasi
         SET dibaca = 1
         WHERE dibaca = 0`,
        (err) => {

            if (err) {
                console.error(err);
                return res.json({
                    success: false
                });
            }

            res.json({
                success: true
            });

        }
    );

};