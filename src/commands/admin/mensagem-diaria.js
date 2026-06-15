/**
 * src/commands/admin/mensagem-diaria.js
 *
 * Ativa ou desativa a mensagem diária automática por grupo.
 *
 * Uso: /mensagem-diaria 1 (ativar) | /mensagem-diaria 0 (desativar)
 *
 * @author DeadBoT
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.resolve(__dirname, "..", "..", "..", "database", "mensagem-diaria.json");

function loadDB() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({}));
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")); } catch { return {}; }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export default {
  name: "mensagem-diaria",
  description: "Ativa ou desativa a mensagem diária automática às 06:00 (Brasília)",
  commands: ["mensagem-diaria"],
  usage: `${PREFIX}mensagem-diaria 1 ou 0`,

  handle: async ({ socket, remoteJid, userLid, args, sendReply, sendSuccessReply }) => {
    if (!remoteJid?.endsWith("@g.us")) {
      throw new InvalidParameterError("Este comando só pode ser usado em *grupos*!");
    }

    // Verificação manual de admin (evita bug de LID com números BR)
    const { participants } = await socket.groupMetadata(remoteJid);
    const me = participants.find((p) => {
      const pNum = (p.lid || p.id || "").replace(/[^0-9]/g, "");
      const uNum = (userLid || "").replace(/[^0-9]/g, "");
      return pNum && uNum && pNum === uNum;
    });

    if (!me || (me.admin !== "admin" && me.admin !== "superadmin")) {
      throw new InvalidParameterError("🚫 Apenas *administradores* podem usar este comando!");
    }

    const db = loadDB();
    const entrada = db[remoteJid] || null;
    const ativo = entrada?.ativo ?? false;

    // Sem argumento → mostra status
    if (!args?.[0]) {
      const status = ativo ? "✅ *ATIVADA*" : "❌ *DESATIVADA*";
      return sendReply(
        `💌 *Mensagem Diária — DeadBoT*\n\n` +
        `Status neste grupo: ${status}\n\n` +
        `*${PREFIX}mensagem-diaria 1* → ativar\n` +
        `*${PREFIX}mensagem-diaria 0* → desativar`
      );
    }

    const param = args[0].trim();

    if (param === "1") {
      if (ativo) {
        return sendReply(`✅ A mensagem diária já está *ativada* neste grupo!\nChego todo dia às *06:00* (Brasília) 🌅`);
      }
      let nome = "Grupo sem nome";
      try { nome = (await socket.groupMetadata(remoteJid)).subject || nome; } catch (_) {}
      db[remoteJid] = { ativo: true, nome };
      saveDB(db);
      return sendSuccessReply(
        `✅ *Mensagem Diária ATIVADA!* 🎉\n\n` +
        `📅 Todo dia às *06:00* (Brasília) vou mandar:\n\n` +
        `📆 Data e dia da semana\n` +
        `🌚 Fase da lua\n` +
        `⏳ Contagem regressiva pro fim do ano\n` +
        `🎯 Missão com dois membros sorteados\n` +
        `✨ Sabedoria do dia\n` +
        `🚨 Alertas de feriados e pontos facultativos\n\n` +
        `💚 _By DeadBoT_`
      );
    }

    if (param === "0") {
      if (!ativo) return sendReply("❌ A mensagem diária já está *desativada* neste grupo!");
      db[remoteJid] = { ativo: false, nome: db[remoteJid]?.nome || "Grupo sem nome" };
      saveDB(db);
      return sendSuccessReply(`❌ *Mensagem Diária DESATIVADA.*\n\nUse *${PREFIX}mensagem-diaria 1* para reativar. 💚`);
    }

    throw new InvalidParameterError(
      `Parâmetro inválido!\n\n*${PREFIX}mensagem-diaria 1* → ativar\n*${PREFIX}mensagem-diaria 0* → desativar`
    );
  },
};
