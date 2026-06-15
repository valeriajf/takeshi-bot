import { InvalidParameterError } from "../../errors/index.js";

// Cache por grupo para evitar repetição
const lastMessagesCache = new Map();

export default {
name: "top",
description:
"Reconheça uma postagem que foi boa demais para passar despercebida.",
commands: ["top", "toppost", "excelente"],
usage: "/top @usuario",

handle: async ({
isReply,
webMessage,
sendErrorReply,
remoteJid,
socket,
userLid,
}) => {
try {
let targetJid;

  const senderJid = userLid;
  const senderMention = `@${senderJid.split("@")[0]}`;

  if (isReply) {
    const quoted =
      webMessage.message?.extendedTextMessage?.contextInfo;

    targetJid = quoted?.participant;
  } else {
    const mentions =
      webMessage.message?.extendedTextMessage?.contextInfo
        ?.mentionedJid;

    if (mentions?.length) {
      targetJid = mentions[0];
    }
  }

  if (!targetJid) {
    throw new InvalidParameterError(
      "Marque ou responda a mensagem da pessoa que merece o TOP."
    );
  }

  const targetMention = `@${targetJid.split("@")[0]}`;

  const mensagens = [
    `🔥 *TOP, ${targetMention}!*\n\nEssa postagem foi tão boa que quase me fez trabalhar.\n\n🏆 Marcado por ${senderMention}`,

    `⭐ *TOP, ${targetMention}!*\n\nFinalmente alguém postou algo que não matou meus neurônios.\n\n👏 Marcado por ${senderMention}`,

    `🚨 *ALERTA DE POSTAGEM BOA!*\n\n${targetMention} resolveu aparecer e humilhar o resto do grupo.\n\n🎯 Indicado por ${senderMention}`,

    `🏅 *TOP, ${targetMention}!*\n\nEu tinha uma crítica pronta... agora vou ter que guardar.\n\n😒 Reconhecido por ${senderMention}`,

    `💀 *TOP, ${targetMention}!*\n\nParabéns. Você ganhou 5 segundos do meu respeito.\n\n🏆 Apontado por ${senderMention}`,

    `⚡ *TOP, ${targetMention}!*\n\nAchei que era sorte, mas você acertou mesmo.\n\n🔥 Marcado por ${senderMention}`,

    `🎯 *TOP, ${targetMention}!*\n\nEssa postagem passou na inspeção do sarcasmo.\n\n😎 Reconhecido por ${senderMention}`,

    `🏆 *TOP, ${targetMention}!*\n\nNem eu consegui encontrar defeito nessa.\n\n👏 Indicado por ${senderMention}`,

    `🚀 *TOP, ${targetMention}!*\n\nVocê acabou de aumentar o QI médio do grupo.\n\n🧠 Marcado por ${senderMention}`,

    `💎 *TOP, ${targetMention}!*\n\nConteúdo raro. Quase uma espécie em extinção.\n\n🏅 Reconhecido por ${senderMention}`,

    `🎉 *TOP, ${targetMention}!*\n\nEssa merece aplausos. Ou pelo menos um emoji.\n\n👏 Indicado por ${senderMention}`,

    `🌟 *TOP, ${targetMention}!*\n\nO grupo agradece. Meu ego não.\n\n😌 Marcado por ${senderMention}`,

    `🔥 *TOP, ${targetMention}!*\n\nPostagem tão boa que até fiquei sem resposta.\n\n🎯 Reconhecido por ${senderMention}`,

    `⚠️ *TOP DETECTADO!*\n\n${targetMention} decidiu jogar no modo difícil e acertou.\n\n🏆 Marcado por ${senderMention}`,

    `💥 *TOP, ${targetMention}!*\n\nAcabei de cancelar a zoeira que eu tinha preparado.\n\n😏 Indicado por ${senderMention}`,

    `🎖️ *TOP, ${targetMention}!*\n\nEssa postagem desbloqueou respeito instantâneo.\n\n👏 Reconhecido por ${senderMention}`,

    `🚨 *POSTAGEM SUSPEITAMENTE BOA!*\n\nEstamos investigando como ${targetMention} conseguiu isso.\n\n🕵️ Marcado por ${senderMention}`,

    `🏅 *TOP, ${targetMention}!*\n\nNem o DeadBoT teve coragem de reclamar dessa vez.\n\n🤖 Reconhecido por ${senderMention}`,

    `⚡ *TOP, ${targetMention}!*\n\nEssa foi cirúrgica. Sem anestesia.\n\n🎯 Indicado por ${senderMention}`,

    `👑 *TOP, ${targetMention}!*\n\nVocê acabou de subir um nível na cadeia alimentar do grupo.\n\n🏆 Marcado por ${senderMention}`,
  ];

  let usedIndices =
    lastMessagesCache.get(remoteJid) || [];

  if (usedIndices.length >= mensagens.length) {
    usedIndices = [];
  }

  let availableIndices = [];

  for (let i = 0; i < mensagens.length; i++) {
    if (!usedIndices.includes(i)) {
      availableIndices.push(i);
    }
  }

  if (availableIndices.length === 0) {
    availableIndices = Array.from(
      { length: mensagens.length },
      (_, i) => i
    );
    usedIndices = [];
  }

  const randomIndex =
    availableIndices[
      Math.floor(
        Math.random() * availableIndices.length
      )
    ];

  const mensagem = mensagens[randomIndex];

  usedIndices.push(randomIndex);
  lastMessagesCache.set(remoteJid, usedIndices);

  setTimeout(() => {
    lastMessagesCache.delete(remoteJid);
  }, 60 * 60 * 1000);

  await socket.sendMessage(remoteJid, {
    text: mensagem,
    mentions: [targetJid, senderJid],
  });
} catch (err) {
  console.error("[/top] erro:", err);

  await sendErrorReply(
    err.message ||
      "Erro ao enviar a mensagem de TOP."
  );
}

},
};