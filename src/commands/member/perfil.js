/**
 * Comando Perfil - Mostra informações e atributos aleatórios de um usuário
 *
 * @author Dev VaL
 */
import { PREFIX, ASSETS_DIR } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import activityTracker from "../../utils/activityTracker.js";

export default {
  name: "perfil",
  description: "Mostra informações de um usuário",
  commands: ["perfil", "profile"],
  usage: `${PREFIX}perfil ou perfil @usuario`,

  handle: async ({
    args,
    socket,
    remoteJid,
    userLid,
    isGroup,
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
      const num = args[0].replace(/\D/g, "");
      const participants = await getGroupParticipants();
      const found = participants.find(
        (p) => p.id?.includes(num) || p.phoneNumber?.includes(num)
      );
      targetLid = found?.id || `${num}@s.whatsapp.net`;
    }

    await sendWaitReply("Carregando perfil...");

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

    const groupStats = activityTracker.getGroupStats(remoteJid);
    const userData = groupStats[targetLid];

    const messages = userData?.messages || 0;
    const stickers = userData?.stickers || 0;
    const commands = userData?.commands || 0;
    const audios   = userData?.audios   || 0;

    // ── RANKING (considera os 4 tipos) ────────────────────────────────────────

    const participantsList = await getGroupParticipants();
    const activeMembers = [];

    for (const [userId, data] of Object.entries(groupStats)) {
      if (!participantsList.some((p) => p.id === userId)) continue;
      const total =
        (data.messages || 0) +
        (data.stickers || 0) +
        (data.commands || 0) +
        (data.audios   || 0);
      activeMembers.push({ userId, total });
    }

    activeMembers.sort((a, b) => b.total - a.total);
    const index = activeMembers.findIndex((u) => u.userId === targetLid);
    const rankPosition = index !== -1 ? `${index + 1}º` : "—";

    // ── ATRIBUTOS ALEATÓRIOS ──────────────────────────────────────────────────

    const rnd = () => Math.floor(Math.random() * 100) + 1;
    const programPrice  = (Math.random() * 5000 + 1000).toFixed(2);
    const beautyLevel   = rnd();
    const gadoLevel     = rnd();
    const passivaLevel  = rnd();
    const charisma      = rnd();
    const humor         = rnd();
    const intelligence  = rnd();
    const courage       = rnd();
    const luck          = rnd();
    const romanticLevel = rnd();
    const loyalty       = rnd();
    const flirtSkill    = rnd();
    const laziness      = rnd();
    const creativity    = rnd();

    // ── MENSAGEM FINAL ────────────────────────────────────────────────────────

    const mensagem = `
👤 *Nome:* @${targetLid.split("@")[0]}
🎖️ *Cargo:* ${userRole}

📝 ${messages} mensagens
🎭 ${stickers} figurinhas
🎮 ${commands} comandos
🎤 ${audios} áudios
🏆 Rank Ativo: ${rankPosition}

🌚 *Programa:* R$ ${programPrice}
🐮 *Gado:* ${gadoLevel}%
🎱 *Passiva:* ${passivaLevel}%
✨ *Beleza:* ${beautyLevel}%
🎭 *Carisma:* ${charisma}%
😂 *Humor:* ${humor}%
🧠 *Inteligência:* ${intelligence}%
💪 *Coragem:* ${courage}%
🍀 *Sorte:* ${luck}%
💕 *Romântico:* ${romanticLevel}%
🦁 *Lealdade:* ${loyalty}%
😏 *Pegador:* ${flirtSkill}%
😴 *Preguiça:* ${laziness}%
🎨 *Criatividade:* ${creativity}%`;

    await sendSuccessReact();

    await socket.sendMessage(remoteJid, {
      image: { url: profilePicUrl },
      caption: mensagem,
      mentions: [targetLid],
    });
  },
};
