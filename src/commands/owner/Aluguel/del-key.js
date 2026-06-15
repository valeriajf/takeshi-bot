/**
 * Comando: del-key - Remove uma chave de ativação
 * 📁 src/commands/owner/Aluguel/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../../config.js";
import { InvalidParameterError, WarningError } from "../../../errors/index.js";
import { obterChave, removerChave } from "../../../utils/aluguel.js";

export default {
  name: "del-key",
  description: "Remove uma chave de ativação",
  commands: ["del-key"],
  usage: `${PREFIX}del-key <chave>`,

  handle: async ({ sendReply, args }) => {
    if (!args[0]) {
      throw new InvalidParameterError(
        `Informe a chave.\nExemplo: ${PREFIX}del-key Z93AW9PJ`
      );
    }

    const chave = args[0].toUpperCase().trim();
    const dados = obterChave(chave);

    if (!dados) {
      throw new WarningError(
        `Chave não encontrada! \`\`\`${chave}\`\`\`\n\n` +
        `Use *${PREFIX}listar-key* para ver as chaves disponíveis.`
      );
    }

    removerChave(chave);

    await sendReply(
      `✅ *Chave removida com sucesso!*\n\n` +
      `🔑 *Chave:* \`\`\`${chave}\`\`\`\n` +
      `🪀 *Grupo:* ${dados.nomeGrupo}\n` +
      `⏱️ *Duração era:* ${dados.quantidade} ${dados.tipo}\n\n` +
      `A chave foi invalidada e não pode mais ser usada.`
    );
  },
};
