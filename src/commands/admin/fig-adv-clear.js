/**
 * Remove todas as figurinhas do sistema de advertência
 *
 * @path src/commands/admin/fig-adv-clear.js
 * @author Val (DeadBoT)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PREFIX } from "../../config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../../database/fig-adv.json");

export default {
  name: "fig-adv-clear",
  description: "Remove todas as figurinhas do sistema de advertência",
  commands: ["fig-adv-clear"],
  usage: `${PREFIX}fig-adv-clear`,

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
    return sendReply("✅ Todas as figurinhas de advertência foram removidas do banco!");
  },
};
