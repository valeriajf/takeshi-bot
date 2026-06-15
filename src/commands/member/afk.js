/**
 * afk.js
 * Comando AFK — marca o usuário como ausente no grupo.
 * Pasta: src/commands/member/
 *
 * @author Val (DeadBoT)
 */

import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { setAFK, isAFK } from "../../utils/afkDatabase.js";

export default {
  name: "afk",
  description: "Marca você como ausente (Away From Keyboard) neste grupo.",
  commands: ["afk"],
  usage: `${PREFIX}afk [motivo]`,

  handle: async ({
    sendReply,
    args,
    remoteJid,
    userLid,
    socket,
    webMessage,
  }) => {
    // Só funciona em grupos (dynamicCommand já bloqueia DM se necessário,
    // mas validamos explicitamente para dar mensagem amigável)
    if (!remoteJid?.endsWith("@g.us")) {
      await sendReply("❌ Este comando só funciona em grupos!");
      return;
    }

    // Usuário já está AFK neste grupo — ignora silenciosamente
    if (isAFK(remoteJid, userLid)) {
      return;
    }

    // Motivo
    const reason = args.length > 0 ? args.join(" ").trim() : "Sem motivo especificado";

    if (reason.length > 100) {
      throw new InvalidParameterError("O motivo deve ter no máximo 100 caracteres!");
    }

    // Salva AFK no banco
    setAFK(remoteJid, userLid, reason);

    // Formatação de data/hora BRT
    const now = new Date();
    const timeString = now.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const dateString = now.toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    // Menção — o texto usa só o número (sem @lid), o array mentions faz o link
    const mentionText = `@${userLid.split("@")[0]}`;

    await socket.sendMessage(remoteJid, {
      text: `💤 ${mentionText} está ausente desde ${dateString} às ${timeString}\n\n💭 Motivo: ${reason}`,
      mentions: [userLid],
    }, { quoted: webMessage });
  },
};
