/**
 * Comando: aluguel-status - Mostra o status do aluguel do grupo
 * 📁 src/commands/admin/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { obterAluguelDoGrupo, calcularTempoRestante } from "../../utils/aluguel.js";

export default {
  name: "aluguel-status",
  description: "Mostra o status do aluguel do grupo",
  commands: ["aluguel-status"],
  usage: `${PREFIX}aluguel-status`,

  handle: async ({ sendReply, remoteJid, isGroup, socket }) => {
    if (!isGroup) throw new WarningError("Este comando só pode ser usado em grupos.");

    let nomeGrupo = "Grupo sem nome";
    try {
      const meta = await socket.groupMetadata(remoteJid);
      nomeGrupo  = meta?.subject || "Grupo sem nome";
    } catch (_) {}

    const aluguel = obterAluguelDoGrupo(remoteJid);

    if (!aluguel) {
      return await sendReply(
        `📊 *STATUS DO ALUGUEL*\n\n` +
        `🪀 *NOME:* ${nomeGrupo}\n` +
        `🆔 *GRUPO:* ${remoteJid}\n` +
        `💢 *STATUS:* 🔴 DESATIVADO\n\n` +
        `🚨 Renove seu aluguel`
      );
    }

    const expirado = aluguel.expiraTimestamp <= Date.now();

    if (expirado) {
      return await sendReply(
        `📊 *STATUS DO ALUGUEL*\n\n` +
        `🪀 *NOME:* ${nomeGrupo}\n` +
        `🆔 *GRUPO:* ${remoteJid}\n` +
        `🔑 *ID:* \`\`\`${aluguel.id}\`\`\`\n` +
        `📅 *VENCIMENTO:* ${aluguel.expira}\n` +
        `💢 *STATUS:* 🔴 DESATIVADO\n\n` +
        `🚨 Vamos renovar seu contrato?`
      );
    }

    await sendReply(
      `📊 *STATUS DO ALUGUEL*\n\n` +
      `🪀 *NOME:* ${nomeGrupo}\n` +
      `🆔 *GRUPO:* ${remoteJid}\n` +
      `🔑 *ID:* \`\`\`${aluguel.id}\`\`\`\n` +
      `⏱️ *TEMPO CONTRATADO:* ${aluguel.duracao}\n` +
      `⌛ *TEMPO RESTANTE:* ${calcularTempoRestante(aluguel.expiraTimestamp)}\n` +
      `📅 *VENCIMENTO:* ${aluguel.expira}\n` +
      `💢 *STATUS:* 🟢 ATIVADO`
    );
  },
};
