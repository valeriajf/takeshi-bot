/**
 * Comando: key-id - Ativa uma chave de aluguel no grupo
 * 📁 src/commands/admin/ | @author Dev VaL (DeadBoT) @version 3.0
 */

import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import { obterChave, usarChave, removerChave, registrarAluguel } from "../../utils/aluguel.js";
import { activateGroup } from "../../utils/database.js";

export default {
  name: "key-id",
  description: "Ativa uma chave de aluguel no grupo",
  commands: ["key-id"],
  usage: `${PREFIX}key-id <chave>`,

  handle: async ({ sendReply, args, remoteJid, isGroup, socket }) => {
    if (!isGroup) throw new WarningError("Este comando só pode ser usado em grupos.");

    if (!args[0]) {
      throw new InvalidParameterError(
        `Informe a chave.\nExemplo: ${PREFIX}key-id Z93AW9PJ`
      );
    }

    const chave = args[0].toUpperCase().trim();
    const dados = obterChave(chave);

    if (!dados) {
      throw new WarningError(
        `Chave inválida! \`\`\`${chave}\`\`\`\n\nVerifique a chave ou solicite uma nova ao dono do bot.`
      );
    }

    if (dados.usada) {
      throw new WarningError(
        `Chave já utilizada!\n\n` +
        `🔑 *Chave:* \`\`\`${chave}\`\`\`\n` +
        `📅 *Usada em:* ${dados.usadaEm}\n\n` +
        `Solicite uma nova chave ao dono do bot.`
      );
    }

    if (dados.groupId !== remoteJid) {
      throw new WarningError(
        `Esta chave não é válida para este grupo!\n\n` +
        `🔑 *Chave:* \`\`\`${chave}\`\`\`\n\n` +
        `Esta chave foi gerada para outro grupo.\n` +
        `Solicite uma chave específica para este grupo.`
      );
    }

    let nomeGrupo = dados.nomeGrupo || "Grupo sem nome";
    try {
      const meta = await socket.groupMetadata(remoteJid);
      if (meta?.subject) nomeGrupo = meta.subject;
    } catch (_) {}

    const aluguel = registrarAluguel(remoteJid, dados.quantidade, dados.tipo, nomeGrupo);
    activateGroup(remoteJid);
    usarChave(chave);
    removerChave(chave);

    await sendReply(
      `✅ *BOT ATIVADO COM SUCESSO!* 🎉\n\n` +
      `🪀 *Grupo:* ${nomeGrupo}\n` +
      `🔑 *ID do aluguel:* \`\`\`${aluguel.id}\`\`\`\n` +
      `⏱️ *Duração:* ${aluguel.duracao}\n` +
      `📅 *Expira em:* ${aluguel.expira}\n\n` +
      `🤖 O bot está ativo neste grupo!\n\n` +
      `⚠️ O bot será desativado automaticamente quando o aluguel expirar.\n\n` +
      `💡 Use *${PREFIX}aluguel-status* para ver o status.`
    );
  },
};
