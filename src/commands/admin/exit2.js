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
    console.log("[EXIT2] Lendo:", EXIT2_DB_PATH);

    if (fs.existsSync(EXIT2_DB_PATH)) {
      const data = JSON.parse(
        fs.readFileSync(EXIT2_DB_PATH, "utf8")
      );

      console.log("[EXIT2] Banco carregado:");
      console.log(JSON.stringify(data, null, 2));

      return data;
    }

    console.log("[EXIT2] Banco não existe.");
    return {};
  } catch (err) {
    console.error("[EXIT2] Erro ao carregar banco:", err);
    return {};
  }
}

function saveExitData(data) {
  try {
    console.log("[EXIT2] Salvando banco...");

    fs.writeFileSync(
      EXIT2_DB_PATH,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    console.log("[EXIT2] Banco salvo com sucesso.");
  } catch (err) {
    console.error("[EXIT2] Erro ao salvar banco:", err);
  }
}

export default {
  name: "exit2",
  description: "Ativa ou desativa o sistema de saída personalizada.",
  commands: ["exit2"],
  usage: `${PREFIX}exit2 (1/0)`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    remoteJid,
    sendReply,
    sendSuccessReact,
    sendErrorReply,
    isGroup,
  }) => {
    try {
      console.log("=================================");
      console.log("[EXIT2] Comando executado");
      console.log("[EXIT2] Grupo:", remoteJid);
      console.log("[EXIT2] Args:", args);
      console.log("=================================");

      if (!isGroup) {
        throw new WarningError(
          "Este comando só pode ser usado em grupos!"
        );
      }

      if (!args.length) {
        throw new InvalidParameterError(
          "Use 1 para ativar e 0 para desativar."
        );
      }

      const enable = args[0] === "1";
      const disable = args[0] === "0";

      console.log("[EXIT2] enable:", enable);
      console.log("[EXIT2] disable:", disable);

      if (!enable && !disable) {
        throw new InvalidParameterError(
          "Use apenas 1 para ativar ou 0 para desativar."
        );
      }

      const exitData = loadExitData();

      if (!exitData[remoteJid]) {
        console.log("[EXIT2] Criando registro do grupo.");

        exitData[remoteJid] = {
          active: false,
          message: "👋 {membro} saiu do {grupo}!",
        };
      }

      console.log(
        "[EXIT2] Estado atual:",
        exitData[remoteJid]
      );

      if (enable && exitData[remoteJid].active) {
        throw new WarningError(
          "O sistema EXIT2 já está ativado."
        );
      }

      if (disable && !exitData[remoteJid].active) {
        throw new WarningError(
          "O sistema EXIT2 já está desativado."
        );
      }

      exitData[remoteJid].active = enable;

      console.log(
        "[EXIT2] Novo estado:",
        exitData[remoteJid]
      );

      saveExitData(exitData);

      if (sendSuccessReact) {
        await sendSuccessReact();
      }

      if (enable) {
        await sendReply(
          `✅ EXIT2 ativado com sucesso!\n\nUse ${PREFIX}set-exit2 para definir a mensagem de saída.\n\nVariáveis disponíveis:\n• {membro}\n• {grupo}`
        );
      } else {
        await sendReply(
          "✅ EXIT2 desativado com sucesso!"
        );
      }

      console.log("[EXIT2] Finalizado com sucesso.");
    } catch (error) {
      console.error("[EXIT2] ERRO:");
      console.error(error);

      await sendErrorReply(
        error.message || "Erro interno."
      );
    }
  },
};