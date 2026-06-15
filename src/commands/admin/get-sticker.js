/**
 * Retorna o ID numérico (SHA256) de uma figurinha
 * Use: responda uma figurinha com o comando
 *
 * @path src/commands/admin/get-sticker.js
 * @author Val (DeadBoT)
 */

import { PREFIX } from "../../config.js";

export default {
  name: "get-sticker",
  description: "Retorna o ID numérico de uma figurinha para uso no stickerHandler",
  commands: ["get-sticker"],
  usage: `${PREFIX}get-sticker (responda uma figurinha)`,

  handle: async ({ webMessage, sendReply, sendErrorReply }) => {
    const quoted =
      webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage
        ?.stickerMessage;
    const sticker = quoted || webMessage.message?.stickerMessage;

    if (!sticker) {
      return sendErrorReply(
        "Responda a uma figurinha (ou envie junto) para obter o ID dela."
      );
    }

    const fileSha = sticker.fileSha256;
    if (!fileSha || fileSha.length === 0) {
      return sendErrorReply("Não consegui ler o identificador da figurinha.");
    }

    const numeric = Array.from(Buffer.from(fileSha)).join(",");
    return sendReply(`🪙 *ID da figurinha (Numérico):*\n\n${numeric}`);
  },
};
