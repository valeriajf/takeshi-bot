// src/middlewares/keywordSticker.js
// Dev VaL - DeadBoT → Takeshi Bot (ESM)

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __dirname = dirname(fileURLToPath(import.meta.url));

const KEYWORD_MAP_PATH = join(
  __dirname,
  "..",
  "..",
  "database",
  "keyword.json"
);

const KEYWORD_INDEX_PATH = join(
  __dirname,
  "..",
  "..",
  "database",
  "keywordIndex.json"
);

function loadKeywordMap() {
  try {
    const raw = readFileSync(KEYWORD_MAP_PATH, "utf8");
    const data = JSON.parse(raw);

    console.log(
      `[KEYWORD-STICKER] Banco carregado com ${Object.keys(data).length} palavras`
    );

    return data;
  } catch (err) {
    console.error(
      "[KEYWORD-STICKER] Erro ao carregar keyword.json:",
      err?.message
    );

    return {};
  }
}

function loadKeywordIndex() {
  try {
    if (!existsSync(KEYWORD_INDEX_PATH)) {
      writeFileSync(
        KEYWORD_INDEX_PATH,
        JSON.stringify({}, null, 2)
      );

      return {};
    }

    const raw = readFileSync(KEYWORD_INDEX_PATH, "utf8");

    return JSON.parse(raw);
  } catch (err) {
    console.error(
      "[KEYWORD-STICKER] Erro ao carregar keywordIndex:",
      err?.message
    );

    return {};
  }
}

function saveKeywordIndex(data) {
  try {
    writeFileSync(
      KEYWORD_INDEX_PATH,
      JSON.stringify(data, null, 2)
    );
  } catch (err) {
    console.error(
      "[KEYWORD-STICKER] Erro ao salvar keywordIndex:",
      err?.message
    );
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function downloadSticker(url) {
  console.log(
    "[KEYWORD-STICKER] Baixando:",
    url
  );

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
  });

  return Buffer.from(response.data);
}

function getNextStickerUrl(keyword, value, indexes) {
  const urls = Array.isArray(value)
    ? value
    : [value];

  if (!urls.length) {
    return null;
  }

  let currentIndex = indexes[keyword] ?? 0;

  if (currentIndex >= urls.length) {
    currentIndex = 0;
  }

  const selectedUrl = urls[currentIndex];

  indexes[keyword] =
    (currentIndex + 1) % urls.length;

  console.log(
    `[KEYWORD-STICKER] ${keyword} -> índice ${currentIndex}/${urls.length}`
  );

  return selectedUrl;
}

export async function keywordStickerMiddleware({
  socket,
  webMessage,
  type,
}) {
  try {
    if (type !== "message") return;

    const remoteJid =
      webMessage?.key?.remoteJid;

    if (!remoteJid?.endsWith("@g.us")) {
      return;
    }

    const msg = webMessage?.message;

    const rawText =
      msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.videoMessage?.caption ||
      "";

    if (!rawText.trim()) {
      return;
    }

    const normalizedText =
      normalize(rawText);

    console.log(
      "[KEYWORD-STICKER] Texto:",
      normalizedText
    );

    const keywordMap =
      loadKeywordMap();

    const keywordIndexes =
      loadKeywordIndex();

    for (const [keyword, value] of Object.entries(
      keywordMap
    )) {
      const normalizedKeyword =
        normalize(keyword);

      // AGORA FUNCIONA COM FRASES
      if (
        !normalizedText.includes(
          normalizedKeyword
        )
      ) {
        continue;
      }

      console.log(
        `[KEYWORD-STICKER] Palavra encontrada: ${keyword}`
      );

      const stickerUrl =
        getNextStickerUrl(
          keyword,
          value,
          keywordIndexes
        );

      if (!stickerUrl) {
        continue;
      }

      saveKeywordIndex(keywordIndexes);

      try {
        const stickerBuffer =
          await downloadSticker(
            stickerUrl
          );

        console.log(
          `[KEYWORD-STICKER] Buffer: ${stickerBuffer.length} bytes`
        );

        await socket.sendMessage(
          remoteJid,
          {
            sticker: stickerBuffer,
          },
          {
            quoted: webMessage,
          }
        );

        console.log(
          "[KEYWORD-STICKER] Figurinha enviada"
        );

        break;
      } catch (err) {
        console.error(
          "[KEYWORD-STICKER] Erro ao enviar figurinha:",
          err?.message
        );
      }
    }
  } catch (err) {
    console.error(
      "[KEYWORD-STICKER] Erro geral:",
      err
    );
  }
}