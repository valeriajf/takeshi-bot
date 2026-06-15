/**
 * Evento chamado quando um usuário
 * entra ou sai de um grupo de WhatsApp.
 *
 * @author Dev Gui
 */

import fs from "node:fs";
import path from "node:path";
import { welcomeMessage } from "../messages.js";
import { getProfileImageData } from "../services/baileys.js";
import {
  isActiveGroup,
  isActiveWelcomeGroup,
} from "../utils/database.js";
import { extractUserLid, onlyNumbers } from "../utils/index.js";
import { errorLog } from "../utils/logger.js";
import { isBlacklisted } from "../utils/blacklistSystem.js";
import { onMembroEntrou, onMembroSaiu } from "../utils/apresentacao-monitor.js";

const EXIT2_DB_PATH = path.resolve(
  process.cwd(),
  "database",
  "exit-messages.json"
);

function loadExit2() {
  try {
    if (!fs.existsSync(EXIT2_DB_PATH)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(EXIT2_DB_PATH, "utf8")
    );
  } catch (error) {
    console.error("[EXIT2] Erro ao carregar banco:", error);
    return {};
  }
}

const processedExits = new Set();

export async function onGroupParticipantsUpdate({
  data,
  remoteJid,
  socket,
  action,
}) {
  try {
    if (!remoteJid.endsWith("@g.us")) {
      return;
    }

    if (!isActiveGroup(remoteJid)) {
      return;
    }

    const userLid = extractUserLid(data);

    const eventKey =
      `${remoteJid}:${userLid}:${action}`;

    global.processedGroupEvents ??= new Set();

    if (global.processedGroupEvents.has(eventKey)) {
      return;
    }

    global.processedGroupEvents.add(eventKey);

    setTimeout(() => {
      global.processedGroupEvents.delete(eventKey);
    }, 10000);
    
    // =========================================
    // LISTA NEGRA
    // =========================================
    if (action === "add") {
      const phoneNumber =
        data?.phoneNumber ||
        data?.phone_number ||
        "";

      const blacklisted = isBlacklisted(
        remoteJid,
        phoneNumber
      );

      if (blacklisted) {
        global.removedByAdmin ??= new Set();

        global.removedByAdmin.add(userLid);

        setTimeout(() => {
          global.removedByAdmin.delete(userLid);
        }, 15000);

        try {
          await socket.groupParticipantsUpdate(
            remoteJid,
            [userLid],
            "remove"
          );

          await socket.sendMessage(remoteJid, {
            text:
              `🚫 *LISTA NEGRA*\n\n` +
              `👤 Usuário: @${onlyNumbers(phoneNumber)}\n\n` +
              `⚠️ Este usuário está na lista negra e foi removido automaticamente.`,
            mentions: [userLid],
          });
        } catch (error) {
          errorLog(
            `[BLACKLIST] Erro ao remover usuário da lista negra: ${error.message}`
          );
        }

        return;
      }
    }
    
    // =========================================
    // IGNORAR BANIMENTOS E REMOÇÕES DE ADM
    // =========================================
    if (
      action === "remove" &&
      global.removedByAdmin?.has(userLid)
    ) {
      global.removedByAdmin.delete(userLid);

      return;
    }

    // ==================================================
    // BOAS-VINDAS
    // ==================================================
    if (isActiveWelcomeGroup(remoteJid) && action === "add") {
      const { buffer, profileImage } =
        await getProfileImageData(
          socket,
          remoteJid
        );

      const hasMemberMention =
        welcomeMessage.includes("@member");

      const mentions = [];
      let finalWelcomeMessage =
        welcomeMessage;

      if (hasMemberMention) {
        const userNumber =
          onlyNumbers(userLid);

        finalWelcomeMessage =
          welcomeMessage.replace(
            "@member",
            `@${userNumber}`
          );

        mentions.push(userLid);
      }

      if (buffer) {
        try {
          await socket.sendMessage(
            remoteJid,
            {
              image: buffer,
              caption: finalWelcomeMessage,
              mentions,
            }
          );
        } catch {
          await socket.sendMessage(
            remoteJid,
            {
              text: finalWelcomeMessage,
              mentions,
            }
          );
        }
      } else {
        await socket.sendMessage(
          remoteJid,
          {
            text: finalWelcomeMessage,
            mentions,
          }
        );
      }

      if (
        profileImage &&
        !profileImage.includes("default-user")
      ) {
        fs.unlinkSync(profileImage);
      }
    }

    // 🎤 SISTEMA DE APRESENTAÇÃO — inicia timer após boas-vindas
    if (action === "add") {
      try {
        await onMembroEntrou({ groupJid: remoteJid, membroJid: userLid });
      } catch (e) {}
    }

    // 🎤 SISTEMA DE APRESENTAÇÃO — cancela timer quando membro sai
    if (action === "remove") {
      try {
        onMembroSaiu({ groupJid: remoteJid, membroJid: userLid });
      } catch (e) {}
    }

    // ==================================================
    // EXIT2
    // ==================================================
    if (action === "remove") {
      const exitData = loadExit2();

      const groupExit = exitData[remoteJid];

      if (!groupExit || !groupExit.active) {
        return;
      }

      const groupMetadata =
        await socket.groupMetadata(remoteJid);

      const groupName =
        groupMetadata?.subject || "Grupo";

      const mentions = [];
      const userNumber = onlyNumbers(userLid);

      let finalExitMessage =
        groupExit.message ||
        "👋 {membro} saiu do {grupo}!";

      finalExitMessage = finalExitMessage
        .replace(/\{membro\}/gi, `@${userNumber}`)
        .replace(/\{grupo\}/gi, groupName)
        .replace(/@member/gi, `@${userNumber}`);

      mentions.push(userLid);

      await socket.sendMessage(remoteJid, {
        text: finalExitMessage,
        mentions,
      });
    }
  } catch (error) {
    errorLog(
      `Erro em onGroupParticipantsUpdate: ${error.message}`
    );

    errorLog(
      JSON.stringify(
        error,
        null,
        2
      )
    );
  }
}
