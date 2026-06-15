/**
 * src/commands/owner/mensagem-diaria-clear.js
 *
 * Remove do banco os grupos onde o bot não está mais presente.
 *
 * Uso: /mensagem-diaria-clear
 *
 * @author DeadBoT
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIX } from "../../config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "..", "..", "..", "database", "mensagem-diaria.json");

function loadDB() {
  if (!fs.existsSync(DB_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); } catch { return {}; }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export default {
  name: "mensagem-diaria-clear",
  description: "Remove grupos inativos (forbidden) do banco da mensagem diária",
  commands: ["mensagem-diaria-clear"],
  usage: `${PREFIX}mensagem-diaria-clear`,

  handle: async ({ socket, sendReply, sendSuccessReply }) => {
    await sendReply("🔍 *Verificando grupos da mensagem diária...*\n\nIsso pode levar alguns segundos.");

    const db = loadDB();
    const jids = Object.keys(db);

    if (jids.length === 0) return sendReply("📭 O banco de dados da mensagem diária está vazio.");

    const removidos = [];
    const mantidos = [];

    for (const jid of jids) {
      const nome = db[jid]?.nome || jid;
      try {
        await socket.groupMetadata(jid);
        mantidos.push(nome);
      } catch (err) {
        const motivo = (err?.message || String(err)).toLowerCase();
        if (motivo.includes("forbidden") || motivo.includes("not-authorized") || motivo.includes("item-not-found")) {
          removidos.push(nome);
          delete db[jid];
        } else {
          mantidos.push(`${nome} ⚠️`);
        }
      }
      await new Promise((r) => setTimeout(r, 800));
    }

    saveDB(db);

    let msg = `🧹 *Limpeza da Mensagem Diária concluída!*\n\n`;
    if (removidos.length > 0) {
      msg += `❌ *Removidos (${removidos.length}):*\n`;
      removidos.forEach((n) => (msg += `  • ${n}\n`));
      msg += "\n";
    }
    if (mantidos.length > 0) {
      msg += `✅ *Mantidos (${mantidos.length}):*\n`;
      mantidos.forEach((n) => (msg += `  • ${n}\n`));
    }
    msg += removidos.length === 0
      ? "\n✨ Nenhum grupo precisou ser removido. Tudo certo!"
      : `\n💾 Banco atualizado com *${mantidos.length}* grupo(s) ativo(s).`;

    return sendSuccessReply(msg);
  },
};
