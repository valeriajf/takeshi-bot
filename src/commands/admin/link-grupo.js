import { PREFIX, BOT_NAME } from "../../config.js";

export default {
  name: "link-grupo",
  description: "Obtém o link do grupo.",
  commands: ["link-grupo", "link-gp"],
  usage: `${PREFIX}link-grupo`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    sendReply,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    try {
      await sendSuccessReact();

      const groupCode = await socket.groupInviteCode(remoteJid);

      if (!groupCode) {
        return await sendErrorReply(
          "Preciso ser administrador para gerar o link do grupo."
        );
      }

      const metadata = await socket.groupMetadata(remoteJid);

      const groupInviteLink = `https://chat.whatsapp.com/${groupCode}`;

      const messageText = `
╭━━━〔 🔗 *LINK DO GRUPO* 〕━━━⬣
┃
┃ 🪀 *Grupo:* ${metadata.subject}
┃
┃ 🔓 *Acesso liberado*
┃ 👇 Entre pelo link abaixo:
┃
┃ 🌐 ${groupInviteLink}
┃
╰━━━〔 🤖 ${BOT_NAME} 〕━━━⬣
      `.trim();

      try {
        const profilePicUrl = await socket.profilePictureUrl(
          remoteJid,
          "image"
        );

        await socket.sendMessage(remoteJid, {
          image: { url: profilePicUrl },
          caption: messageText,
        });
      } catch {
        await sendReply(messageText);
      }
    } catch (error) {
      console.error("[link-grupo]", error);

      await sendErrorReply(
        "Preciso ser administrador para gerar o link do grupo."
      );
    }
  },
};