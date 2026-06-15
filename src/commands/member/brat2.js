/**
 * Comando Brat2 - Gera sticker com estilo Brat
 * Fundo verde #8ACE00 + fonte DejaVuSans-Bold via FFmpeg drawtext
 * ✅ Zero dependências Node extras
 * ✅ ESM puro para DeadBoT nova base
 *
 * @author VaL
 */

import fs from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";

import { BOT_EMOJI, BOT_NAME, PREFIX, TEMP_DIR } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { processStaticSticker } from "../../services/sticker.js";
import { getRandomName } from "../../utils/index.js";

const FONT_PATH = "/data/data/com.termux/files/usr/share/fonts/TTF/DejaVuSans-Bold.ttf";
const BRAT_GREEN = "0x8ACE00FF";
const SIZE = 512;

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, _stdout, stderr) => {
      if (error) {
        console.error("[BRAT2] FFmpeg error:", stderr);
        reject(new Error(stderr || error.message));
      } else {
        resolve();
      }
    });
  });
}

// Quebra o texto em linhas para caber na imagem
function quebrarLinhas(text, fontSize) {
  const charPx = fontSize * 0.6;
  const maxChars = Math.floor((SIZE - 80) / charPx);
  const palavras = text.split(" ");
  const linhas = [];
  let atual = "";

  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;
    if (teste.length > maxChars && atual) {
      linhas.push(atual);
      atual = palavra;
    } else {
      atual = teste;
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// Escapa caracteres especiais para o filtro drawtext do FFmpeg
function escaparFFmpeg(str) {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/:/g, "\\:")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

export default {
  name: "brat2",
  description: "Cria uma figurinha com texto no estilo Brat (fundo verde)",
  commands: ["brat2"],
  usage: `${PREFIX}brat2 <texto>`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    sendStickerFromFile,
    webMessage,
    userLid,
  }) => {
    if (!fullArgs || !fullArgs.trim().length) {
      throw new InvalidParameterError(
        `Você precisa informar o texto!\n\n📝 Exemplo: ${PREFIX}brat2 deixa a passiva falar`
      );
    }

    await sendWaitReact();

    // Remove emojis (FFmpeg drawtext não suporta)
    let text = fullArgs.trim();
    const emojiRanges = [
      /[\u{1F600}-\u{1F64F}]/gu, /[\u{1F300}-\u{1F5FF}]/gu,
      /[\u{1F680}-\u{1F6FF}]/gu, /[\u{1F1E0}-\u{1F1FF}]/gu,
      /[\u{2600}-\u{26FF}]/gu,   /[\u{2700}-\u{27BF}]/gu,
      /[\u{FE00}-\u{FE0F}]/gu,   /[\u{1F900}-\u{1F9FF}]/gu,
      /[\u{1FA00}-\u{1FA6F}]/gu, /[\u{1F004}-\u{1F0CF}]/gu,
      /[\u{1F170}-\u{1F251}]/gu,
    ];
    for (const re of emojiRanges) text = text.replace(re, "");
    text = text.trim().replace(/\s+/g, " ");

    if (!text) {
      throw new InvalidParameterError(
        `O texto não pode conter apenas emojis!\n\n📝 Exemplo: ${PREFIX}brat2 Charli XCX`
      );
    }

    const pngPath = path.resolve(TEMP_DIR, getRandomName("png"));
    let finalStickerPath = null;

    try {
      // Escolhe tamanho da fonte
      const fontSize = text.length > 20 ? 64 : 100;
      const lineHeight = Math.round(fontSize * 1.25);
      const linhas = quebrarLinhas(text, fontSize);
      const totalHeight = linhas.length * lineHeight;
      const startY = Math.round((SIZE - totalHeight) / 2);

      // Monta filtros drawtext — um por linha
      const drawtextFilters = linhas.map((linha, i) => {
        const y = startY + i * lineHeight;
        const textoEscapado = escaparFFmpeg(linha);
        return (
          `drawtext=fontfile='${FONT_PATH}':` +
          `text='${textoEscapado}':` +
          `fontsize=${fontSize}:` +
          `fontcolor=black:` +
          `x=(w-text_w)/2:` +
          `y=${y}`
        );
      });

      const vf = `color=c=${BRAT_GREEN}:size=${SIZE}x${SIZE}[bg];[bg]${drawtextFilters.join(",")}`;

      await execPromise(
        `ffmpeg -f lavfi -i "color=c=${BRAT_GREEN}:size=${SIZE}x${SIZE}:rate=1" ` +
        `-vf "${drawtextFilters.join(",")}" ` +
        `-frames:v 1 ` +
        `-c:v png ` +
        `"${pngPath}"`
      );

      if (!fs.existsSync(pngPath)) {
        throw new Error("FFmpeg não gerou o arquivo PNG");
      }

      const username =
        webMessage.pushName ||
        webMessage.notifyName ||
        (userLid || "").replace(/@\S+/, "");

      const metadata = {
        username,
        botName: `${BOT_EMOJI} ${BOT_NAME}`,
      };

      finalStickerPath = await processStaticSticker(pngPath, metadata);

      await sendSuccessReact();
      await sendStickerFromFile(finalStickerPath);

    } catch (e) {
      console.error("[BRAT2] Erro:", e.message);
      await sendErrorReply(`❌ Erro ao gerar o sticker Brat2.\n\n💡 ${e.message}`);
    } finally {
      if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
      if (finalStickerPath && fs.existsSync(finalStickerPath)) fs.unlinkSync(finalStickerPath);
    }
  },
};
