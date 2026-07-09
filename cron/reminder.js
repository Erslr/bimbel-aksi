const {
  getReminderH3,
  tandaiWaTerkirim
} = require('../services/reminderPembayaran');

async function runReminder() {
  try {
    console.log('⏰ Menjalankan reminder pembayaran (H-0 s/d H-3)...');

    const data = await getReminderH3();

    if (data.length === 0) {
      console.log('✅ Tidak ada reminder hari ini');
      return;
    }

    for (const s of data) {
      console.log(
        `📲 Reminder: ${s.nama_lengkap} | Jatuh tempo: ${new Date(s.tanggal_tagihan).toLocaleDateString('id-ID')}`
      );

      // 🚧 nanti: kirim WA via API
      // sekarang: tandai dulu
      await tandaiWaTerkirim(s.id_pembayaran);

      console.log(`✅ wa_terkirim di-set untuk ID ${s.id_pembayaran}`);
    }

  } catch (err) {
    console.error('❌ Error cron reminder:', err);
  }
}

runReminder();
