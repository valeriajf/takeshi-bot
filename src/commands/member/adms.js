/**
 * Comando adms
 * Marca todos os administradores do grupo.
 *
 * PASTA: src/commands/member/
 *
 * @author VaL
 */

import { PREFIX } from "../../config.js";

export default {
  name: "adms",
  description: "Marca todos os administradores do grupo",
  commands: ["adms", "admins", "administradores"],
  usage: `${PREFIX}adms [mensagem opcional]`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    sendReply,
    sendErrorReply,
    args,
  }) => {
    try {
      // 🔎 Pega dados do grupo
      const groupMetadata = await socket.groupMetadata(remoteJid);
      const groupName = groupMetadata.subject || "Grupo";

      // 👮 Lista de admins (participantes com admin != null)
      const admins = groupMetadata.participants
        .filter((p) => p.admin)
        .map((p) => p.id);

      if (!admins.length) {
        return await sendReply("❌ Não encontrei administradores neste grupo.");
      }

      // 🏷️ Formata menções
      const adminMentions = admins.map((jid) => `@${jid.split("@")[0]}`);

      // 📧 Texto extra digitado após o comando
      const extraText =
        args && args.length > 0 ? `\n⚠️ ${args.join(" ")}\n` : "";

      // 🧾 Mensagem
      const message =
`👮 *Chamando os ADMs*
🪀️ Grupo: *${groupName}*${extraText}

${adminMentions.join(" ")}`;

      await socket.sendMessage(remoteJid, {
        text: message,
        mentions: admins,
      });
    } catch (error) {
      console.error("Erro no comando adms:", error);
      await sendErrorReply("❌ Erro ao chamar os administradores.");
    }
  },
};
