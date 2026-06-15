/**
 * customMiddleware.js
 * Middleware customizado do DeadBoT.
 *
 * Chamado em dois momentos:
 * - type: "message"     -> antes de processar qualquer mensagem
 * - type: "participant" -> antes de processar eventos add/remove
 *
 * @author Val (DeadBoT)
 */

import { handleNameTrigger } from "../services/nameTrigger.js";
import { onMensagemRecebida } from "../utils/apresentacao-monitor.js";
import { keywordStickerMiddleware } from "./keywordSticker.js";
import {
  isAFK,
  removeAFK,
  getAFKData,
  getAFKDuration,
  formatDuration,
} from "../utils/afkDatabase.js";

export async function customMiddleware({
  socket,
  webMessage,
  type,
  commonFunctions,
  action,
  data,
}) {
  if (type !== "message") return;

  // NAME TRIGGER — responde quando alguém menciona "DeadBoT"
  await handleNameTrigger({ socket, fullMessage: webMessage });

  // dentro do seu middleware principal:
await keywordStickerMiddleware({ socket, webMessage, type, commonFunctions, action, data });

  // 🎤 SISTEMA DE APRESENTAÇÃO — cancela timer quando membro envia mensagem
  // Roda antes de qualquer outro processamento para evitar bans indevidos
  try {
    const remoteJid = webMessage?.key?.remoteJid;
    const autorJid = webMessage?.key?.participant || webMessage?.key?.remoteJid;
    if (remoteJid?.endsWith("@g.us") && autorJid && !webMessage?.key?.fromMe) {
      onMensagemRecebida({ groupJid: remoteJid, autorJid, webMessage });
    }
  } catch (e) {}

  // AFK
  try {
    const key = webMessage?.key;
    if (!key || key.fromMe) return;

    const remoteJid = key.remoteJid;
    if (!remoteJid?.endsWith("@g.us")) return;

    const userLid = key.participant || key.remoteJid;

    // 1. Usuário voltou do AFK
    if (isAFK(remoteJid, userLid)) {
      const afkEntry = removeAFK(remoteJid, userLid);

      if (afkEntry) {
        const duration = formatDuration(Date.now() - afkEntry.startTime);
        const now = new Date();
        const timeString = now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        });
        const dateString = now.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });

        await socket.sendMessage(remoteJid, {
          text: `👋 @${userLid.split("@")[0]} voltou!\n\n🕐 ${timeString} | 📅 ${dateString}\n⏱️ Ficou ausente por: ${duration}\n💭 Motivo anterior: ${afkEntry.reason}`,
          mentions: [userLid],
        }, { quoted: webMessage });
      }

      return;
    }

    // 2. Alguém mencionou (@) ou respondeu (reply) mensagem de usuário AFK
    // Pega contextInfo de qualquer tipo de mensagem
    const contextInfo =
      webMessage.message?.extendedTextMessage?.contextInfo ??
      webMessage.message?.imageMessage?.contextInfo ??
      webMessage.message?.videoMessage?.contextInfo ??
      webMessage.message?.audioMessage?.contextInfo ??
      webMessage.message?.stickerMessage?.contextInfo ??
      {};

    // Junta menções diretas + autor do quoted (reply), sem duplicatas
    const mentionedSet = new Set(contextInfo.mentionedJid ?? []);
    const quotedParticipant = contextInfo.participant;
    if (quotedParticipant) mentionedSet.add(quotedParticipant);

    for (const mentionedLid of mentionedSet) {
      if (mentionedLid === userLid) continue;
      if (!isAFK(remoteJid, mentionedLid)) continue;

      const afkEntry = getAFKData(remoteJid, mentionedLid);
      const duration = getAFKDuration(remoteJid, mentionedLid);

      const afkDate = new Date(afkEntry.timestamp);
      const afkTimeString = afkDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      });
      const afkDateString = afkDate.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });

      await socket.sendMessage(remoteJid, {
        text: `💤 @${mentionedLid.split("@")[0]} está ausente desde ${afkDateString} às ${afkTimeString}\n\n⏱️ Ausente há: ${duration}\n💭 Motivo: ${afkEntry.reason}`,
        mentions: [mentionedLid],
      }, { quoted: webMessage });
    }
  } catch (err) {
    console.error("❌ [AFK Middleware] Erro:", err.message);
  }
}
