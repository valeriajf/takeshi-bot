/**
 * Comando: aluguel-listar - Lista todos os aluguéis (ativos e expirados)
 * 📁 src/commands/owner/Aluguel/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../../config.js";
import { listarAlugueis, calcularTempoRestante } from "../../../utils/aluguel.js";

export default {
  name: "aluguel-listar",
  description: "Lista todos os aluguéis cadastrados",
  commands: ["aluguel-listar"],
  usage: `${PREFIX}aluguel-listar`,

  handle: async ({ sendReply }) => {
    const alugueis = listarAlugueis();
    const grupos   = Object.keys(alugueis);

    if (grupos.length === 0) {
      return await sendReply(`📋 *Nenhum aluguel cadastrado.*`);
    }

    const agora    = Date.now();
    const ativos   = [];
    const expirados = [];

    for (const groupId of grupos) {
      const a = alugueis[groupId];
      (a.expiraTimestamp > agora ? ativos : expirados).push({ groupId, ...a });
    }

    const sep = "━━━━━━━━━━━━━━━━━━";
    let msg   = `📋 *ALUGUÉIS CADASTRADOS*\n\n`;
    msg      += `✅ Ativos: ${ativos.length} | 🔴 Expirados: ${expirados.length}\n`;

    if (ativos.length > 0) {
      msg += `\n${sep}\n✅ *ATIVOS*\n${sep}\n\n`;
      for (const a of ativos) {
        msg += `🪀 *${a.nomeGrupo}*\n`;
        msg += `🆔 *ID grupo:* ${a.groupId}\n`;
        msg += `🔑 *ID aluguel:* \`\`\`${a.id}\`\`\`\n`;
        msg += `⏱️ *Contratado:* ${a.duracao}\n`;
        msg += `⌛ *Restante:* ${calcularTempoRestante(a.expiraTimestamp)}\n`;
        msg += `📅 *Vencimento:* ${a.expira}\n`;
        msg += `${sep}\n\n`;
      }
    }

    if (expirados.length > 0) {
      msg += `\n${sep}\n🔴 *EXPIRADOS*\n${sep}\n\n`;
      for (const a of expirados) {
        msg += `🪀 *${a.nomeGrupo}*\n`;
        msg += `🆔 *ID grupo:* ${a.groupId}\n`;
        msg += `🔑 *ID aluguel:* \`\`\`${a.id}\`\`\`\n`;
        msg += `⏱️ *Contratado:* ${a.duracao}\n`;
        msg += `📅 *Vencimento:* ${a.expira}\n`;
        msg += `💢 *Status:* 🔴 EXPIRADO\n`;
        msg += `${sep}\n\n`;
      }
      msg += `💡 Use *${PREFIX}aluguel-apagar <id>* para remover expirados.`;
    }

    await sendReply(msg);
  },
};
