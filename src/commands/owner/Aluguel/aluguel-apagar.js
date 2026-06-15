/**
 * Comando: aluguel-apagar - Remove aluguel por ID
 * 📁 src/commands/owner/Aluguel/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../../config.js";
import { InvalidParameterError, WarningError } from "../../../errors/index.js";
import { apagarAluguelPorId } from "../../../utils/aluguel.js";

export default {
  name: "aluguel-apagar",
  description: "Remove um aluguel pelo ID",
  commands: ["aluguel-apagar"],
  usage: `${PREFIX}aluguel-apagar <id>`,

  handle: async ({ sendReply, args }) => {
    if (!args[0]) {
      throw new InvalidParameterError(
        `Informe o ID do aluguel.\nExemplo: ${PREFIX}aluguel-apagar ABC123XY`
      );
    }

    const id       = args[0].toUpperCase().trim();
    const removido = apagarAluguelPorId(id);

    if (!removido) {
      throw new WarningError(
        `Aluguel com ID \`\`\`${id}\`\`\` não encontrado.\n\n` +
        `💡 Use *${PREFIX}aluguel-listar* para ver os IDs.\n\n` +
        `⚠️ Se o ID aparece no *aluguel-listar-global* mas não aqui, ele está em outra instância.`
      );
    }

    await sendReply(
      `✅ *Aluguel removido com sucesso!*\n\n` +
      `🔑 *ID removido:* \`\`\`${id}\`\`\`\n\n` +
      `📝 O grupo continua ativo no sistema.\n` +
      `Para desativar use: *${PREFIX}off*`
    );
  },
};
