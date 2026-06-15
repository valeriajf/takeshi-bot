/**
 * INSTALAÇÃO: src/commands/admin/grupo-fechar.js
 */
import { PREFIX, DATABASE_DIR } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { errorLog } from "../../utils/logger.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SCHEDULE_FILE = join(DATABASE_DIR, "grupo-fechar-schedule.json");
const LAST_EXEC_FILE = join(DATABASE_DIR, "grupo-fechar-last-execution.json");
const IMAGE_FILE = join(DATABASE_DIR, "grupo-fechar-image.json");
const GIF_FILE = join(DATABASE_DIR, "grupo-fechar-gif.json");

const MENSAGENS_FECHAMENTO = [
  `🌙🔒 *ACABOU A FESTA.*
O DeadBoT acabou de fechar o chat.
Sim… silêncio obrigatório agora.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* SILÊNCIO FORÇADO
❌ *Status:* Mensagens bloqueadas
🧠 *Motivo:*
Vocês falam demais.
Meu servidor pediu descanso.`,

  `🔒💀 *FIM DO EXPEDIENTE.*
O grupo foi oficialmente *FECHADO*.
Sim… parem de digitar.
Vão dormir, trabalhar ou tocar na grama.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* MODO SILÊNCIO
❌ *Status:* Chat bloqueado
⚠️ *Ordem do DeadBoT:*
Descansem antes que eu
delete a internet inteira.`,

  `🌙🚫 *SILÊNCIO NO SET!*
O DeadBoT fechou o chat.
Sim… acabou o falatório.

🗡️ *DEADBOT MODE* 🗡️
🎬 *Situação:* CENA ENCERRADA
❌ *Status:* Mensagens bloqueadas
🧠 *Dica do DeadBoT:*
Aproveitem o tempo livre
para ter uma vida fora do WhatsApp.`,

  `🔒🎭 *INTERVALO OBRIGATÓRIO.*
O grupo foi temporariamente *FECHADO*.
Nada de mensagens agora.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* DESCANSO DO CHAT
❌ *Status:* Bloqueado
⚠️ *Motivo oficial:*
Excesso de memes
e zero controle emocional.`,

  `💀🔒 *CHEGA POR HOJE.*
O DeadBoT colocou o grupo em modo silêncio.
Sim… até vocês precisam de pausa.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* PAZ TEMPORÁRIA
❌ *Status:* Mensagens bloqueadas
🧠 *Frase do DeadBoT:*
"Às vezes o silêncio
é o melhor meme."`,
];

function load(file) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  } catch {}
  return {};
}

function save(file, data) {
  try { writeFileSync(file, JSON.stringify(data, null, 2)); } catch (e) { errorLog(e.message); }
}

function getBrasiliaTime() {
  const now = new Date();
  let h = now.getUTCHours() - 3;
  let d = now.getUTCDate();
  let mo = now.getUTCMonth();
  let y = now.getUTCFullYear();
  if (h < 0) { h += 24; d--; if (d < 1) { mo--; if (mo < 0) { mo = 11; y--; } d = new Date(y, mo + 1, 0).getDate(); } }
  const pad = n => String(n).padStart(2, "0");
  return { hours: h, minutes: now.getUTCMinutes(), date: `${pad(d)}/${pad(mo + 1)}/${y}`, fullTime: `${pad(h)}:${pad(now.getUTCMinutes())}` };
}

const activeIntervals = {};
let lastExecution = load(LAST_EXEC_FILE);

async function checkAndClose(socket, groupId, scheduleTime) {
  try {
    const { hours, minutes, date } = getBrasiliaTime();
    const [sh, sm] = scheduleTime.split(":").map(Number);
    if (hours !== sh || minutes !== sm) return;

    const key = `${groupId}-${scheduleTime}`;
    if (lastExecution[key] === date) return;

    const msg = MENSAGENS_FECHAMENTO[Math.floor(Math.random() * MENSAGENS_FECHAMENTO.length)];
    const text = `${msg}\n\n⏰ *Horário:* ${scheduleTime}\n📅 *Data:* ${date}`;

    let sucesso = false;
    for (let t = 1; t <= 3 && !sucesso; t++) {
      try {
        await socket.groupSettingUpdate(groupId, "announcement");

        const gifs = load(GIF_FILE);
        const images = load(IMAGE_FILE);

        if (gifs[groupId]) {
          await socket.sendMessage(groupId, { video: Buffer.from(gifs[groupId], "base64"), caption: text, gifPlayback: true });
        } else if (images[groupId]) {
          await socket.sendMessage(groupId, { image: Buffer.from(images[groupId], "base64"), caption: text });
        } else {
          await socket.sendMessage(groupId, { text });
        }
        sucesso = true;
      } catch {
        if (t < 3) await new Promise(r => setTimeout(r, 5000));
      }
    }

    if (sucesso) {
      lastExecution[key] = date;
      save(LAST_EXEC_FILE, lastExecution);
    }
  } catch (e) {
    errorLog(`[grupo-fechar] ${e.message}`);
  }
}

function startMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals[groupId]) clearInterval(activeIntervals[groupId]);
  activeIntervals[groupId] = setInterval(() => checkAndClose(socket, groupId, scheduleTime), 60000);
  checkAndClose(socket, groupId, scheduleTime);
}

export function initFecharSchedules(socket) {
  const schedules = load(SCHEDULE_FILE);
  for (const [groupId, data] of Object.entries(schedules)) {
    const horario = typeof data === "string" ? data : data.horario;
    startMonitoring(socket, groupId, horario);
  }
}

export default {
  name: "grupo-fechar",
  description: "Programa o fechamento automático do grupo em um horário (Horário de Brasília).",
  commands: ["grupo-fechar", "agendar-fechamento"],
  usage: `${PREFIX}grupo-fechar HH:MM\n${PREFIX}grupo-fechar cancelar`,

  handle: async ({ socket, remoteJid, args, userLid, sendSuccessReply, sendErrorReply, sendWarningReply }) => {
    const groupMetadata = await socket.groupMetadata(remoteJid);
    const participant = groupMetadata.participants.find(p => p.lid === userLid || p.id === userLid);
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    if (!isAdmin) throw new DangerError("❌ Apenas administradores podem programar o fechamento do grupo!");

    const nomeGrupo = groupMetadata?.subject || "Grupo";

    if (!args[0]) {
      const schedules = load(SCHEDULE_FILE);
      const current = schedules[remoteJid];
      if (current) {
        const horario = typeof current === "string" ? current : current.horario;
        const gifs = load(GIF_FILE);
        const images = load(IMAGE_FILE);
        const midia = gifs[remoteJid] ? "🎬 GIF configurado" : images[remoteJid] ? "🖼️ Imagem configurada" : "❌ Sem mídia";
        await sendWarningReply(
          `⏰ *Fechamento automático ativo*\n\n` +
          `Horário: *${horario}* (Brasília)\n` +
          `📸 Mídia: ${midia}\n\n` +
          `Para alterar: ${PREFIX}grupo-fechar HH:MM\n` +
          `Para cancelar: ${PREFIX}grupo-fechar cancelar`
        );
      } else {
        await sendWarningReply(`ℹ️ *Nenhum agendamento ativo*\n\nUse: ${PREFIX}grupo-fechar HH:MM`);
      }
      return;
    }

    if (args[0].toLowerCase() === "cancelar") {
      const schedules = load(SCHEDULE_FILE);
      if (!schedules[remoteJid]) throw new WarningError("⚠️ Não há agendamento ativo para este grupo!");
      delete schedules[remoteJid];
      save(SCHEDULE_FILE, schedules);
      if (activeIntervals[remoteJid]) { clearInterval(activeIntervals[remoteJid]); delete activeIntervals[remoteJid]; }
      await sendSuccessReply("✅ Agendamento de fechamento cancelado!");
      return;
    }

    if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(args[0])) {
      throw new DangerError(`❌ Formato inválido! Use HH:MM (ex: 22:00)`);
    }

    const schedules = load(SCHEDULE_FILE);
    schedules[remoteJid] = { horario: args[0], nomeGrupo };
    save(SCHEDULE_FILE, schedules);
    startMonitoring(socket, remoteJid, args[0]);
    const { fullTime } = getBrasiliaTime();

    await sendSuccessReply(
      `✅ *Fechamento programado!*\n\n` +
      `⏰ Horário: *${args[0]}*\n` +
      `🕐 Brasília agora: ${fullTime}\n\n` +
      `💡 Personalize:\n` +
      `• ${PREFIX}set-gif-grupo-fechar\n` +
      `• ${PREFIX}set-image-grupo-fechar\n\n` +
      `Para cancelar: ${PREFIX}grupo-fechar cancelar`
    );
  },
};
