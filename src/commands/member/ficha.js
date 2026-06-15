/**
 * Comando Ficha - Mostra a ficha zoeira de um usuário
 *
 * @author Dev VaL
 */
import { PREFIX, ASSETS_DIR } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import activityTracker from "../../utils/activityTracker.js";

export default {
  name: "ficha",
  description: "Mostra a ficha zoeira de um usuário",
  commands: ["ficha"],
  usage: `${PREFIX}ficha @usuario ou responda a mensagem de alguém`,

  handle: async ({
    args,
    socket,
    remoteJid,
    userLid,
    replyLid,
    isReply,
    isGroup,
    webMessage,
    sendWaitReply,
    sendSuccessReact,
    getGroupParticipants,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Este comando só pode ser usado em grupo.");
    }

    // ── DEFINIR USUÁRIO ALVO ──────────────────────────────────────────────────

    let targetLid = userLid;

    if (args[0]) {
      // Menção via @número — converte para LID do grupo buscando nos participantes
      const num = args[0].replace(/\D/g, "");
      const participants = await getGroupParticipants();
      const found = participants.find(
        (p) => p.id?.includes(num) || p.phoneNumber?.includes(num)
      );
      targetLid = found?.id || `${num}@s.whatsapp.net`;
    } else if (isReply && replyLid) {
      targetLid = replyLid;
    }

    await sendWaitReply("Puxando ficha criminal do elemento...");

    // ── BOT COMO ALVO ─────────────────────────────────────────────────────────

    const botLid = socket.user?.lid || socket.user?.id;
    const botLidNorm = botLid?.split(":")[0] + "@lid";
    const targetNorm = targetLid?.split(":")[0] + "@lid";

    if (targetNorm === botLidNorm) {
      await socket.sendMessage(remoteJid, {
        react: { text: "🤨", key: webMessage.key },
      });
      return await socket.sendMessage(remoteJid, {
        text: `⚠️ *ACESSO NEGADO*\n\nVocê tentou investigar o DeadBoT.\nArquivo classificado nível OWNER.\n\n🤖 Sistema anti-fofoca ativado.`,
        mentions: [userLid],
      });
    }

    // ── FOTO ──────────────────────────────────────────────────────────────────

    let profilePicUrl = `${ASSETS_DIR}/images/default-user.png`;

    try {
      profilePicUrl = await socket.profilePictureUrl(targetLid, "image");
    } catch {
      // mantém imagem padrão
    }

    // ── CARGO ─────────────────────────────────────────────────────────────────

    const groupMetadata = await socket.groupMetadata(remoteJid);
    const participant = groupMetadata.participants.find((p) => p.id === targetLid);
    const userRole = participant?.admin ? "Administrador" : "Membro";

    // ── ACTIVITY TRACKER ──────────────────────────────────────────────────────

    const userStats = activityTracker.getUserStats(remoteJid, targetLid);
    const groupStats = activityTracker.getGroupStats(remoteJid);

    const messages = userStats.messages || 0;
    const stickers = userStats.stickers || 0;
    const commands = userStats.commands || 0;
    const audios   = userStats.audios   || 0;
    const total    = userStats.total    || 0;

    // ── RANKING ───────────────────────────────────────────────────────────────

    const participantsList = await getGroupParticipants();
    const activeMembers = [];

    for (const [userId, data] of Object.entries(groupStats)) {
      if (!participantsList.some((p) => p.id === userId)) continue;
      const t =
        (data.messages || 0) +
        (data.stickers || 0) +
        (data.commands || 0) +
        (data.audios   || 0);
      activeMembers.push({ userId, total: t });
    }

    activeMembers.sort((a, b) => b.total - a.total);
    const index = activeMembers.findIndex((u) => u.userId === targetLid);
    const rankPosition = index !== -1 ? `${index + 1}º` : "—";

    // ── PORCENTAGENS ──────────────────────────────────────────────────────────

    const safeTotal     = total === 0 ? 1 : total;
    const textPercent    = Math.floor((messages / safeTotal) * 100);
    const stickerPercent = Math.floor((stickers / safeTotal) * 100);
    const commandPercent = Math.floor((commands / safeTotal) * 100);
    const audioPercent   = Math.floor((audios   / safeTotal) * 100);

    // ── CLASSE AUTOMÁTICA ─────────────────────────────────────────────────────

    let classe = "👀 Observador Misterioso";
    const maxValue = Math.max(messages, stickers, commands, audios);

    if (total > 0) {
      if (maxValue === messages)      classe = "📢 Digitador Compulsivo";
      else if (maxValue === stickers) classe = "🖼️ Ministro das Figurinhas";
      else if (maxValue === audios)   classe = "🎙️ Podcast Humano";
      else if (maxValue === commands) classe = "🤖 Testador Oficial do Bot";
    }

    // ── NÍVEL DE ATIVIDADE ────────────────────────────────────────────────────

    let nivel = "👻 Fantasma Profissional";
    if (total > 0 && total < 50)      nivel = "💤 Estagiário do Grupo";
    if (total >= 50 && total < 300)   nivel = "🟡 Funcionário CLT do Zap";
    if (total >= 300 && total < 1000) nivel = "🔥 Sócio da Conversa";
    if (total >= 1000)                nivel = "👑 Dono Emocional do Grupo";

    // ── MENSAGEM FINAL ────────────────────────────────────────────────────────

    const header =
      userRole === "Administrador"
        ? "╭━━━〔 👑 DOSSIÊ CONFIDENCIAL DA AUTORIDADE 〕━━━╮"
        : "╭━━━〔 📋 FICHA CRIMINOSA DO ELEMENTO 〕━━━╮";

    const statusEspecial =
      userRole === "Administrador"
        ? "🛡️ Status: Autoridade sob proteção divina"
        : `🏆 Ranking: ${rankPosition}`;

    const mensagem = `
${header}

👤 Nome: @${targetLid.split("@")[0]}
🎖️ Cargo: ${userRole}

💬 Interações Totais: ${total}
📊 Nível: ${nivel}

📝 Textos: ${textPercent}%
🖼️ Figurinhas: ${stickerPercent}%
🎤 Áudios: ${audioPercent}%
🤖 Comandos: ${commandPercent}%

🧬 Classe Social:
${classe}

${statusEspecial}

╰━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

    await sendSuccessReact();

    await socket.sendMessage(remoteJid, {
      image: { url: profilePicUrl },
      caption: mensagem,
      mentions: [targetLid],
    });
  },
};
