/**
 * INSTALAÇÃO: src/commands/admin/agendamento-reset.js
 */
import { PREFIX, DATABASE_DIR } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
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

function save(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function removeGroupFromFile(file, groupId) {
  const data = load(file);
  if (!data[groupId]) return false;
  delete data[groupId];
  save(file, data);
  return true;
}

function removeKeysByPrefix(file, groupId) {
  const data = load(file);
  const before = Object.keys(data).length;
  for (const key of Object.keys(data)) {
    if (key.startsWith(groupId)) delete data[key];
  }
  if (Object.keys(data).length < before) {
    save(file, data);
    return true;
  }
  return false;
}

export default {
  name: "agendamento-reset",
  description: "Remove todos os agendamentos e mídias configuradas de abertura e fechamento do grupo.",
  commands: ["agendamento-reset", "resetar-agendamento", "reset-agendamento"],
  usage: `${PREFIX}agendamento-reset`,

  handle: async ({ remoteJid, sendSuccessReply, sendWarningReply }) => {
    const removidos = [];

    // Agendamentos
    if (removeGroupFromFile(ABRIR_SCHEDULE, remoteJid)) removidos.push("📅 Agendamento de ABERTURA");
    if (removeGroupFromFile(FECHAR_SCHEDULE, remoteJid)) removidos.push("📅 Agendamento de FECHAMENTO");

    // Últimas execuções
    removeKeysByPrefix(ABRIR_LAST_EXEC, remoteJid);
    removeKeysByPrefix(FECHAR_LAST_EXEC, remoteJid);

    // Mídias
    if (removeGroupFromFile(ABRIR_IMAGE, remoteJid)) removidos.push("🖼️ Imagem de ABERTURA");
    if (removeGroupFromFile(ABRIR_GIF, remoteJid)) removidos.push("🎬 GIF de ABERTURA");
    if (removeGroupFromFile(FECHAR_IMAGE, remoteJid)) removidos.push("🖼️ Imagem de FECHAMENTO");
    if (removeGroupFromFile(FECHAR_GIF, remoteJid)) removidos.push("🎬 GIF de FECHAMENTO");

    if (removidos.length === 0) {
      throw new WarningError(
        `⚠️ *Nenhum agendamento encontrado!*\n\n` +
        `Este grupo não possui agendamentos ou mídias configuradas.`
      );
    }

    await sendSuccessReply(
      `✅ *Agendamentos resetados com sucesso!*\n\n` +
      `🗑️ *Removidos:*\n` +
      removidos.map(r => `• ${r}`).join("\n") + "\n\n" +
      `💡 Para configurar novamente:\n` +
      `• ${PREFIX}grupo-abrir HH:MM\n` +
      `• ${PREFIX}grupo-fechar HH:MM`
    );
  },
};
