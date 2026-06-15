/**
 * Comando citar
 * Cita uma mensagem marcando todos do grupo.
 *
 * PASTA: src/commands/member/
 *
 * @author VaL
 */

import { downloadContentFromMessage } from "baileys";
import { PREFIX } from "../../config.js";

export default {
  name: "citar",
  description: "Cita uma mensagem marcando todos do grupo",
  commands: ["citar", "cite"],
  usage: `${PREFIX}citar (responda a uma mensagem)`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendText,
    socket,
    remoteJid,
    sendReact,
    webMessage,
    sendErrorReply,
  }) => {
    const quotedMessage =
      webMessage?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    if (!quotedMessage) {
      return await sendErrorReply(
        "❌ Você precisa responder a uma mensagem para usar este comando!"
      );
    }

    const { participants } = await socket.groupMetadata(remoteJid);
    const mentions = participants.map(({ id }) => id);

    await sendReact("📢");

    const quotedText =
      quotedMessage?.conversation ||
      quotedMessage?.extendedTextMessage?.text ||
      "";

    const quotedImage    = quotedMessage?.imageMessage;
    const quotedVideo    = quotedMessage?.videoMessage;
    const quotedAudio    = quotedMessage?.audioMessage;
    const quotedSticker  = quotedMessage?.stickerMessage;
    const quotedDocument = quotedMessage?.documentMessage;

    try {
      // IMAGEM
      if (quotedImage) {
        const stream = await downloadContentFromMessage(quotedImage, "image");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: quotedImage.caption || quotedText || "",
          mentions,
        });

      // VÍDEO
      } else if (quotedVideo) {
        const stream = await downloadContentFromMessage(quotedVideo, "video");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await socket.sendMessage(remoteJid, {
          video: buffer,
          caption: quotedVideo.caption || quotedText || "",
          mentions,
        });

      // ÁUDIO
      } else if (quotedAudio) {
        const stream = await downloadContentFromMessage(quotedAudio, "audio");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await socket.sendMessage(remoteJid, {
          audio: buffer,
          mimetype: quotedAudio.mimetype || "audio/mp4",
          ptt: quotedAudio.ptt || false,
          mentions,
        });

        if (quotedText) await sendText(quotedText, mentions);

      // STICKER
      } else if (quotedSticker) {
        const stream = await downloadContentFromMessage(quotedSticker, "sticker");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await socket.sendMessage(remoteJid, { sticker: buffer });

        if (quotedText) await sendText(quotedText, mentions);

      // DOCUMENTO
      } else if (quotedDocument) {
        const stream = await downloadContentFromMessage(quotedDocument, "document");
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        await socket.sendMessage(remoteJid, {
          document: buffer,
          mimetype: quotedDocument.mimetype,
          fileName: quotedDocument.fileName || "documento",
          caption: quotedDocument.caption || quotedText || "",
          mentions,
        });

      // TEXTO
      } else if (quotedText) {
        await sendText(quotedText, mentions);

      } else {
        await sendErrorReply("❌ A mensagem citada não contém conteúdo válido.");
      }
    } catch (error) {
      console.error("ERRO AO CITAR:", error);
      await sendErrorReply(`❌ Erro ao processar a citação: ${error.message}`);
    }
  },
};
