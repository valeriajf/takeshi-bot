/**
 * Evento chamado quando uma mensagem
 * é enviada para o grupo do WhatsApp
 *
 * @author Dev Gui
 */
const {
  isAtLeastMinutesInPast,
  GROUP_PARTICIPANT_ADD,
  GROUP_PARTICIPANT_LEAVE,
  isAddOrLeave,
} = require("../utils");
const { DEVELOPER_MODE } = require("../config");
const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onGroupParticipantsUpdate } = require("./onGroupParticipantsUpdate");
const { errorLog, infoLog } = require("../utils/logger");
const { badMacHandler } = require("../utils/badMacHandler");
const { checkIfMemberIsMuted } = require("../utils/database");
const { messageHandler } = require("./messageHandler");
const fs = require("fs");
const path = require("path");

// ✅ IMPORTAÇÃO DO REGISTRADOR DE ATIVIDADE
const { registrarMensagem } = require("../utils/atividade");

exports.onMessagesUpsert = async ({ socket, messages, startProcess }) => {
  if (!messages.length) return;

  for (const webMessage of messages) {
    if (DEVELOPER_MODE) {
      infoLog(
        `\n\n⪨========== [ MENSAGEM RECEBIDA ] ==========⪩ \n\n${JSON.stringify(
          messages,
          null,
          2
        )}`
      );
    }

    try {
      const timestamp = webMessage.messageTimestamp;

      if (webMessage?.message) {
        messageHandler(socket, webMessage);

        // ✅ REGISTRANDO MENSAGEM PARA RANKING POR GRUPO
        try {
          const groupId = webMessage.key.remoteJid;
          const userId = webMessage.key.participant || groupId;
          const nome =
            webMessage.pushName || webMessage.sender?.pushName || "Desconhecido";
          const isGroup = groupId.endsWith("@g.us");

          if (!webMessage.key.fromMe && isGroup) {
            registrarMensagem(groupId, userId, nome);
          }
        } catch (e) {
          errorLog(`Erro ao registrar mensagem para ranking: ${e.message}`);
        }
      }

      // 🎵 Áudios automáticos por palavras-chave
      try {
        const msg = webMessage;
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          "";

        const lowered = text.toLowerCase();

        const triggers = [
          { keyword: "vagabunda", file: "vagabunda.mp3" },
          { keyword: "tá bom", file: "vcfalademais.mp3" },
          { keyword: "prostituta", file: "eiprostituta.mp3" },
          { keyword: "corno", file: "corno.mp3" },
          { keyword: "flamengo", file: "flamengo.mp3" },
          { keyword: "louça", file: "louça.mp3" },
          { keyword: "pics", file: "pix.mp3" },
          { keyword: "show", file: "xoudaxuxa.mp3" },
          { keyword: "oremos", file: "ferrolhos.mp3" },
          { keyword: "carolis", file:
            "carolis.mp3" },
        ];

        for (const { keyword, file } of triggers) {
          if (lowered.includes(keyword)) {
            const audioPath = path.resolve(__dirname, `../audios/${file}`);

            if (fs.existsSync(audioPath)) {
              await socket.sendMessage(
                msg.key.remoteJid,
                {
                  audio: { url: audioPath },
                  mimetype: "audio/mpeg",
                  ptt: true,
                },
                { quoted: msg }
              );
            } else {
              console.error(`Arquivo de áudio não encontrado: ${audioPath}`);
            }

            break;
          }
        }
      } catch (e) {
        errorLog(`Erro ao tentar responder com áudio: ${e.message}`);
      }

      if (isAtLeastMinutesInPast(timestamp)) {
        continue;
      }

      if (isAddOrLeave.includes(webMessage.messageStubType)) {
        let action = "";
        if (webMessage.messageStubType === GROUP_PARTICIPANT_ADD) {
          action = "add";
        } else if (webMessage.messageStubType === GROUP_PARTICIPANT_LEAVE) {
          action = "remove";
        }

        await onGroupParticipantsUpdate({
          userJid: webMessage.messageStubParameters[0],
          remoteJid: webMessage.key.remoteJid,
          socket,
          action,
        });
      } else {
        const commonFunctions = loadCommonFunctions({ socket, webMessage });

        if (!commonFunctions) continue;

        if (
          checkIfMemberIsMuted(
            commonFunctions.remoteJid,
            commonFunctions.userJid
          )
        ) {
          try {
            await commonFunctions.deleteMessage(webMessage.key);
          } catch (error) {
            errorLog(
              `Erro ao deletar mensagem de membro silenciado, provavelmente o bot não é administrador do grupo! ${error.message}`
            );
          }

          return;
        }

        await dynamicCommand(commonFunctions, startProcess);
      }
    } catch (error) {
      if (badMacHandler.handleError(error, "message-processing")) {
        continue;
      }

      if (badMacHandler.isSessionError(error)) {
        errorLog(`Erro de sessão ao processar mensagem: ${error.message}`);
        continue;
      }

      errorLog(`Erro ao processar mensagem: ${error.message}`);
      continue;
    }
  }
};