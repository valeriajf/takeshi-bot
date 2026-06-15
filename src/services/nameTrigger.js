import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// .../src/services/ → ../../database/deadbot-name-trigger.json
const FRASES_PATH = join(__dirname, "..", "..", "database", "deadbot-name-trigger.json");

/**
 * Retorna uma frase aleatória do JSON de configuração.
 * @returns {string|null}
 */
function getRandomPhrase() {
  try {
    if (!existsSync(FRASES_PATH)) {
      console.warn("[NAME-TRIGGER] Arquivo não encontrado:", FRASES_PATH);
      return null;
    }

    const frases = JSON.parse(readFileSync(FRASES_PATH, "utf-8"));

    if (!Array.isArray(frases) || frases.length === 0) {
      console.warn("[NAME-TRIGGER] Nenhuma frase encontrada.");
      return null;
    }

    return frases[Math.floor(Math.random() * frases.length)];
  } catch (err) {
    console.error("[NAME-TRIGGER] Erro ao carregar frases:", err.message);
    return null;
  }
}

/**
 * Verifica se a mensagem menciona o nome do bot.
 * Detecta: "deadbot", "DeadBoT", "Deadbot" — qualquer capitalização, palavra isolada.
 * @param {string} text
 * @returns {boolean}
 */
function mentionsDeadBot(text) {
  if (!text || typeof text !== "string") return false;
  return /\bdeadbot\b/i.test(text);
}

/**
 * Handler principal do name trigger.
 * Chamado pelo customMiddleware.js apenas quando type === "message".
 *
 * @param {{ socket: object, fullMessage: object }} params
 * @returns {Promise<boolean>} true se respondeu, false caso contrário
 */
export async function handleNameTrigger({ socket, fullMessage }) {
  const remoteJid = fullMessage?.key?.remoteJid;

  // Só grupos
  if (!remoteJid?.endsWith("@g.us")) return false;

  // Não reagir às próprias mensagens
  if (fullMessage?.key?.fromMe) return false;

  // Extrair texto da mensagem
  const text =
    fullMessage?.message?.conversation ||
    fullMessage?.message?.extendedTextMessage?.text ||
    "";

  if (!mentionsDeadBot(text)) return false;

  const frase = getRandomPhrase();
  if (!frase) return false;

  await socket.sendMessage(remoteJid, { text: frase }, { quoted: fullMessage });

  return true;
}
