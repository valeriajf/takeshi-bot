/**
 * INSTALAÇÃO: src/commands/admin/set-gif-grupo-fechar.js
 */
import { PREFIX, DATABASE_DIR } from "../../config.js";
import { DangerError, WarningError } from "../../errors/index.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { downloadContentFromMessage } from "baileys";

const GIF_FILE = join(DATABASE_DIR, "grupo-fechar-gif.json");
const IMAGE_FILE = join(DATABASE_DIR, "grupo-fechar-image.json");

function load(file) {
  try {
    if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  } catch {}
  return {};
}

function save(file, data) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

async function downloadGifBuffer(videoMessage) {
  const stream = await downloadContentFromMessage(videoMessage, "video");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default {
  name: "set-gif-grupo-fechar",
  description: "Define o GIF enviado junto com a mensagem automática de fechamento do grupo.",
  commands: ["set-gif-grupo-fechar", "gif-fechar"],
  usage: `${PREFIX}set-gif-grupo-fechar (envie com um GIF)\n${PREFIX}set-gif-grupo-fechar remover`,

  handle: async ({
    remoteJid,
    args,
    sendSuccessReply,
    sendErrorReply,
    sendWarningReply,
    webMessage,
  }) => {
    if (args[0]?.toLowerCase() === "remover") {
      const gifs = load(GIF_FILE);
      if (!gifs[remoteJid]) throw new WarningError("⚠️ Não há GIF definido para este grupo!");
      delete gifs[remoteJid];
      save(GIF_FILE, gifs);
      await sendSuccessReply("✅ GIF de fechamento removido com sucesso!");
      return;
    }

    const message = webMessage?.message;
    const videoMsg =
      message?.videoMessage ||
      message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage;

    if (!videoMsg || !videoMsg.gifPlayback) {
      throw new DangerError(
        `❌ *Nenhum GIF encontrado!*\n\n` +
        `Envie um GIF com a legenda:\n` +
        `*${PREFIX}set-gif-grupo-fechar*\n\n` +
        `Ou responda um GIF com o comando.\n\n` +
        `💡 Para imagem estática use: ${PREFIX}set-image-grupo-fechar`
      );
    }

    await sendWarningReply("⏳ Baixando GIF...");

    const buffer = await downloadGifBuffer(videoMsg);

    // 🔄 Salva GIF e remove imagem (evita conflito de prioridade)
    const gifs = load(GIF_FILE);
    gifs[remoteJid] = buffer.toString("base64");
    save(GIF_FILE, gifs);

    const images = load(IMAGE_FILE);
    if (images[remoteJid]) {
      delete images[remoteJid];
      save(IMAGE_FILE, images);
    }

    await sendSuccessReply(
      `✅ *GIF de fechamento definido!*\n\n` +
      `🎬 Este GIF será enviado automaticamente junto com a mensagem de fechamento.\n\n` +
      `⚠️ Imagem anterior removida automaticamente.\n\n` +
      `Para remover: ${PREFIX}set-gif-grupo-fechar remover`
    );
  },
};
