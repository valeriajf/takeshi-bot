/**
 * INSTALAÇÃO: src/commands/admin/agendamento-status.js
 */
import { PREFIX, DATABASE_DIR } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ABRIR_SCHEDULE = join(DATABASE_DIR, "grupo-abrir-schedule.json");
const ABRIR_LAST_EXEC = join(DATABASE_DIR, "grupo-abrir-last-execution.json");
const ABRIR_IMAGE = join(DATABASE_DIR, "grupo-abrir-image.json");
const ABRIR_GIF = join(DATABASE_DIR, "grupo-abrir-gif.json");

const FECHAR_SCHEDULE = join(DATABASE_DIR, "grupo-fechar-schedule.json");
const FECHAR_LAST_EXEC = join(DATABASE_DIR, "grupo-fechar-last-execution.json");
const FECHAR_IMAGE = join(DATABASE_DIR, "grupo-fechar-image.json");
const FECHAR_GIF = join(DATABASE_DIR, "grupo-fechar-gif.json");

function load(file) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  } catch {}
  return {};
}

function getMidia(gifFile, imageFile, groupId) {
  const gifs = load(gifFile);
  const images = load(imageFile);
  if (gifs[groupId]) return "🎬 GIF";
  if (images[groupId]) return "🖼️ Imagem";
  return "❌ Sem mídia";
}

function getUltimaExec(lastExecFile, groupId, horario) {
  const data = load(lastExecFile);
  const key = `${groupId}-${horario}`;
  return data[key] || "Nunca executado";
}

export default {
  name: "agendamento-status",
  description: "Mostra o status dos agendamentos de abertura e fechamento do grupo.",
  commands: ["agendamento-status", "ver-agendamento", "status-agendamento"],
  usage: `${PREFIX}agendamento-status`,

  handle: async ({ remoteJid, sendSuccessReply, sendWarningReply }) => {
    const abrirSchedules = load(ABRIR_SCHEDULE);
    const fecharSchedules = load(FECHAR_SCHEDULE);

    const abrirData = abrirSchedules[remoteJid];
    const fecharData = fecharSchedules[remoteJid];

    if (!abrirData && !fecharData) {
      throw new WarningError(
        `⚠️ *Nenhum agendamento ativo!*\n\n` +
        `Este grupo não possui horários programados.\n\n` +
        `Para configurar:\n` +
        `• ${PREFIX}grupo-abrir HH:MM\n` +
        `• ${PREFIX}grupo-fechar HH:MM`
      );
    }

    let msg = `📊 *STATUS DOS AGENDAMENTOS*\n\n`;

    if (abrirData) {
      const horario = typeof abrirData === "string" ? abrirData : abrirData.horario;
      const midia = getMidia(ABRIR_GIF, ABRIR_IMAGE, remoteJid);
      const ultimaExec = getUltimaExec(ABRIR_LAST_EXEC, remoteJid, horario);

      msg += `🟢 *ABERTURA*\n`;
      msg += `⏰ Horário: *${horario}* (Brasília)\n`;
      msg += `📸 Mídia: ${midia}\n`;
      msg += `📅 Última execução: ${ultimaExec}\n\n`;
    }

    if (fecharData) {
      const horario = typeof fecharData === "string" ? fecharData : fecharData.horario;
      const midia = getMidia(FECHAR_GIF, FECHAR_IMAGE, remoteJid);
      const ultimaExec = getUltimaExec(FECHAR_LAST_EXEC, remoteJid, horario);

      msg += `🔴 *FECHAMENTO*\n`;
      msg += `⏰ Horário: *${horario}* (Brasília)\n`;
      msg += `📸 Mídia: ${midia}\n`;
      msg += `📅 Última execução: ${ultimaExec}\n\n`;
    }

    msg += `💡 *Comandos úteis:*\n`;
    msg += `• ${PREFIX}agendamento-reset (apagar tudo)\n`;
    msg += `• ${PREFIX}grupo-abrir HH:MM (alterar abertura)\n`;
    msg += `• ${PREFIX}grupo-fechar HH:MM (alterar fechamento)`;

    await sendSuccessReply(msg);
  },
};
