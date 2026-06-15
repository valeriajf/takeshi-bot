import fs from "node:fs";
import path from "node:path";

import { PREFIX } from "../../config.js";
import {
  InvalidParameterError,
  WarningError,
} from "../../errors/index.js";

const EXIT2_DB_PATH = path.resolve(
  process.cwd(),
  "database",
  "exit-messages.json"
);

function loadExitData() {
  try {
    if (!fs.existsSync(EXIT2_DB_PATH)) {
      return {};
    }

    return JSON.parse(
      fs.readFileSync(EXIT2_DB_PATH, "utf8")
    );
  } catch {
    return {};
  }
}

function saveExitData(data) {
  fs.writeFileSync(
    EXIT2_DB_PATH,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

export default {
  name: "set-exit2",
  description:
    "Define a mensagem personalizada do EXIT2.",

  commands: [
    "set-exit2",
    "setexit2",
    "msgsaida",
  ],

  usage:
    `${PREFIX}set-exit2 Sua mensagem aqui`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    remoteJid,
    isGroup,
    sendReply,
    sendSuccessReact,
  }) => {
    if (!isGroup) {
      throw new WarningError(
        "Este comando só pode ser usado em grupos."
      );
    }

    if (!args.length) {
      throw new InvalidParameterError(
        `Informe a mensagem.\n\nExemplo:\n${PREFIX}set-exit2 👋 {membro} saiu do {grupo}!`
      );
    }

    const message = args.join(" ").trim();

    const exitData = loadExitData();

    if (!exitData[remoteJid]) {
      exitData[remoteJid] = {
        active: false,
        message: "",
      };
    }

    exitData[remoteJid].message = message;

    saveExitData(exitData);

    await sendSuccessReact();

    await sendReply(
      `✅ Mensagem do EXIT2 definida com sucesso!\n\n` +
      `📄 Nova mensagem:\n${message}\n\n` 
    );
  },
};