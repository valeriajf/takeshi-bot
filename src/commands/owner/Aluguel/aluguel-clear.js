/**
 * Comando: aluguel-clear - Remove aluguéis de grupos onde o bot não está mais
 * 📁 src/commands/owner/Aluguel/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../../config.js";
import { listarAlugueis, apagarAluguelPorId } from "../../../utils/aluguel.js";

export default {
  name: "aluguel-clear",
  description: "Remove aluguéis de grupos onde o bot não está mais presente",
  commands: ["aluguel-clear"],
  usage: `${PREFIX}aluguel-clear`,

  handle: async ({ sendReply, socket }) => {
    const alugueis        = listarAlugueis();
    const gruposNoAluguel = Object.keys(alugueis);

    if (gruposNoAluguel.length === 0) {
      return await sendReply("✅ Não há aluguéis cadastrados.");
    }

    const gruposAtivos    = await socket.groupFetchAllParticipating();
    const gruposAtivosIds = Object.keys(gruposAtivos);
    const orfaos          = [];

    for (const groupId of gruposNoAluguel) {
      if (!gruposAtivosIds.includes(groupId)) {
        orfaos.push({
          id  : alugueis[groupId].id,
          nome: alugueis[groupId].nomeGrupo,
          groupId,
        });
      }
    }

    if (orfaos.length === 0) {
      return await sendReply(
        `✅ *Nenhum aluguel órfão encontrado!*\n\n` +
        `Todos os ${gruposNoAluguel.length} aluguéis são de grupos onde o bot está presente.`
      );
    }

    for (const o of orfaos) apagarAluguelPorId(o.id);

    const sep = "━━━━━━━━━━━━━━━━━━";
    let msg   = `✅ *LIMPEZA CONCLUÍDA!*\n\n🗑️ *Removidos:* ${orfaos.length}\n\n${sep}\n\n`;
    for (const o of orfaos) {
      msg += `🪀 *${o.nome}*\n`;
      msg += `🔑 *ID:* \`\`\`${o.id}\`\`\`\n`;
      msg += `${sep}\n\n`;
    }
    msg += `💡 Use *${PREFIX}aluguel-listar* para ver os restantes.`;

    await sendReply(msg);
  },
};
