import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";

export default {
  name: "regras",
  description: "Mostra a descrição atual do grupo.",
  commands: ["regras"],
  usage: `${PREFIX}regras`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    isGroup,
    sendWaitReact,
    sendSuccessReact,
    sendReply,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError(
        "Este comando só pode ser usado em grupos!"
      );
    }

    await sendWaitReact();

    const metadata = await socket.groupMetadata(remoteJid);

    const groupName = metadata?.subject || "Grupo";

    const description =
      metadata?.desc?.trim() ||
      "⚠️ Este grupo não possui descrição definida.";

    const caption =
`📌 *${groupName}*

${description}`;

    try {
      const groupPhoto = await socket.profilePictureUrl(
        remoteJid,
        "image"
      );

      await socket.sendMessage(remoteJid, {
        image: {
          url: groupPhoto,
        },
        caption,
      });
    } catch {
      await sendReply(caption);
    }

    await sendSuccessReact();
  },
};