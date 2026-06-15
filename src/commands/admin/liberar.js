import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { errorLog } from "../../utils/logger.js";

export default {
  name: "liberar",
  description: "Aprova solicitações de entrada no grupo",
  commands: ["liberar", "aprovar", "aceitar"],
  usage: `${PREFIX}liberar 5`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    args,
    socket,
    remoteJid,
    sendReply,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    try {
      let qtdLiberar = 1;

      if (args.length) {
        qtdLiberar = parseInt(args[0]);

        if (isNaN(qtdLiberar) || qtdLiberar <= 0) {
          throw new InvalidParameterError(
            `Digite um número válido.\nExemplo: ${PREFIX}liberar 3`
          );
        }
      }

      const MAX_LIBERAR = 10;

      if (qtdLiberar > MAX_LIBERAR) {
        throw new InvalidParameterError(
          `O limite máximo é ${MAX_LIBERAR} solicitações por vez.`
        );
      }

      const pendentes =
        await socket.groupRequestParticipantsList(remoteJid);

      if (!pendentes?.length) {
        throw new InvalidParameterError(
          "Não há solicitações pendentes."
        );
      }

      pendentes.sort(
        (a, b) => a.request_time - b.request_time
      );

      if (qtdLiberar > pendentes.length) {
        qtdLiberar = pendentes.length;
      }

      let aprovados = 0;
      let falhas = 0;

      const progresso = await socket.sendMessage(remoteJid, {
        text: `⏳ Aprovando ${qtdLiberar} solicitação(ões)...`,
      });

      for (let i = 0; i < qtdLiberar; i++) {
        try {
          await socket.groupRequestParticipantsUpdate(
            remoteJid,
            [pendentes[i].jid],
            "approve"
          );

          aprovados++;
        } catch (error) {
          falhas++;

          errorLog(
            `[LIBERAR] Falha ao aprovar ${pendentes[i].jid}: ${error.message}`
          );
        }

        await socket.sendMessage(remoteJid, {
          text: `🚦 Progresso: ${i + 1}/${qtdLiberar}`,
          edit: progresso.key,
        });

        if (i < qtdLiberar - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, 4000)
          );
        }
      }

      await socket.sendMessage(remoteJid, {
        text:
          `✅ Solicitações processadas!\n\n` +
          `✔️ Aprovados: ${aprovados}\n` +
          `❌ Falhas: ${falhas}`,
        edit: progresso.key,
      });

      await sendSuccessReact();
    } catch (error) {
      errorLog(JSON.stringify(error, null, 2));

      await sendErrorReply(
        `Ocorreu um erro ao aprovar solicitações: ${error.message}`
      );
    }
  },
};