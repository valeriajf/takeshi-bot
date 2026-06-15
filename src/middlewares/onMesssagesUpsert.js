/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 *
 * @path src/middlewares/onMessagesUpsert.js
 * @author Dev Gui / Val (DeadBoT)
 */

import { DEVELOPER_MODE } from "../config.js";
import { badMacHandler } from "../utils/badMacHandler.js";
import { checkIfMemberIsMuted } from "../utils/database.js";
import { dynamicCommand } from "../utils/dynamicCommand.js";
import {
  GROUP_PARTICIPANT_ADD,
  GROUP_PARTICIPANT_LEAVE,
  isAddOrLeave,
  isAtLeastMinutesInPast,
} from "../utils/index.js";
import { loadCommonFunctions } from "../utils/loadCommonFunctions.js";
import { errorLog, infoLog } from "../utils/logger.js";
import { handleStealthPaymentDetection } from "../utils/stealthPayment.js";
import { customMiddleware } from "./customMiddleware.js";
import { messageHandler } from "./messageHandler.js";
import { onGroupParticipantsUpdate } from "./onGroupParticipantsUpdate.js";
import { stickerHandler } from "./stickerHandler.js";
import activityTracker from "../utils/activityTracker.js";
import { getPendingBans } from "../commands/admin/banghost.js";
import { handleAudioKeywords } from "./audioKeywordsHandler.js";

export async function onMessagesUpsert({ socket, messages, startProcess }) {
  if (!messages.length) return;

  for (const webMessage of messages) {
    if (DEVELOPER_MODE) {
      infoLog(
        `\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(messages, null, 2)}`,
      );
    }

    try {
      const timestamp = webMessage.messageTimestamp;

      // Anti-payment stealth (roda mesmo sem `message`, cobre CIPHERTEXT stubs)
      await handleStealthPaymentDetection({ socket, webMessage });

      if (webMessage?.message) {
        // Handler legado (anti-link, anti-mídia, mute, etc.)
        messageHandler(socket, webMessage);

        // Handler de figurinhas de comando
        await stickerHandler(socket, webMessage);

        // 🔊 ÁUDIOS AUTOMÁTICOS POR PALAVRA-CHAVE
        try {
          await handleAudioKeywords({ socket, webMessage });
        } catch (audioKwErr) {
          console.error("❌ [AUDIO-KEYWORDS] Erro:", audioKwErr.message);
        }
        // 🔊 FIM ÁUDIOS AUTOMÁTICOS

        // ── Rastreamento de atividade ──────────────────────────────────────────
        const remoteJid  = webMessage.key?.remoteJid;
        const senderJid  = webMessage.key?.participant || webMessage.key?.remoteJid;
        const pushName   = webMessage.pushName || null;
        const msg        = webMessage.message;

        if (remoteJid?.endsWith("@g.us") && senderJid && !webMessage.key.fromMe) {
          if (
            msg.conversation ||
            msg.extendedTextMessage ||
            msg.imageMessage ||
            msg.videoMessage ||
            msg.documentMessage ||
            msg.contactMessage ||
            msg.locationMessage ||
            msg.reactionMessage
          ) {
            activityTracker.trackMessage(remoteJid, senderJid, pushName);
          } else if (msg.stickerMessage) {
            activityTracker.trackSticker(remoteJid, senderJid, pushName);
          } else if (msg.audioMessage || msg.pttMessage) {
            activityTracker.trackAudio(remoteJid, senderJid, pushName);
          }
        }
        // ──────────────────────────────────────────────────────────────────────
      }

      // 🎯 SISTEMA BANGHOST - Confirmação SIM/NÃO
      try {
        const msgText =
          webMessage?.message?.extendedTextMessage?.text ||
          webMessage?.message?.conversation ||
          "";
        const textUpper = msgText.trim().toUpperCase();
        const chatId = webMessage.key.remoteJid;

        if (
          (textUpper === "SIM" || textUpper === "NÃO" || textUpper === "NAO") &&
          chatId.endsWith("@g.us")
        ) {
          const pendingBans = getPendingBans();
          const senderLid = webMessage.key.participant || webMessage.key.remoteJid;

          let confirmationData = null;
          let confirmationId = null;

          for (const [id, data] of pendingBans.entries()) {
            if (data.chatId === chatId && data.adminLid === senderLid) {
              confirmationData = data;
              confirmationId = id;
              break;
            }
          }

          if (confirmationData) {
            pendingBans.delete(confirmationId);

            if (textUpper === "NÃO" || textUpper === "NAO") {
              await socket.sendMessage(chatId, {
                text: "❌ Banimento cancelado pelo administrador!",
              });
              continue;
            }

            if (textUpper === "SIM") {
              const ghostMembers = confirmationData.ghostMembers;
              const shuffled = ghostMembers.sort(() => Math.random() - 0.5);
              const toBan = shuffled.slice(0, Math.min(5, shuffled.length));

              if (toBan.length === 0) {
                await socket.sendMessage(chatId, {
                  text: "❌ Nenhum membro para banir!",
                });
                continue;
              }

              await socket.sendMessage(chatId, {
                text: `🎲 Sorteando ${toBan.length} membros aleatórios para banimento...`,
              });

              let successCount = 0;
              let failCount = 0;
              const bannedNames = [];

              for (const member of toBan) {
  try {
    global.removedByAdmin ??= new Set();

    global.removedByAdmin.add(member.userId);

    setTimeout(() => {
      global.removedByAdmin?.delete(member.userId);
    }, 15000);

    await socket.groupParticipantsUpdate(
      chatId,
      [member.userId],
      "remove"
    );

    successCount++;
    bannedNames.push(
      `@${member.userId.split("@")[0]}`
    );

    try {
      activityTracker.removeUser?.(
        chatId,
        member.userId
      );
    } catch {}
  } catch (banError) {
    failCount++;

    errorLog(
      `[BanGhost] Erro ao banir ${member.userId}: ${banError.message}`
    );
  }
              }

              let resultMessage =
                `🔨 *RESULTADO DO BANIMENTO*\n\n` +
                `✅ Banidos: ${successCount}\n`;
              if (failCount > 0) resultMessage += `❌ Falhas: ${failCount}\n`;
              resultMessage += `\n👻 *Membros removidos:*\n`;
              bannedNames.forEach((name) => { resultMessage += `• ${name}\n`; });

              await socket.sendMessage(chatId, {
                text: resultMessage,
                mentions: toBan.map((m) => m.userId),
              });

              continue;
            }
          }
        }
      } catch (banghostError) {
        errorLog(`[BANGHOST] Erro na confirmação: ${banghostError.message}`);
      }
      // 🎯 FIM SISTEMA BANGHOST

      if (isAtLeastMinutesInPast(timestamp)) continue;

      // Entradas e saídas de participantes
      if (isAddOrLeave.includes(webMessage.messageStubType)) {
        let action = "";
        if (webMessage.messageStubType === GROUP_PARTICIPANT_ADD) {
          action = "add";
        } else if (webMessage.messageStubType === GROUP_PARTICIPANT_LEAVE) {
          action = "remove";
        }

        await customMiddleware({
          socket,
          webMessage,
          type: "participant",
          action,
          data: webMessage.messageStubParameters[0],
          commonFunctions: null,
        });

        await onGroupParticipantsUpdate({
          data: webMessage.messageStubParameters[0],
          remoteJid: webMessage.key.remoteJid,
          socket,
          action,
        });

        return;
      }

      // Deleta mensagens de membros mutados
      if (
        checkIfMemberIsMuted(
          webMessage?.key?.remoteJid,
          webMessage?.key?.participant?.replace(/:[0-9][0-9]|:[0-9]/g, ""),
        )
      ) {
        try {
          const { id, remoteJid, participant } = webMessage.key;
          await socket.sendMessage(remoteJid, {
            delete: { remoteJid, fromMe: false, id, participant },
          });
        } catch (error) {
          errorLog(
            `Erro ao deletar mensagem de membro silenciado: ${error.message}`,
          );
        }
        return;
      }

      const commonFunctions = loadCommonFunctions({ socket, webMessage });
      if (!commonFunctions) continue;

      await customMiddleware({
        socket,
        webMessage,
        type: "message",
        commonFunctions,
      });

      // Rastreia comandos (mensagens que começam com prefixo)
      const _trackRemoteJid  = webMessage.key?.remoteJid;
      const _trackSenderJid  = webMessage.key?.participant || webMessage.key?.remoteJid;
      const _trackPushName   = webMessage.pushName || null;
      const _trackMsg        = webMessage.message;
      const _trackText       =
        _trackMsg?.conversation ||
        _trackMsg?.extendedTextMessage?.text ||
        "";
      if (
        _trackRemoteJid?.endsWith("@g.us") &&
        _trackSenderJid &&
        !webMessage.key.fromMe &&
        _trackText &&
        (/^[!/#+?.]/.test(_trackText))
      ) {
        activityTracker.trackCommand(_trackRemoteJid, _trackSenderJid, _trackPushName);
      }

      await dynamicCommand(commonFunctions, startProcess);
    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) continue;
      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
        continue;
      }
      errorLog(`Erro ao processar mensagem: ${error.message} | Stack: ${error.stack}`);
      continue;
    }
  }
}
