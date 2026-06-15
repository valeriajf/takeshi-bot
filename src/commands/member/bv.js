/**
 * Comando bv
 * Exibe a mensagem de boas-vindas salva do grupo.
 * Suporta a variável {grupo} na mensagem.
 *
 * PASTA: src/commands/admin/
 *
 * @author VaL
 */

import fs from "node:fs";
import path from "node:path";
import { PREFIX } from "../../config.js";

const DB_PATH = path.join(
  process.cwd(),
  "database",
  "boasvindas.json"
);

export default {
  name: "bv",
  description: "Exibe a mensagem de boas-vindas configurada no grupo.",
  commands: ["bv", "boasvindas"],
  usage: `${PREFIX}bv`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    socket,
    remoteJid,
    sendWarningReact,
    sendReply,
    sendErrorReply,
  }) => {
    try {
      if (!fs.existsSync(DB_PATH)) {
        await sendWarningReact();

        return await sendReply(
          `⚠️ Nenhuma mensagem de boas-vindas configurada.\nUse ${PREFIX}bv-add [mensagem] para definir uma.`
        );
      }

      const data = JSON.parse(
        fs.readFileSync(DB_PATH, "utf-8")
      );

      const entry = data[remoteJid];

      if (!entry?.message) {
        await sendWarningReact();

        return await sendReply(
          `⚠️ Nenhuma mensagem de boas-vindas configurada para este grupo.\nUse ${PREFIX}bv-add [mensagem] para definir uma.`
        );
      }

      const groupMetadata =
        await socket.groupMetadata(remoteJid);

      const groupName =
        groupMetadata.subject || "o grupo";

      const finalMessage = entry.message.replace(
        /\{grupo\}/gi,
        groupName
      );

      await socket.sendMessage(remoteJid, {
        text: finalMessage,
      });
    } catch (error) {
      console.error(
        "❌ Erro no comando bv:",
        error
      );

      await sendErrorReply(
        "❌ Erro ao exibir a mensagem de boas-vindas."
      );
    }
  },
};