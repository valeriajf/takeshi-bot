import { PREFIX, BOT_LID, OWNER_LID } from "../../config.js";
import { errorLog } from "../../utils/logger.js";
import { addBlacklist } from "../../utils/blacklistSystem.js";

export default {
  name: "listanegra",
  description: "Adiciona um usuário à lista negra do grupo.",
  commands: ["listanegra", "lista-negra", "ln"],
  usage: `${PREFIX}listanegra @usuario`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    userLid,
    mentionedLid,
    replyLid,
    isReply,
    args,
    sendSuccessReply,
    sendErrorReply,
  }) => {
    try {
      let targetId = null;

      // Resposta
      if (isReply && replyLid) {
        targetId = replyLid;
      }
      // Menção
      else if (mentionedLid?.length > 0) {
        targetId = mentionedLid[0];
      }
      // Número digitado
      else if (args?.length > 0) {
        const numero = args[0].replace(/\D/g, "");

        if (numero.length >= 10) {
          targetId = numero;
        }
      }

      if (!targetId) {
        return await sendErrorReply(
          "Marque, responda ou informe o número do usuário que deseja adicionar à lista negra."
        );
      }

      const metadata = await socket.groupMetadata(remoteJid);

      const senderParticipant = metadata.participants.find(
        (p) => (p.lid || p.id) === userLid
      );

      if (!senderParticipant?.admin && userLid !== OWNER_LID) {
        return await sendErrorReply(
          "Apenas administradores podem usar este comando."
        );
      }

      // Proteção para reply e menção
      if (targetId === OWNER_LID) {
        return await sendErrorReply(
          "Você não pode adicionar a dona do bot à lista negra."
        );
      }

      if (targetId === BOT_LID) {
        return await sendErrorReply(
          "Você não pode adicionar o DeadBoT à lista negra."
        );
      }

      const added = addBlacklist(remoteJid, targetId);

      if (!added) {
        return await sendErrorReply(
          "Esse usuário já está na lista negra deste grupo."
        );
      }

      // Só tenta remover se for alguém do grupo
      const participant = metadata.participants.find(
        (p) =>
          p.id === targetId ||
          p.lid === targetId ||
          p.id?.replace(/\D/g, "") === targetId.replace(/\D/g, "") ||
          p.phoneNumber?.replace(/\D/g, "") === targetId.replace(/\D/g, "")
      );

      if (participant) {
        const participantId = participant.lid || participant.id;

        global.removedByAdmin ??= new Set();

        global.removedByAdmin.add(participantId);

        setTimeout(() => {
          global.removedByAdmin.delete(participantId);
        }, 15000);

        try {
          await socket.groupParticipantsUpdate(
            remoteJid,
            [participantId],
            "remove"
          );
        } catch {}
      }

      await socket.sendMessage(remoteJid, {
        text:
          `🚫 *LISTA NEGRA*\n\n` +
          `👤 Usuário: ${targetId.replace(/\D/g, "")}\n` +
          `👮 ADM: @${userLid.split("@")[0]}\n\n` +
          `☠️ Usuário adicionado à lista negra.\n` +
          `⚠️ Será removido automaticamente caso tente entrar novamente.`,
        mentions: [userLid],
      });

      await sendSuccessReply(
        "Usuário adicionado à lista negra com sucesso!"
      );
    } catch (error) {
      await sendErrorReply(
        "Ocorreu um erro ao adicionar o usuário à lista negra."
      );

      errorLog(
        `Erro no comando listanegra: ${JSON.stringify(
          error,
          null,
          2
        )}`
      );
    }
  },
};