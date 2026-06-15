/**
 * Comando: listar-key - Lista todas as chaves geradas
 * 📁 src/commands/owner/Aluguel/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../../config.js";
import { listarChaves } from "../../../utils/aluguel.js";

export default {
  name: "listar-key",
  description: "Lista todas as chaves de ativação geradas",
  commands: ["listar-key"],
  usage: `${PREFIX}listar-key`,

  handle: async ({ sendReply }) => {
    const chaves   = listarChaves();
    const lista    = Object.values(chaves);

    if (lista.length === 0) {
      return await sendReply(
        `📋 *Nenhuma chave cadastrada.*\n\nUse *${PREFIX}get-key* para gerar uma nova chave.`
      );
    }

    const pendentes = lista.filter((c) => !c.usada);
    const usadas    = lista.filter((c) => c.usada);
    const sep       = "━━━━━━━━━━━━━━━━━━";

    let msg = `🔑 *CHAVES DE ATIVAÇÃO*\n\n`;
    msg    += `📊 Total: ${lista.length} | ✅ Pendentes: ${pendentes.length} | 🔴 Usadas: ${usadas.length}\n`;

    if (pendentes.length > 0) {
      msg += `\n${sep}\n✅ *PENDENTES (não usadas)*\n${sep}\n\n`;
      for (const c of pendentes) {
        msg += `🔑 *Chave:* \`\`\`${c.chave}\`\`\`\n`;
        msg += `🪀 *Grupo:* ${c.nomeGrupo || "Grupo sem nome"}\n`;
        msg += `🆔 *ID:* ${c.groupId}\n`;
        msg += `⏱️ *Duração:* ${c.quantidade} ${c.tipo}\n`;
        msg += `📅 *Gerada em:* ${c.criadaEm}\n`;
        msg += `${sep}\n\n`;
      }
    }

    if (usadas.length > 0) {
      msg += `\n${sep}\n🔴 *JÁ UTILIZADAS*\n${sep}\n\n`;
      for (const c of usadas) {
        msg += `🔑 *Chave:* \`\`\`${c.chave}\`\`\`\n`;
        msg += `🪀 *Grupo:* ${c.nomeGrupo || "Grupo sem nome"}\n`;
        msg += `🆔 *ID:* ${c.groupId}\n`;
        msg += `📅 *Usada em:* ${c.usadaEm}\n`;
        msg += `${sep}\n\n`;
      }
    }

    msg += `💡 Use *${PREFIX}del-key <chave>* para remover uma chave.`;
    await sendReply(msg);
  },
};
