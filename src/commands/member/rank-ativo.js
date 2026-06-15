/**
 * Comando RankAtivo - Mostra os 5 membros mais ativos do grupo
 * Baseado no número de mensagens, figurinhas, comandos e áudios enviados
 *
 * @author Dev VaL
 */
import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import activityTracker from "../../utils/activityTracker.js";

export default {
  name: "rank-ativo",
  description: "Mostra os 5 membros mais ativos do grupo",
  commands: ["rank-ativo", "ativos"],
  usage: `${PREFIX}rankativo`,

  handle: async ({
    sendReply,
    sendWaitReply,
    getGroupParticipants,
    socket,
    remoteJid,
    isGroup,
  }) => {
    if (!isGroup) {
      throw new WarningError("Este comando só funciona em grupos!");
    }

    await sendWaitReply("📊 Calculando ranking de atividade...");

    const participants = await getGroupParticipants();
    const groupStats = activityTracker.getGroupStats(remoteJid);

    if (Object.keys(groupStats).length === 0) {
      return await sendReply(
        `📊 *RANKING DE ATIVIDADE* 📊\n\n❌ Ainda não há dados de atividade neste grupo.\n\n💡 *Como funciona:*\n• O bot coleta dados de mensagens, figurinhas, comandos e áudios automaticamente\n• Continue interagindo no grupo\n• Execute o comando novamente em alguns minutos!`
      );
    }

    const activeMembers = [];

    let groupTotalUsers = 0;
    let groupTotalMessages = 0;
    let groupTotalStickers = 0;
    let groupTotalCommands = 0;
    let groupTotalAudios = 0;

    for (const [userId, userData] of Object.entries(groupStats)) {
      const isStillInGroup = participants.some((p) => p.id === userId);

      if (isStillInGroup) {
        const displayName = activityTracker.getDisplayName(remoteJid, userId);

        const messages = userData.messages || 0;
        const stickers = userData.stickers || 0;
        const commands = userData.commands || 0;
        const audios = userData.audios || 0;
        const total = messages + stickers + commands + audios;

        groupTotalUsers++;
        groupTotalMessages += messages;
        groupTotalStickers += stickers;
        groupTotalCommands += commands;
        groupTotalAudios += audios;

        activeMembers.push({
          userId,
          name: displayName,
          messages,
          stickers,
          commands,
          audios,
          total,
          hasRealName: userData.displayName || userData.lastKnownName,
        });
      }
    }

    activeMembers.sort((a, b) => b.total - a.total);
    const topMembers = activeMembers.slice(0, Math.min(5, activeMembers.length));

    if (topMembers.length === 0) {
      return await sendReply(
        `📊 *RANKING DE ATIVIDADE* 📊\n\n❌ Nenhum usuário ativo encontrado no momento.\n\n💡 Continue interagindo no grupo para aparecer no ranking!`
      );
    }

    let rankingMessage = `🏆 *RANKING DE ATIVIDADE* 🏆\n`;

    try {
      const groupMetadata = await socket.groupMetadata(remoteJid);
      rankingMessage += `📅 *Grupo:* ${groupMetadata.subject}\n\n`;
    } catch {
      rankingMessage += `📅 *Grupo:* ${remoteJid.split("@")[0]}\n\n`;
    }

    const positionEmojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    const mentions = [];
    const groupGrandTotal =
      groupTotalMessages + groupTotalStickers + groupTotalCommands + groupTotalAudios;

    topMembers.forEach((member, index) => {
      const position = positionEmojis[index] || `${index + 1}️⃣`;
      const percentage =
        groupGrandTotal > 0
          ? ((member.total / groupGrandTotal) * 100).toFixed(1)
          : 0;

      const namePrefix = member.hasRealName ? "👤" : "";
      const userMention = `@${member.userId.split("@")[0]}`;
      mentions.push(member.userId);

      rankingMessage += `${position} ${namePrefix}${userMention}\n`;
      rankingMessage += `   📝 ${member.messages} mensagens\n`;
      rankingMessage += `   🎭 ${member.stickers} figurinhas\n`;
      rankingMessage += `   🎮 ${member.commands} comandos\n`;
      rankingMessage += `   🎤 ${member.audios} áudios\n`;
      rankingMessage += `   📊 ${member.total} total (${percentage}%)\n\n`;
    });

    rankingMessage += `🌍 *ESTATÍSTICAS DO GRUPO:*\n`;
    rankingMessage += `👥 ${groupTotalUsers} usuários ativos\n`;
    rankingMessage += `💬 ${groupTotalMessages} mensagens enviadas\n`;
    rankingMessage += `🎭 ${groupTotalStickers} figurinhas enviadas\n`;
    rankingMessage += `🎮 ${groupTotalCommands} comandos enviados\n`;
    rankingMessage += `🎤 ${groupTotalAudios} áudios enviados`;

    await sendReply(rankingMessage, mentions);
  },
};
