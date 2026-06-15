/**
 * Comando Zerar Rank Global - Apaga os dados de atividade de todos os grupos
 * Pasta: src/commands/owner/
 *
 * @author Dev VaL
 */
import { PREFIX } from "../../config.js";
import activityTracker from "../../utils/activityTracker.js";

export default {
  name: "zerar-rank-global",
  description: "Zera o ranking de atividade de todos os grupos",
  commands: ["zerar-rank-global", "resetrank-global", "limpar-rank-global"],
  usage: `${PREFIX}zerar-rank-global`,

  handle: async ({
    socket,
    sendReply,
    sendSuccessReply,
    remoteJid,
    userLid,
  }) => {
    const totalGrupos = Object.keys(activityTracker.stats).length;

    if (totalGrupos === 0) {
      return await sendReply("ℹ️ Não há dados de atividade em nenhum grupo.");
    }

    await sendReply(
      `⚠️ *ATENÇÃO — AÇÃO IRREVERSÍVEL* ⚠️\n\n` +
      `Você está prestes a apagar os dados de atividade de *${totalGrupos} grupo(s)*.\n\n` +
      `Para confirmar, responda *SIM* em até 1 minuto.\n` +
      `Para cancelar, responda *NÃO*.`
    );

    // Aguarda confirmação via socket injetado
    const confirmed = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.ev.off("messages.upsert", handler);
        resolve(false);
      }, 60_000);

      async function handler(upsert) {
        const msg = upsert.messages?.[0];
        if (!msg || msg.key.remoteJid !== remoteJid) return;

        const sender = msg.key.participant || msg.key.remoteJid;
        if (sender !== userLid) return;

        const text = (
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          ""
        ).trim().toUpperCase();

        if (text === "SIM" || text === "NÃO" || text === "NAO") {
          clearTimeout(timeout);
          socket.ev.off("messages.upsert", handler);
          resolve(text === "SIM");
        }
      }

      socket.ev.on("messages.upsert", handler);
    });

    if (!confirmed) {
      return await sendReply("❌ Operação cancelada. Nenhum dado foi apagado.");
    }

    activityTracker.stats = {};
    activityTracker.saveStats();

    await sendSuccessReply(
      `✅ *Ranking global zerado com sucesso!*\n\n` +
      `🗑️ Dados de *${totalGrupos} grupo(s)* foram apagados.\n` +
      `📊 Todos os rankings começam do zero a partir de agora.`
    );
  },
};
