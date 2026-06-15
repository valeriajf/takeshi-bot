import { PREFIX, OWNER_LID } from "../../config.js";
import { errorLog } from "../../utils/logger.js";
import { removeBlacklist } from "../../utils/blacklistSystem.js";

export default {
  name: "listanegraremover",
  description: "Remove um usuário da lista negra do grupo.",
  commands: [
    "listanegraremover",
    "lista-negra-remover",
    "ln-remover"
  ],
  usage: `${PREFIX}listanegraremover @usuario`,

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
      let targetLid = null;

      // Resposta
      if (isReply && replyLid) {
        targetLid = replyLid;
      }
      // Menção
      else if (mentionedLid?.length > 0) {
        targetLid = mentionedLid[0];
      }
      // Número digitado
      else if (args?.length > 0) {
        const numero = args[0].replace(/\D/g, "");

        if (numero.length >= 10) {
          targetLid = numero;
        }
      }

      if (!targetLid) {
        return await sendErrorReply(
          "Marque, responda ou informe o número do usuário que deseja remover da lista negra."
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

      const removed = removeBlacklist(remoteJid, targetLid);

      if (!removed) {
        return await sendErrorReply(
          "Esse usuário não está na lista negra deste grupo."
        );
      }

      const targetNumber = targetLid.replace(/\D/g, "");

      await socket.sendMessage(remoteJid, {
        text:
          `✅ *LISTA NEGRA*\n\n` +
          `👤 Usuário: ${targetNumber}\n` +
          `👮 ADM: @${userLid.split("@")[0]}\n\n` +
          `🟢 Usuário removido da lista negra.\n` +
          `🔓 Agora ele poderá entrar normalmente no grupo.`,
        mentions: [userLid],
      });

      await sendSuccessReply(
        "Usuário removido da lista negra com sucesso!"
      );
    } catch (error) {
      await sendErrorReply(
        "Ocorreu um erro ao remover o usuário da lista negra."
      );

      errorLog(
        `Erro no comando listanegraremover: ${JSON.stringify(
          error,
          null,
          2
        )}`
      );
    }
  },
};