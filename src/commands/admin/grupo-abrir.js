/**
 * INSTALAÇÃO: src/commands/admin/grupo-abrir.js
 */
import { PREFIX, DATABASE_DIR } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { errorLog } from "../../utils/logger.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const SCHEDULE_FILE = join(DATABASE_DIR, "grupo-abrir-schedule.json");
const LAST_EXEC_FILE = join(DATABASE_DIR, "grupo-abrir-last-execution.json");
const IMAGE_FILE = join(DATABASE_DIR, "grupo-abrir-image.json");
const GIF_FILE = join(DATABASE_DIR, "grupo-abrir-gif.json");

const MENSAGENS_ABERTURA = [
  `☀️💬 *ACORDA, CAMBADA!*
O grupo foi oficialmente *LIBERADO*.
Sim… o DeadBoT acordou.
E infelizmente isso significa que vocês também podem falar agora.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* CAOS AUTORIZADO
✅ *Status:* Mensagens liberadas
🧠 *Dica do DeadBoT:*
Tentem não causar um apocalipse
antes do café da manhã.`,

  `🔓🎭 *ATENÇÃO, HUMANOS.*
O DeadBoT acabou de abrir o chat.
Sim… podem voltar a mandar:
• memes ruins
• figurinhas repetidas
• áudios de 3 minutos

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* LIBERDADE TEMPORÁRIA
✅ *Status:* Mensagens liberadas
⚠️ *Lembrem-se:*
Respeito é obrigatório…
mesmo quando vocês são estranhos.`,

  `☀️🗣️ *BOM DIA, CRIATURAS DO WHATSAPP.*
O grupo foi oficialmente *DESBLOQUEADO*.
Sim… podem voltar a conversar.
Mas tentem não quebrar a internet.

🗡️ *DEADBOT MODE* 🗡️
🎯 *Situação:* CONVERSA PERMITIDA
✅ *Status:* Chat aberto
🧠 *Conselho do DeadBoT:*
Memes são bem-vindos…
drama desnecessário não.`,

  `🔓💥 *BOAS NOTÍCIAS... OU NÃO.*
O DeadBoT liberou o chat.
Agora vocês podem voltar a falar,
brigar por besteira
e mandar meme velho.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* CAOS CONTROLADO
✅ *Status:* Mensagens liberadas
⚠️ *Aviso importante:*
Se exagerarem eu fecho isso aqui
mais rápido que spoiler de filme.`,

  `🌞💬 *O DEADBOT DESPERTA.*
O chat está oficialmente *ABERTO*.
Sim… podem conversar.
Mas tentem manter o cérebro ligado.

🗡️ *DEADBOT MODE* 🗡️
🗣️ *Situação:* BATE-PAPO AUTORIZADO
✅ *Status:* Chat liberado
🧠 *Frase do DeadBoT:*
"Com grandes poderes
vêm grandes memes."`,
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

async function checkAndOpen(socket, groupId, scheduleTime) {
  try {
    const { hours, minutes, date } = getBrasiliaTime();
    const [sh, sm] = scheduleTime.split(":").map(Number);
    if (hours !== sh || minutes !== sm) return;

    const key = `${groupId}-${scheduleTime}`;
    if (lastExecution[key] === date) return;

    const msg = MENSAGENS_ABERTURA[Math.floor(Math.random() * MENSAGENS_ABERTURA.length)];
    const text = `${msg}\n\n⏰ *Horário:* ${scheduleTime}\n📅 *Data:* ${date}`;

    let sucesso = false;
    for (let t = 1; t <= 3 && !sucesso; t++) {
      try {
        await socket.groupSettingUpdate(groupId, "not_announcement");

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
    errorLog(`[grupo-abrir] ${e.message}`);
  }
}

function startMonitoring(socket, groupId, scheduleTime) {
  if (activeIntervals[groupId]) clearInterval(activeIntervals[groupId]);
  activeIntervals[groupId] = setInterval(() => checkAndOpen(socket, groupId, scheduleTime), 60000);
  checkAndOpen(socket, groupId, scheduleTime);
}

export function initAbrirSchedules(socket) {
  const schedules = load(SCHEDULE_FILE);
  for (const [groupId, data] of Object.entries(schedules)) {
    const horario = typeof data === "string" ? data : data.horario;
    startMonitoring(socket, groupId, horario);
  }
}

export default {
  name: "grupo-abrir",
  description: "Programa a abertura automática do grupo em um horário (Horário de Brasília).",
  commands: ["grupo-abrir", "agendar-abertura"],
  usage: `${PREFIX}grupo-abrir HH:MM\n${PREFIX}grupo-abrir cancelar`,

  handle: async ({ socket, remoteJid, args, userLid, sendSuccessReply, sendErrorReply, sendWarningReply }) => {
    const groupMetadata = await socket.groupMetadata(remoteJid);
    const participant = groupMetadata.participants.find(p => p.lid === userLid || p.id === userLid);
    const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
    if (!isAdmin) throw new DangerError("❌ Apenas administradores podem programar a abertura do grupo!");

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
          `⏰ *Abertura automática ativa*\n\n` +
          `Horário: *${horario}* (Brasília)\n` +
          `📸 Mídia: ${midia}\n\n` +
          `Para alterar: ${PREFIX}grupo-abrir HH:MM\n` +
          `Para cancelar: ${PREFIX}grupo-abrir cancelar`
        );
      } else {
        await sendWarningReply(`ℹ️ *Nenhum agendamento ativo*\n\nUse: ${PREFIX}grupo-abrir HH:MM`);
      }
      return;
    }

    if (args[0].toLowerCase() === "cancelar") {
      const schedules = load(SCHEDULE_FILE);
      if (!schedules[remoteJid]) throw new WarningError("⚠️ Não há agendamento ativo para este grupo!");
      delete schedules[remoteJid];
      save(SCHEDULE_FILE, schedules);
      if (activeIntervals[remoteJid]) { clearInterval(activeIntervals[remoteJid]); delete activeIntervals[remoteJid]; }
      await sendSuccessReply("✅ Agendamento de abertura cancelado!");
      return;
    }

    if (!/^([01]?\d|2[0-3]):([0-5]\d)$/.test(args[0])) {
      throw new DangerError(`❌ Formato inválido! Use HH:MM (ex: 08:00)`);
    }

    const schedules = load(SCHEDULE_FILE);
    schedules[remoteJid] = { horario: args[0], nomeGrupo };
    save(SCHEDULE_FILE, schedules);
    startMonitoring(socket, remoteJid, args[0]);
    const { fullTime } = getBrasiliaTime();

    await sendSuccessReply(
      `✅ *Abertura programada!*\n\n` +
      `⏰ Horário: *${args[0]}*\n` +
      `🕐 Brasília agora: ${fullTime}\n\n` +
      `💡 Personalize:\n` +
      `• ${PREFIX}set-gif-grupo-abrir\n` +
      `• ${PREFIX}set-image-grupo-abrir\n\n` +
      `Para cancelar: ${PREFIX}grupo-abrir cancelar`
    );
  },
};
