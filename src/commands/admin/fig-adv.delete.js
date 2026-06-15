/**
 * Remove uma figurinha específica do sistema de advertência
 *
 * @path src/commands/admin/fig-adv-delete.js
 * @author Val (DeadBoT)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PREFIX } from "../../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../../database/fig-adv.json");

export default {
  name: "fig-adv-delete",
  description: "Remove uma figurinha do sistema de advertência",
  commands: ["fig-adv-delete"],
  usage: `${PREFIX}fig-adv-delete (responda uma figurinha)`,

  handle: async ({ webMessage, sendReply, sendErrorReply, remoteJid, userJid, socket }) => {
    if (!remoteJid?.endsWith("@g.us")) {
      return sendErrorReply("Este comando só pode ser usado em grupos.");
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const isAdmin = metadata.participants.some(
      (p) => (p.id === userJid || p.lid === userJid) && p.admin
    );
    if (!isAdmin) {
      return sendErrorReply("Somente ADMs estão autorizados a usar este comando.");
    }

    const quoted =
      webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage;
    if (!quoted) {
      return sendErrorReply("Responda a uma figurinha para remover do sistema de advertência.");
    }

    const fileSha = quoted.fileSha256;
    if (!fileSha || fileSha.length === 0) {
      return sendErrorReply("Não consegui ler o identificador da figurinha.");
    }

    const numericId = Array.from(Buffer.from(fileSha)).join(",");

    if (!fs.existsSync(DB_PATH)) {
      return sendReply("❌ Nenhuma figurinha cadastrada ainda.");
    }

    let db;
    try { db = JSON.parse(fs.readFileSync(DB_PATH, "utf8")); } catch { db = { stickers: [] }; }
    if (!Array.isArray(db.stickers)) db.stickers = [];

    if (!db.stickers.includes(numericId)) {
      return sendReply("⚠️ Esta figurinha não está no banco de advertências.");
    }

    db.stickers = db.stickers.filter((id) => id !== numericId);
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    return sendReply("✅ Figurinha removida do banco de advertências com sucesso!");
  },
};
