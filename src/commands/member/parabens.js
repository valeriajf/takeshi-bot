/**
 * Comando parabens
 * Parabeniza um membro com mensagens aleatórias
 *
 * PASTA: src/commands/member/
 *
 * @author VaL
 */

import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { onlyNumbers } from "../../utils/index.js";

const lastMessagesCache = new Map();

export default {
  name: "parabens",
  description: "Parabenize alguém com mensagens bonitas e variadas 🎊",
  commands: ["parabens", "felizdia", "congrats"],
  usage: `${PREFIX}parabens @membro`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    isReply,
    replyLid,
    userLid,
    remoteJid,
    socket,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    try {
      let targetLid = null;

      if (isReply) {
        targetLid = replyLid;
      } else if (args.length > 0) {
        targetLid = `${onlyNumbers(args[0])}@lid`;
      }

      if (!targetLid) {
        throw new InvalidParameterError(
          "❌ Marque ou responda a pessoa que deseja parabenizar."
        );
      }

      const senderMention = `@${onlyNumbers(userLid)}`;
      const targetMention = `@${onlyNumbers(targetLid)}`;

      const mensagens = [
        `🎉 *Parabéns, ${targetMention}!* 🎉\n\nHoje é o seu dia! Que não faltem motivos pra sorrir, sonhos pra correr atrás e momentos incríveis pra guardar na memória. Você merece tudo de melhor! ✨\n\n💌 Com carinho, ${senderMention}`,

        `🎂 *Feliz aniversário, ${targetMention}!* 🎂\n\nQue esse novo ciclo venha cheio de paz, saúde e conquistas. Continue sendo essa pessoa incrível que faz a diferença por onde passa! 💖\n\n🤝 Tamo junto, ${senderMention}`,

        `🥳 *Parabéns, ${targetMention}!* 🥳\n\nMais um ano de vida, mais histórias pra contar! Que você viva tudo de melhor que a vida pode oferecer. Aproveita MUITO seu dia! 🎈🔥\n\n💬 De ${senderMention}`,

        `🎈 *Feliz aniversário, ${targetMention}!* 🎈\n\nQue a felicidade te acompanhe hoje e sempre. Que seus planos deem certo e que nunca falte força pra continuar lutando pelos seus sonhos! 💪✨\n\n👊 Abraço de ${senderMention}`,

        `🌟 *Parabéns, ${targetMention}!* 🌟\n\nQue seu dia seja leve, feliz e cheio de boas surpresas. Você merece cada coisa boa que está por vir! 🎁💫\n\n💛 Com carinho, ${senderMention}`,

        `🎊 *Felicidades, ${targetMention}!* 🎊\n\nHoje é dia de celebrar você! Que venham novas conquistas, novos momentos e muita felicidade nessa nova fase da sua vida! 🚀✨\n\n🤗 De coração, ${senderMention}`,

        `🎂 *Parabéns, ${targetMention}!* 🎂\n\nQue nunca falte motivo pra sorrir, nem coragem pra correr atrás do que você quer. O melhor ainda está por vir! 💥\n\n🔥 ${senderMention} mandou aquele salve!`,

        `🥂 *Feliz aniversário, ${targetMention}!* 🥂\n\nMais um nível desbloqueado na sua vida! 🎮 Que venha cheio de vitórias, saúde e momentos inesquecíveis. Bora aproveitar! 🚀\n\n😎 ${senderMention}`,

        `🎉 *Parabéns, ${targetMention}!* 🎉\n\nQue sua vida seja cheia de luz, paz e realizações. Continue sendo essa pessoa incrível — o mundo precisa disso! ✨\n\n💙 Com respeito, ${senderMention}`,

        `🎈 *Feliz aniversário, ${targetMention}!* 🎈\n\nHoje é seu dia, então aproveita sem moderação! 😂🎂 Que seja só o começo de um ano cheio de coisas boas!\n\n🍾 ${senderMention} tá comemorando contigo!`,
      ];

      let usedIndices = lastMessagesCache.get(remoteJid) || [];

      if (usedIndices.length >= mensagens.length) {
        usedIndices = [];
      }

      let availableIndices = [];

      for (let i = 0; i < mensagens.length; i++) {
        if (!usedIndices.includes(i)) {
          availableIndices.push(i);
        }
      }

      if (!availableIndices.length) {
        availableIndices = Array.from(
          { length: mensagens.length },
          (_, i) => i
        );

        usedIndices = [];
      }

      const randomIndex =
        availableIndices[
          Math.floor(Math.random() * availableIndices.length)
        ];

      const mensagem = mensagens[randomIndex];

      usedIndices.push(randomIndex);

      lastMessagesCache.set(remoteJid, usedIndices);

      setTimeout(() => {
        lastMessagesCache.delete(remoteJid);
      }, 60 * 60 * 1000);

      await socket.sendMessage(remoteJid, {
        text: mensagem,
        mentions: [targetLid, userLid],
      });

      await sendSuccessReact();
    } catch (error) {
      console.error("[PARABENS]", error);

      await sendErrorReply(
        error.message || "Erro ao parabenizar a pessoa."
      );
    }
  },
};