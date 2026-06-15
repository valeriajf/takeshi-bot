import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";

export default {
  name: "get-group-id",
  description: "Retorna o ID completo do grupo.",
  commands: ["get-group-id", "id-get", "id-group"],
  usage: `${PREFIX}get-group-id`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    remoteJid,
    isGroup,
    userLid,
    getGroupAdmins,
    sendSuccessReply,
  }) => {
    if (!isGroup) {
      throw new WarningError(
        "Este comando deve ser usado dentro de um grupo."
      );
    }

    const admins = await getGroupAdmins();

    if (!admins.includes(userLid)) {
      throw new WarningError(
        "Apenas administradores do grupo podem usar este comando."
      );
    }

    await sendSuccessReply(`*ID do grupo:* ${remoteJid}`);
  },
};