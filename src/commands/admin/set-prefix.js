import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { setPrefix } from "../../utils/database.js";

export default {
  name: "set-prefix",
  description: "Mudo o prefixo de uso dos meus comandos",
  commands: [
    "set-prefix",
    "altera-prefix",
    "altera-prefixo",
    "alterar-prefix",
    "alterar-prefixo",
    "muda-prefix",
    "muda-prefixo",
    "mudar-prefix",
    "mudar-prefixo",
    "set-prefixo",
  ],
  usage: `${PREFIX}set-prefix /`,
  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({ remoteJid, args, fullArgs, sendSuccessReply }) => {
    // Verificação de admin/owner é feita automaticamente pelo middleware
    // pelo fato deste arquivo estar em src/commands/admin/

    // Usa fullArgs como fallback para capturar caracteres especiais como /
    const input = args.length ? args.join(" ") : (fullArgs || "");
    const newPrefix = input.trim();

    if (!newPrefix) {
      throw new InvalidParameterError(
        `Você deve fornecer um prefixo! Exemplo: ${PREFIX}set-prefix /`
      );
    }

    if (newPrefix.length > 1) {
      throw new InvalidParameterError("O prefixo deve ser apenas 1 caractere!");
    }

    await setPrefix(remoteJid, newPrefix);
    await sendSuccessReply(`Prefixo alterado para: ${newPrefix} neste grupo!`);
  },
};
