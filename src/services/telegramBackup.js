// ================================================================
// 🤖 DEADBOT - TELEGRAM BACKUP SERVICE (ESM)
// Arquivo: src/services/telegramBackup.js
// ================================================================

import https from "https";
import fs from "fs";

const TELEGRAM_TOKEN = "8332041897:AAFmMaKpVc5M8cx39rdnPcKnPMvxnMKcO2g";
const TELEGRAM_CHAT_ID = "7166593751";

export async function enviarBackupTelegram(info, backupFilePath) {
  try {
    if (!fs.existsSync(backupFilePath)) {
      console.error("❌ [TelegramBackup] Arquivo não encontrado:", backupFilePath);
      return;
    }

    const fileBuffer = fs.readFileSync(backupFilePath);
    const boundary = "DeadBotBoundary" + Date.now().toString(16);
    const CRLF = "\r\n";

    const caption =
      `🛡️ DEADBOT - AUTO-BACKUP\n\n` +
      `📦 Arquivo: ${info.filename}\n` +
      `🕐 Gerado em: ${info.timestamp}\n` +
      `💾 Tamanho: ${info.size}\n` +
      `📁 Backups salvos: ${info.total}/1`;

    const part1 = Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="chat_id"${CRLF}${CRLF}` +
      `${TELEGRAM_CHAT_ID}${CRLF}`
    );

    const part2 = Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="caption"${CRLF}${CRLF}` +
      `${caption}${CRLF}`
    );

    const part3Header = Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="document"; filename="${info.filename}"${CRLF}` +
      `Content-Type: application/gzip${CRLF}${CRLF}`
    );

    const part3Footer = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);

    const body = Buffer.concat([part1, part2, part3Header, fileBuffer, part3Footer]);

    await new Promise((resolve, reject) => {
      const options = {
        hostname: "api.telegram.org",
        path: `/bot${TELEGRAM_TOKEN}/sendDocument`,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const result = JSON.parse(data);
            if (result.ok) {
              console.log("📨 [TelegramBackup] Arquivo enviado no Telegram com sucesso!");
              resolve(result);
            } else {
              console.error("❌ [TelegramBackup] Erro da API:", result.description);
              reject(new Error(result.description));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", reject);
      req.write(body);
      req.end();
    });

  } catch (e) {
    console.error("❌ [TelegramBackup] Falha:", e.message);
  }
}
