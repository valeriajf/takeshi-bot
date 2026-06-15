/**
 * Comando RankInativo - Lista os 5 membros mais inativos do grupo
 * Considera membros com 0 mensagens, figurinhas, comandos e áudios
 * Ignora administradores do grupo
 *
 * @author Dev VaL
 */
import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import activityTracker from "../../utils/activityTracker.js";

export default {
  name: "rank-inativo",
  description: "Lista os 5 membros mais inativos do grupo com 0 atividade",
  commands: ["rank-inativo", "inativos"],
  usage: `${PREFIX}rank-inativo`,

  handle: async ({
    sendReply,
    sendSuccessReact,
    remoteJid,
    isGroup,
    getGroupParticipants,
    socket,
  }) => {
    if (!isGroup) {
      throw new WarningError("Este comando só pode ser usado em grupos!");
    }

    await sendSuccessReact();

    const participants = await getGroupParticipants();
    const groupStats = activityTracker.getGroupStats(remoteJid);

    let groupTotalUsers = 0;
    let groupTotalMessages = 0;
    let groupTotalStickers = 0;
    let groupTotalCommands = 0;
    let groupTotalAudios = 0;

    for (const participant of participants) {
      const userData = groupStats[participant.id];
      if (userData) {
        groupTotalUsers++;
        groupTotalMessages += userData.messages || 0;
        groupTotalStickers += userData.stickers || 0;
        groupTotalCommands += userData.commands || 0;
        groupTotalAudios += userData.audios || 0;
      }
    }

    const inactiveMembers = [];

    for (const participant of participants) {
      const userId = participant.id;
      const isAdmin =
        participant.admin === "admin" || participant.admin === "superadmin";

      if (isAdmin) continue;

      const userData = groupStats[userId];
      const total =
        (userData?.messages || 0) +
        (userData?.stickers || 0) +
        (userData?.commands || 0) +
        (userData?.audios || 0);

      if (total === 0) {
        inactiveMembers.push({
          userId,
          name: activityTracker.getDisplayName(remoteJid, userId),
        });
      }
    }

    if (inactiveMembers.length === 0) {
      return await sendReply(
        `╭─「 🎉 *GRUPO ATIVO* 🎉 」\n│\n├ ✅ *Parabéns!*\n├ 👥 Todos os membros já enviaram mensagens\n├ 🏆 Não há membros completamente inativos\n├ 💪 Continue incentivando a participação!\n│\n╰─「 *DeadBoT* 」`
      );
    }

    const topInactive = inactiveMembers
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    const positionEmojis = ["💤", "😴", "🤐", "🙈", "👻"];
    const mentions = [];

    let rankMessage = `😴 *RANKING DE INATIVIDADE* 😴\n`;

    try {
      const groupMetadata = await socket.groupMetadata(remoteJid);
      rankMessage += `📅 *Grupo:* ${groupMetadata.subject}\n\n`;
    } catch {
      rankMessage += `📅 *Grupo:* ${remoteJid.split("@")[0]}\n\n`;
    }

    topInactive.forEach((member, index) => {
      const userMention = `@${member.userId.split("@")[0]}`;
      mentions.push(member.userId);

      rankMessage += `${positionEmojis[index]} 👤${userMention}\n`;
      rankMessage += `   📝 0 mensagens\n`;
      rankMessage += `   🎭 0 figurinhas\n`;
      rankMessage += `   🎮 0 comandos\n`;
      rankMessage += `   🎤 0 áudios\n`;
      rankMessage += `   📊 0 total (0.0%)\n\n`;
    });

    rankMessage += `🌍 *ESTATÍSTICAS DO GRUPO:*\n`;
    rankMessage += `👥 ${groupTotalUsers} usuários ativos\n`;
    rankMessage += `💬 ${groupTotalMessages} mensagens enviadas\n`;
    rankMessage += `🎭 ${groupTotalStickers} figurinhas enviadas\n`;
    rankMessage += `🎮 ${groupTotalCommands} comandos enviados\n`;
    rankMessage += `🎤 ${groupTotalAudios} áudios enviados`;

    await sendReply(rankMessage, mentions);
  },
};
