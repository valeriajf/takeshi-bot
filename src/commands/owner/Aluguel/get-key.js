/**
 * Comando: get-key - Gera chave de ativação para um grupo
 * 📁 src/commands/owner/Aluguel/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../../config.js";
import { InvalidParameterError } from "../../../errors/index.js";
import { criarChave } from "../../../utils/aluguel.js";

export default {
  name: "get-key",
  description: "Gera uma chave de ativação para um grupo específico",
  commands: ["get-key"],
  usage: `${PREFIX}get-key <groupId> <tempo> <tipo>`,

  handle: async ({ sendReply, fullArgs, socket }) => {
    const partes = (fullArgs || "").trim().split(/\s+/);

    if (partes.length < 3) {
      throw new InvalidParameterError(
        `Uso: ${PREFIX}get-key <groupId> <tempo> <tipo>\n\n` +
        `Exemplos:\n${PREFIX}get-key 120363426929015404@g.us 30 dias\n` +
        `${PREFIX}get-key 120363426929015404@g.us 24 horas`
      );
    }

    const groupId   = partes[0].trim();
    const quantidade = parseInt(partes[1]);
    const tipo       = partes[2]?.toLowerCase().trim();

    if (!groupId.endsWith("@g.us")) {
      throw new InvalidParameterError("ID de grupo inválido. Deve terminar com @g.us");
    }

    if (isNaN(quantidade) || quantidade <= 0) {
      throw new InvalidParameterError("O tempo deve ser um número maior que zero.");
    }

    if (!["dias", "horas", "minutos"].includes(tipo)) {
      throw new InvalidParameterError("Tipo inválido. Use: dias, horas ou minutos.");
    }

    let nomeGrupo = "Grupo sem nome";
    try {
      const meta = await socket.groupMetadata(groupId);
      if (meta?.subject) nomeGrupo = meta.subject;
    } catch (_) {}

    let dados;
    try {
      dados = criarChave(groupId, quantidade, tipo, nomeGrupo);
    } catch (e) {
      throw new InvalidParameterError("Erro ao gerar chave: " + e.message);
    }

    await sendReply(
      `✅ *CHAVE GERADA COM SUCESSO!*\n\n` +
      `🔑 *Chave:* \`\`\`${dados.chave}\`\`\`\n\n` +
      `🪀 *Grupo:* ${nomeGrupo}\n` +
      `🆔 *ID:* ${groupId}\n` +
      `⏱️ *Duração:* ${quantidade} ${tipo}\n` +
      `📅 *Gerada em:* ${dados.criadaEm}\n\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `📤 *Passe esta chave pro cliente.*\n` +
      `O cliente ativa com:\n*${PREFIX}key-id ${dados.chave}*`
    );
  },
};
