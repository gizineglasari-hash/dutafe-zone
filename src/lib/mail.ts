import nodemailer from "nodemailer";

// ------------------------------------------------------------
// Pengirim email (untuk fitur "Lupa Password" FE-ZONE)
//
// Menggunakan SMTP Gmail. Kredensial TIDAK pernah ditulis di kode —
// semuanya diambil dari Environment Variables di Vercel:
//   SMTP_EMAIL        -> alamat Gmail pengirim (mis. dutafezone@gmail.com)
//   SMTP_APP_PASSWORD -> App Password Gmail 16 huruf (bukan password biasa!)
//   SMTP_HOST         -> opsional (default smtp.gmail.com)
//   SMTP_PORT         -> opsional (default 465)
//
// Jika variabel di atas belum diisi, isMailConfigured() = false dan
// halaman lupa password otomatis menampilkan panduan alternatif
// (hubungi pengelola / reset lewat panel admin) — tanpa error.
// ------------------------------------------------------------

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_EMAIL && process.env.SMTP_APP_PASSWORD);
}

function getTransporter() {
  if (!isMailConfigured()) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: true, // port 465 = TLS langsung
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_APP_PASSWORD,
    },
  });
}

const BRAND = "FE-ZONE — Duta Remaja Putri Bebas Anemia";

export async function sendResetPasswordMail(to: string, name: string, resetUrl: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) throw new Error("SMTP_NOT_CONFIGURED");

  const sapaan = name ? `Halo ${name}!` : "Halo Pejuang Fe-Zone!";

  await transporter.sendMail({
    from: `"FE-ZONE" <${process.env.SMTP_EMAIL}>`,
    to,
    subject: "🔑 Reset Password FE-ZONE",
    text: [
      sapaan,
      "",
      "Kami menerima permintaan untuk mengatur ulang password akun FE-ZONE kamu.",
      "Klik tautan di bawah ini untuk membuat password baru:",
      resetUrl,
      "",
      "Tautan berlaku 1 jam dan hanya bisa dipakai satu kali.",
      "Jangan bagikan tautan ini ke siapa pun (termasuk yang mengaku petugas).",
      "",
      "Kalau kamu tidak merasa meminta reset, abaikan email ini — password kamu tetap aman.",
      "",
      `— ${BRAND} · Dinas Kesehatan Kota Bandung`,
    ].join("\n"),
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;background:#fff7f3;border-radius:16px;border:2px solid #4a1d33;overflow:hidden">
        <div style="background:linear-gradient(90deg,#f43f5e,#fb923c);padding:20px 24px;text-align:center">
          <span style="display:inline-block;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:1px">🩸 FE-ZONE</span>
          <div style="color:#ffe4e6;font-size:12px;font-weight:600;margin-top:2px">Duta Remaja Putri Bebas Anemia</div>
        </div>
        <div style="padding:24px;color:#4a1d33">
          <p style="margin:0 0 8px;font-size:16px;font-weight:800">${sapaan}</p>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6">
            Kami menerima permintaan untuk <b>mengatur ulang password</b> akun FE-ZONE kamu.
            Tekan tombol di bawah ini untuk membuat password baru:
          </p>
          <p style="text-align:center;margin:20px 0">
            <a href="${resetUrl}"
               style="display:inline-block;background:#f43f5e;color:#ffffff;font-weight:800;font-size:15px;
                      padding:13px 28px;border-radius:14px;border:2px solid #4a1d33;text-decoration:none;
                      box-shadow:3px 3px 0 #4a1d33">
              🔑 Reset Password Sekarang
            </a>
          </p>
          <p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#7a4a5e">
            Jika tombol tidak berfungsi, salin dan tempel tautan ini ke browser:
          </p>
          <p style="margin:0 0 16px;font-size:12px;word-break:break-all">
            <a href="${resetUrl}" style="color:#e11d48">${resetUrl}</a>
          </p>
          <div style="background:#fff;border:2px solid #4a1d33;border-radius:12px;padding:12px 14px;font-size:12px;line-height:1.6">
            <p style="margin:0"><b>⏳ Berlaku 1 jam</b> dan hanya bisa dipakai <b>satu kali</b>.</p>
            <p style="margin:6px 0 0">🛡️ Jangan bagikan tautan ini ke siapa pun, termasuk yang mengaku petugas.
            Kalau kamu tidak merasa meminta reset, abaikan email ini — password kamu tetap aman.</p>
          </div>
        </div>
        <div style="background:#fdf2f4;padding:12px 24px;text-align:center;font-size:11px;color:#9f6a7d">
          ${BRAND} · Dinas Kesehatan Kota Bandung
        </div>
      </div>
    `,
  });
}
