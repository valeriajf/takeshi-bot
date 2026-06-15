import fs from "node:fs";
import path from "node:path";

import { ASSETS_DIR, BOT_LID, OWNER_LID, PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";

export default {
  name: "ban",
  description: "Remove um membro do grupo.",
  commands: ["ban", "kick", "expulsar"],
  usage: `${PREFIX}ban @usuario`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    userLid,
    replyLid,
    args,
    isReply,
    isGroup,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    if (!isGroup) {
      throw new WarningError(
        "Este comando só pode ser usado dentro de grupos."
      );
    }

    const targetLid = isReply
      ? replyLid
      : args[0]
      ? `${onlyNumbers(args[0])}@lid`
      : null;

    if (!targetLid) {
      throw new InvalidParameterError(
        "Marque ou responda a mensagem do usuário que deseja remover."
      );
    }

    const metadata = await socket.groupMetadata(remoteJid);

    const senderParticipant = metadata.participants.find(
      (p) => (p.lid || p.id) === userLid
    );

    if (!senderParticipant?.admin && userLid !== OWNER_LID) {
      throw new WarningError(
        "Apenas administradores podem usar este comando."
      );
    }

    const targetParticipant = metadata.participants.find(
      (p) => (p.lid || p.id) === targetLid
    );

    if (!targetParticipant) {
      throw new WarningError("Usuário não encontrado no grupo.");
    }

    if (targetLid === OWNER_LID) {
      throw new WarningError(
        "Você não pode remover a dona do bot."
      );
    }

    if (targetLid === BOT_LID) {
      throw new WarningError(
        "Você não pode remover o DeadBoT."
      );
    }

    if (targetParticipant.admin && userLid !== OWNER_LID) {
      throw new WarningError(
        "Você não pode remover outro administrador."
      );
    }

    const frasesBan = [
      "💥 Foi de base!",
      "🗡️ Corte rápido e preciso!",
      "🚪 Já tá do lado de fora.",
      "🧨 BOOM! Removido.",
      "🔫 Missão cumprida.",
      "🩸 Era figurante mesmo.",
      "🛑 Ban aplicado.",
      "📦 Despachado pra fora.",
      "🧤 Estalou e sumiu.",
      "🎬 Cena deletada.",
      "☠️ Erro fatal.",
      "🃏 Você perdeu.",
      "🌪️ Varrido.",
      "⚰️ R.I.P.",
      "🎯 Headshot.",
    ];

    const frase =
      frasesBan[Math.floor(Math.random() * frasesBan.length)];
      
      global.removedByAdmin ??= new Set();

global.removedByAdmin.add(targetLid);

setTimeout(() => {
  global.removedByAdmin.delete(targetLid);
}, 15000);

    await socket.groupParticipantsUpdate(
      remoteJid,
      [targetLid],
      "remove"
    );

    await socket.sendMessage(remoteJid, {
      text:
        `☠️ *BANIMENTO*\n\n` +
        `👤 *Banido:* @${onlyNumbers(targetLid)}\n` +
        `👮 *ADM:* @${onlyNumbers(userLid)}\n\n` +
        `${frase}\n\n` +
        `👋 *Adeus*`,
      mentions: [targetLid, userLid],
    });

    const audioPath = path.resolve(
      ASSETS_DIR,
      "audios",
      "banido.ogg"
    );

    if (fs.existsSync(audioPath)) {
      await socket.sendMessage(remoteJid, {
        audio: fs.readFileSync(audioPath),
        mimetype: "audio/ogg; codecs=opus",
        ptt: true,
      });
    }

    await sendSuccessReact();
  },
};