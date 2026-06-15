/**
 * Remove todas as figurinhas do sistema de ban
 *
 * @path src/commands/admin/fig-ban-clear.js
 * @author Val (DeadBoT)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PREFIX } from "../../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../../database/fig-ban.json");

export default {
  name: "fig-ban-clear",
  description: "Remove todas as figurinhas do sistema de ban",
  commands: ["fig-ban-clear"],
  usage: `${PREFIX}fig-ban-clear`,

  handle: async ({ sendReply, sendErrorReply, remoteJid, userJid, socket }) => {
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

    fs.writeFileSync(DB_PATH, JSON.stringify({ stickers: [] }, null, 2));
    return sendReply("✅ Todas as figurinhas foram removidas do banco de ban.");
  },
};
