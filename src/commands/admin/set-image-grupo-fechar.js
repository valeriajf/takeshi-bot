/**
 * INSTALAÇÃO: src/commands/admin/set-image-grupo-fechar.js
 */
import { PREFIX, DATABASE_DIR } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { downloadContentFromMessage } from "baileys";

const IMAGE_FILE = join(DATABASE_DIR, "grupo-fechar-image.json");
const GIF_FILE = join(DATABASE_DIR, "grupo-fechar-gif.json");

function load(file) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  } catch {}
  return {};
}

function save(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

async function downloadImageBuffer(imageMessage) {
  const stream = await downloadContentFromMessage(imageMessage, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default {
  name: "set-image-grupo-fechar",
  description: "Define a imagem enviada junto com a mensagem automática de fechamento do grupo.",
  commands: ["set-image-grupo-fechar", "imagem-fechar"],
  usage: `${PREFIX}set-image-grupo-fechar (envie com uma imagem)\n${PREFIX}set-image-grupo-fechar remover`,

  handle: async ({
    remoteJid,
    args,
    sendSuccessReply,
    sendWarningReply,
    webMessage,
  }) => {
    if (args[0]?.toLowerCase() === "remover") {
      const images = load(IMAGE_FILE);
      if (!images[remoteJid]) throw new WarningError("⚠️ Não há imagem definida para este grupo!");
      delete images[remoteJid];
      save(IMAGE_FILE, images);
      await sendSuccessReply("✅ Imagem de fechamento removida com sucesso!");
      return;
    }

    const message = webMessage?.message;
    const imageMsg =
      message?.imageMessage ||
      message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

    if (!imageMsg) {
      throw new DangerError(
        `❌ *Nenhuma imagem encontrada!*\n\n` +
        `Envie uma imagem com a legenda:\n` +
        `*${PREFIX}set-image-grupo-fechar*\n\n` +
        `Ou responda uma imagem com o comando.\n\n` +
        `💡 Para GIF use: ${PREFIX}set-gif-grupo-fechar`
      );
    }

    await sendWarningReply("⏳ Baixando imagem...");

    const buffer = await downloadImageBuffer(imageMsg);

    const images = load(IMAGE_FILE);
    images[remoteJid] = buffer.toString("base64");
    save(IMAGE_FILE, images);

    // Remove GIF para evitar conflito de prioridade
    const gifs = load(GIF_FILE);
    if (gifs[remoteJid]) {
      delete gifs[remoteJid];
      save(GIF_FILE, gifs);
    }

    await sendSuccessReply(
      `✅ *Imagem de fechamento definida!*\n\n` +
      `🖼️ Esta imagem será enviada automaticamente junto com a mensagem de fechamento.\n\n` +
      `⚠️ GIF anterior removido automaticamente.\n\n` +
      `Para remover: ${PREFIX}set-image-grupo-fechar remover`
    );
  },
};
