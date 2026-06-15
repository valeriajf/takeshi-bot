/**
 * SISTEMA DE ÁUDIOS AUTOMÁTICOS POR PALAVRA-CHAVE
 *
 * Lê as keywords do banco audioKeywords.json e envia o .ogg
 * correspondente quando a palavra aparece em qualquer mensagem de grupo.
 *
 * Como adicionar um novo áudio:
 *   1. Coloque o arquivo .ogg em:  assets/audios/novosom.ogg
 *   2. Abra database/audioKeywords.json e adicione:
 *        "palavra": "novosom.ogg"
 *
 * @author Dev VaL (DeadBoT)
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DB_PATH   = path.join(__dirname, "..", "..", "database", "audioKeywords.json");
const AUDIO_DIR = path.join(__dirname, "..", "..", "assets", "audios");

function normalize(text) {
    return (text || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function loadKeywords() {
    try {
        if (!fs.existsSync(DB_PATH)) return {};
        const raw = fs.readFileSync(DB_PATH, "utf8");
        const data = JSON.parse(raw);
        if (data && typeof data === "object") return data;
    } catch (e) {
        console.error("❌ [AUDIO-KEYWORDS] Erro ao carregar audioKeywords.json:", e.message);
    }
    return {};
}

export async function handleAudioKeywords({ socket, webMessage }) {
    const chatId = webMessage.key.remoteJid;
    const fromMe = webMessage.key.fromMe;

    if (fromMe || !chatId?.endsWith("@g.us")) return;

    const msgText =
        webMessage.message?.extendedTextMessage?.text ||
        webMessage.message?.conversation ||
        "";

    if (!msgText) return;

    const normalizedMsg = normalize(msgText);
    const keywords = loadKeywords();

    for (const [keyword, filename] of Object.entries(keywords)) {
        if (normalizedMsg.includes(normalize(keyword))) {
            const audioPath = path.join(AUDIO_DIR, filename);

            if (!fs.existsSync(audioPath)) {
                console.warn(`⚠️ [AUDIO-KEYWORDS] Arquivo não encontrado: ${audioPath}`);
                break;
            }

            try {
                await socket.sendMessage(chatId, {
                    audio: fs.readFileSync(audioPath),
                    mimetype: "audio/mp4",
                    ptt: true,
                });
            } catch (err) {
                console.error(`❌ [AUDIO-KEYWORDS] Erro ao enviar áudio "${filename}":`, err.message);
            }

            break;
        }
    }
}
