/*
  Gerencia a lista de grupos ignorados pelo comando #tm (transmissão simultânea)
  Permite adicionar, remover e listar grupos bloqueados.

  @author Dev VaL
*/

import fs from "fs";
import path from "path";

import { PREFIX, OWNER_LID, DATABASE_DIR } from "../../config.js";
import { errorLog } from "../../utils/logger.js";

const DB_PATH = path.join(DATABASE_DIR, "tm-ignore-list.json");

// ======================================================
// DB
// ======================================================

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ======================================================
// COMMAND
// ======================================================

export default {
  name: "tm-ignore",
  description: "Gerencia grupos bloqueados de receber transmissões do #tm",
  commands: ["tm-ignore"],
  usage: `${PREFIX}tm-ignore add | remove | list`,

  handle: async ({
    socket,
    sendReact,
    sendReply,
    sendErrorReply,
    args,
    userLid,
    isGroup,
    remoteJid,
  }) => {
    try {

      // ======================================================
      // OWNER
      // ======================================================

      if (userLid !== OWNER_LID) {
        return sendErrorReply("❌ Apenas o desenvolvedor pode executar este comando");
      }

      const sub = args[0]?.toLowerCase();

      // ── LIST ─────────────────────────────────────────────────────────────────

      if (sub === "list") {
        const db = loadDB();
        const entries = Object.entries(db);

        if (!entries.length) {
          return sendReply("📋 *Nenhum grupo bloqueado no momento.*");
        }

        const lista = entries
          .map(([id, info], i) => `*${i + 1}.* ${info.name}\n   \`${id}\``)
          .join("\n\n");

        return sendReply(
          `🚫 *GRUPOS BLOQUEADOS DO #tm*\n\n${lista}\n\n> _Total: ${entries.length} grupo(s)_`
        );
      }

      // ── ADD ──────────────────────────────────────────────────────────────────

      if (sub === "add") {
        if (!isGroup) {
          return sendErrorReply("❌ Use este comando dentro do grupo que deseja bloquear.");
        }

        const db = loadDB();

        if (db[remoteJid]) {
          return sendErrorReply(
            `⚠️ Este grupo já está na blocklist!\n\n📛 *Nome:* ${db[remoteJid].name}\n🆔 *ID:* \`${remoteJid}\``
          );
        }

        let groupName = "Grupo sem nome";
        try {
          const meta = await socket.groupMetadata(remoteJid);
          groupName = meta.subject || groupName;
        } catch (e) {
          errorLog(`tm-ignore: erro ao buscar metadata do grupo ${remoteJid}: ${e.message}`);
        }

        db[remoteJid] = {
          name: groupName,
          id: remoteJid,
          blockedAt: new Date().toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
          }),
        };

        saveDB(db);
        await sendReact("🚫");

        return sendReply(
          `🚫 *Grupo bloqueado com sucesso!*\n\n📛 *Nome:* ${groupName}\n✅ *ID do grupo:* ${remoteJid}\n\n> _Este grupo não receberá mais transmissões do \`#tm\`._`
        );
      }

      // ── REMOVE ───────────────────────────────────────────────────────────────

      if (sub === "remove") {
        if (!isGroup) {
          return sendErrorReply("❌ Use este comando dentro do grupo que deseja desbloquear.");
        }

        const db = loadDB();

        if (!db[remoteJid]) {
          return sendErrorReply("⚠️ Este grupo não está na blocklist.");
        }

        const { name } = db[remoteJid];
        delete db[remoteJid];
        saveDB(db);

        await sendReact("✅");

        return sendReply(
          `✅ *Grupo desbloqueado!*\n\n📛 *Nome:* ${name}\n🆔 *ID:* \`${remoteJid}\`\n\n> _Este grupo voltará a receber transmissões do \`#tm\`._`
        );
      }

      // ── USO INCORRETO ─────────────────────────────────────────────────────────

      return sendErrorReply(
        `📋 *Uso correto:*\n\n` +
        `*Bloquear grupo atual:*\n\`${PREFIX}tm-ignore add\`\n\n` +
        `*Desbloquear grupo atual:*\n\`${PREFIX}tm-ignore remove\`\n\n` +
        `*Ver todos os bloqueados:*\n\`${PREFIX}tm-ignore list\`\n\n` +
        `> _Use dentro do grupo desejado para add/remove_`
      );

    } catch (error) {
      errorLog(error);
      await sendErrorReply("❌ *Erro interno no tm-ignore*\n\n🔧 Verifique os logs para mais detalhes");
    }
  },
};
