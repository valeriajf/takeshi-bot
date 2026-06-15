/**
 * Comando Zerar Rank - Apaga os dados de atividade do grupo atual
 * Pasta: src/commands/owner/
 *
 * @author Dev VaL
 */
import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import activityTracker from "../../utils/activityTracker.js";

export default {
  name: "zerar-rank",
  description: "Zera o ranking de atividade do grupo onde o comando foi usado",
  commands: ["zerar-rank", "resetrank", "limpar-rank"],
  usage: `${PREFIX}zerar-rank`,

  handle: async ({
    sendSuccessReply,
    remoteJid,
    isGroup,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Este comando só pode ser usado dentro de um grupo!");
    }

    const groupStats = activityTracker.getGroupStats(remoteJid);
    const hadData = Object.keys(groupStats).length > 0;

    if (hadData) {
      delete activityTracker.stats[remoteJid];
      activityTracker.saveStats();
    }

    await sendSuccessReply(
      hadData
        ? `✅ Ranking deste grupo zerado com sucesso!\n\n🗑️ Todos os dados de atividade foram apagados.\n📊 O ranking começa do zero a partir de agora.`
        : `ℹ️ Este grupo ainda não possuía dados de atividade.`
    );
  },
};
