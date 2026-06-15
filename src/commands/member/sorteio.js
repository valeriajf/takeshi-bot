import { PREFIX } from "../../config.js";
import { DangerError } from "../../errors/index.js";

export default {
  name: "sorteio",
  description: "Sorteia um membro do grupo",
  commands: ["sorteio", "sortear", "sorteie"],
  usage: `${PREFIX}sorteio [descrição do prêmio]`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    isGroup,
    fullArgs,
    sendReply,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
    getGroupParticipants,
  }) => {
    try {
      if (!isGroup) {
        throw new DangerError(
          "Este comando só pode ser usado em grupos!"
        );
      }

      await sendWaitReact();

      const participants = await getGroupParticipants();

      if (!participants?.length) {
        throw new DangerError(
          "Não foi possível obter os membros do grupo!"
        );
      }

      const membros = participants
        .map((participant) => participant.id)
        .filter(Boolean);

      if (!membros.length) {
        throw new DangerError(
          "Nenhum membro disponível para sortear!"
        );
      }

      const vencedor =
        membros[Math.floor(Math.random() * membros.length)];

      const numeroVencedor = vencedor
        .replace("@lid", "")
        .replace("@s.whatsapp.net", "");

      const descricao = fullArgs?.trim() || "Sorteio";

      await sendSuccessReact();

      await sendReply(
        `🎲 *${descricao}*\n\n` +
        `🎉 *Usuário sorteado:*\n` +
        `👤 @${numeroVencedor}\n\n` +
        `🎊 Parabéns!`,
        [vencedor]
      );
    } catch (error) {
      console.error("[SORTEIO]", error);

      await sendErrorReply(
        error.message || "Erro ao realizar o sorteio."
      );
    }
  },
};