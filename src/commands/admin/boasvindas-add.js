/**
 * Comando boasvindas-add
 * Define ou altera a mensagem de boas-vindas personalizada do grupo.
 * Suporta variáveis dinâmicas como {grupo}.
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
  name: "boasvindas-add",
  description: "Define ou altera a mensagem de boas-vindas do grupo atual.",
  commands: ["bv-add"],
  usage: `${PREFIX}bv-add [mensagem]`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    sendSuccessReact,
    sendWarningReact,
    sendErrorReact,
    sendReply,
    sendErrorReply,
    remoteJid,
    userLid,
    args,
  }) => {
    try {
      const messageText = args.join(" ").trim();

      if (!messageText) {
        await sendWarningReact();

        return await sendReply(
          `⚠️ Uso correto: ${PREFIX}bv-add Bem-vindo(a) ao {grupo}! 💀🔥`
        );
      }

      const dbDir = path.dirname(DB_PATH);

      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(
          DB_PATH,
          JSON.stringify({}, null, 2),
          "utf-8"
        );
      }

      const data = JSON.parse(
        fs.readFileSync(DB_PATH, "utf-8")
      );

      data[remoteJid] = {
        message: messageText,
        updatedBy: userLid,
        updatedAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        DB_PATH,
        JSON.stringify(data, null, 2),
        "utf-8"
      );

      await sendSuccessReact();

      await sendReply(
        `✅ Mensagem de boas-vindas configurada com sucesso!\n\n💬 *Mensagem salva:*\n"${messageText}"`
      );
    } catch (error) {
      console.error(
        "❌ Erro no comando boasvindas-add:",
        error
      );

      await sendErrorReact();

      await sendErrorReply(
        "❌ Erro ao salvar a mensagem de boas-vindas."
      );
    }
  },
};