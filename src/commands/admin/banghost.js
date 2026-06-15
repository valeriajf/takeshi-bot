/**
 * Comando BanGhost - Lista e bane membros fantasmas (inativos)
 *
 * LÓGICA:
 * - Lista até 10 membros com atividade <= critério
 * - Se confirmar SIM, bane 5 aleatórios dos 10 listados (tipo roleta-russa)
 *
 * @author Dev VaL
 * @system DeadBoT - ESM Base
 */

import { PREFIX, BOT_LID, OWNER_LID } from "../../config.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Armazenamento temporário para confirmações de banimento
// Exposto via getPendingBans() para o bloco SIM/NÃO no onMessagesUpsert
const pendingBans = new Map();

export function getPendingBans() {
  return pendingBans;
}

export default {
  name: "banghost",
  description: "Lista até 10 membros fantasmas e pode banir 5 aleatórios",
  commands: ["banghost", "banfantasma"],
  usage: `${PREFIX}banghost [número]`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    sendErrorReply,
    remoteJid,
    isGroup,
    userLid,
    getGroupParticipants,
    socket,
    args,
    webMessage,
  }) => {
    try {
      if (!isGroup) {
        await sendWarningReact();
        return await sendReply("⚠️ Este comando só pode ser usado em grupos!");
      }

      const text =
        webMessage?.message?.conversation ||
        webMessage?.message?.extendedTextMessage?.text ||
        "";
      const textUpper = text.trim().toUpperCase();

      // Ignora respostas SIM/NÃO (tratadas pelo bloco de confirmação)
      if (
        textUpper === "SIM" ||
        textUpper === "NÃO" ||
        textUpper === "NAO"
      ) {
        return;
      }

      const participants = await getGroupParticipants();

      // --- Verifica se o usuário é admin ---
      const userParticipant = participants.find(
        (p) => p.id === userLid || p.lid === userLid
      );
      const isUserAdmin =
        userParticipant &&
        (userParticipant.admin === "admin" ||
          userParticipant.admin === "superadmin");

      if (!isUserAdmin) {
        await sendWarningReact();
        return await sendReply(
          "❌ Apenas administradores podem usar este comando!"
        );
      }

      // --- Verifica se o bot é admin ---
      const botLidFromSocket = socket.user?.lid;
      const botLidClean = botLidFromSocket?.split(":")[0] + "@lid";

      let botParticipant = participants.find((p) => p.id === botLidClean);
      if (!botParticipant && botLidFromSocket) {
        botParticipant = participants.find((p) => p.id === botLidFromSocket);
      }

      const isBotAdmin =
        botParticipant &&
        (botParticipant.admin === "admin" ||
          botParticipant.admin === "superadmin");

      // Se bot não é admin, apenas lista sem oferecer banimento
      if (!isBotAdmin) {
        await sendWarningReact();
        await executeListOnly(remoteJid, args, sendReply, getGroupParticipants, socket);
        return;
      }

      await sendSuccessReact();

      const minMessages = parseInt(args[0]) || 0;

      if (minMessages < 0) {
        await sendWarningReact();
        return await sendReply("❌ O número deve ser maior ou igual a 0!");
      }

      // --- Carrega activityTracker via createRequire (CJS) ---
      const activityTracker = require("../../utils/activityTracker");
      const groupStats = activityTracker.getGroupStats(remoteJid);

      const groupMetadata = await socket.groupMetadata(remoteJid);
      const groupName = groupMetadata.subject || "Grupo";

      const ghostMembers = [];

      for (const participant of participants) {
        const userId = participant.id;
        const isAdmin =
          participant.admin === "admin" ||
          participant.admin === "superadmin";

        if (isAdmin) continue;

        // Filtra o próprio bot e o owner
        const isBot =
          userId === BOT_LID ||
          userId === botLidClean ||
          userId === botLidFromSocket;
        if (isBot) continue;

        if (OWNER_LID) {
          const ownerClean = OWNER_LID.split(":")[0] + "@lid";
          if (userId === OWNER_LID || userId === ownerClean) continue;
        }

        const userData = groupStats[userId];
        const messages = userData ? userData.messages || 0 : 0;
        const stickers = userData ? userData.stickers || 0 : 0;
        const commands = userData ? userData.commands || 0 : 0;
        const audios = userData ? userData.audios || 0 : 0;
        const total = messages + stickers + commands + audios;

        if (total <= minMessages) {
          const displayName = activityTracker.getDisplayName(remoteJid, userId);
          ghostMembers.push({
            userId,
            name: displayName,
            messageCount: messages,
            stickerCount: stickers,
            commandCount: commands,
            audioCount: audios,
            total,
          });
        }
      }

      if (ghostMembers.length === 0) {
        return await sendReply(
          `🎉 *GRUPO ATIVO* 🎉\n` +
            `📅 *Grupo:* ${groupName}\n\n` +
            `✅ Parabéns!\n` +
            `👥 Não há membros com ${minMessages} mensagem(s) ou menos\n` +
            `🏆 Todos estão participando ativamente\n` +
            `💪 Continue incentivando a participação!`
        );
      }

      const shuffledGhosts = ghostMembers.sort(() => Math.random() - 0.5);
      const ghostsToShow = shuffledGhosts.slice(
        0,
        Math.min(10, shuffledGhosts.length)
      );

      const confirmationId = `${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      let listMessage =
        `👻 *MEMBROS FANTASMAS* 👻\n` +
        `📅 *Grupo:* ${groupName}\n` +
        `📊 *Critério:* ${minMessages} mensagem(s) ou menos\n` +
        `👥 *Total encontrados:* ${ghostMembers.length} membros\n` +
        `📋 *Exibindo:* ${ghostsToShow.length} membros\n\n`;

      const mentions = [];
      const ghostEmojis = [
        "💀", "👻", "☠️", "🌑", "🦇",
        "🕷️", "🕸️", "⚰️", "🪦", "💤",
      ];

      ghostsToShow.forEach((member, index) => {
        const emoji = ghostEmojis[index % ghostEmojis.length];
        const userMention = `@${member.userId.split("@")[0]}`;
        mentions.push(member.userId);

        listMessage +=
          `${emoji} 👤${userMention}\n` +
          `   📝 ${member.messageCount} mensagens\n` +
          `   🎭 ${member.stickerCount} figurinhas\n` +
          `   🎮 ${member.commandCount} comandos\n` +
          `   🎤 ${member.audioCount} áudios\n` +
          `   📊 ${member.total} total\n\n`;
      });

      listMessage +=
        `⚠️ *ATENÇÃO:*\n` +
        `Se você confirmar, *5 MEMBROS ALEATÓRIOS* dos ${ghostsToShow.length} listados serão banidos! 🎲\n\n` +
        `Para BANIR 5 aleatórios, digite: *SIM*\n` +
        `Para CANCELAR, digite: *NÃO*\n` +
        `⏰ Você tem 1 minuto para responder...`;

      await sendReply(listMessage, mentions);

      pendingBans.set(confirmationId, {
        chatId: remoteJid,
        adminLid: userLid,
        ghostMembers: ghostsToShow,
        minMessages,
        timestamp: Date.now(),
        expiresAt: Date.now() + 60000,
      });

    } catch (error) {
      await sendErrorReact();
      await sendErrorReply(
        `Ocorreu um erro ao buscar os membros fantasmas: ${error.message}`
      );
    }
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Listagem sem banimento quando bot não é admin
// ────────────────────────────────────────────────────────────────────────────
async function executeListOnly(remoteJid, args, sendReply, getGroupParticipants, socket) {
  try {
    const require = createRequire(import.meta.url);
    const activityTracker = require("../../utils/activityTracker");

    const minMessages = parseInt(args[0]) || 0;
    const participants = await getGroupParticipants();
    const groupStats = activityTracker.getGroupStats(remoteJid);
    const groupMetadata = await socket.groupMetadata(remoteJid);
    const groupName = groupMetadata.subject || "Grupo";

    const ghostMembers = [];

    for (const participant of participants) {
      const userId = participant.id;
      const isAdmin =
        participant.admin === "admin" ||
        participant.admin === "superadmin";
      if (isAdmin) continue;

      const userData = groupStats[userId];
      const messages = userData ? userData.messages || 0 : 0;
      const stickers = userData ? userData.stickers || 0 : 0;
      const commands = userData ? userData.commands || 0 : 0;
      const audios = userData ? userData.audios || 0 : 0;
      const total = messages + stickers + commands + audios;

      if (total <= minMessages) {
        const displayName = activityTracker.getDisplayName(remoteJid, userId);
        ghostMembers.push({
          userId,
          name: displayName,
          messageCount: messages,
          stickerCount: stickers,
          commandCount: commands,
          audioCount: audios,
          total,
        });
      }
    }

    if (ghostMembers.length === 0) {
      return await sendReply(
        `🎉 *GRUPO ATIVO* 🎉\n` +
          `📅 *Grupo:* ${groupName}\n\n` +
          `✅ Parabéns!\n` +
          `👥 Não há membros com ${minMessages} mensagem(s) ou menos\n` +
          `🏆 Todos estão participando ativamente`
      );
    }

    const shuffledGhosts = ghostMembers.sort(() => Math.random() - 0.5);
    const ghostsToShow = shuffledGhosts.slice(
      0,
      Math.min(10, ghostMembers.length)
    );

    let listMessage =
      `👻 *MEMBROS FANTASMAS* 👻\n` +
      `📅 *Grupo:* ${groupName}\n` +
      `📊 *Critério:* ${minMessages} mensagem(s) ou menos\n` +
      `👥 *Total encontrados:* ${ghostMembers.length} membros\n` +
      `📋 *Exibindo:* ${ghostsToShow.length} membros\n` +
      `⚠️ *Bot não é admin - Apenas listando*\n\n`;

    const mentions = [];
    const ghostEmojis = [
      "💀", "👻", "☠️", "🌑", "🦇",
      "🕷️", "🕸️", "⚰️", "🪦", "💤",
    ];

    ghostsToShow.forEach((member, index) => {
      const emoji = ghostEmojis[index % ghostEmojis.length];
      const userMention = `@${member.userId.split("@")[0]}`;
      mentions.push(member.userId);

      listMessage +=
        `${emoji} 👤${userMention}\n` +
        `   📝 ${member.messageCount} mensagens\n` +
        `   🎭 ${member.stickerCount} figurinhas\n` +
        `   🎮 ${member.commandCount} comandos\n` +
        `   🎤 ${member.audioCount} áudios\n` +
        `   📊 ${member.total} total\n\n`;
    });

    listMessage +=
      `💡 *Para banir:*\n` +
      `Torne o bot administrador e use o comando novamente`;

    await sendReply(listMessage, mentions);
  } catch (error) {
    await sendReply("❌ Erro ao listar membros fantasmas!");
  }
}
