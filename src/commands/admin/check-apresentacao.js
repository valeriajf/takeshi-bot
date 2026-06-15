/**
 * Comando check-apresentacao
 * Lista membros pendentes de apresentação com tempo restante
 *
 * @author Dev VaL (DeadBoT)
 */
import { PREFIX } from "../../config.js";
import { WarningError } from "../../errors/index.js";
import { getPendentesDoGrupo } from "../../utils/apresentacao-monitor.js";

export default {
  name: "check-apresentacao",
  description: "Lista membros que ainda não se apresentaram com o tempo restante",
  commands: ["check-apresentacao"],
  usage: `${PREFIX}check-apresentacao`,

  handle: async ({
    sendReply,
    socket,
    remoteJid,
    isGroup,
  }) => {
    if (!isGroup) {
      throw new WarningError("Esse comando só pode ser usado em grupos!");
    }

    const pendentes = getPendentesDoGrupo(remoteJid);

    if (pendentes.length === 0) {
      return await sendReply(
        "✅ Nenhum membro pendente de apresentação no momento!"
      );
    }

    const metadata = await socket.groupMetadata(remoteJid);
    const agora = Date.now();
    const mentions = [];
    const linhas = [];

    for (const { membroJid, entradaTimestamp, minutos } of pendentes) {
      const prefixo = membroJid.split(":")[0];

      const participante = metadata.participants.find(
        (p) => p.jid?.startsWith(prefixo) || p.id?.startsWith(prefixo)
      );
      if (!participante) continue;

      const jidReal = participante.lid || participante.id;

      const restanteMs = Math.max(0, minutos * 60 * 1000 - (agora - entradaTimestamp));
      const min = Math.floor(restanteMs / 60000);
      const seg = Math.floor((restanteMs % 60000) / 1000);
      const tempoStr = min > 0 ? `${min}min ${seg}s` : `${seg}s`;

      mentions.push(jidReal);
      linhas.push(`👤 @${jidReal.split("@")[0]} — ⏱️ ${tempoStr} restante(s)`);
    }

    if (linhas.length === 0) {
      return await sendReply("✅ Nenhum membro pendente de apresentação no momento!");
    }

    await socket.sendMessage(remoteJid, {
      text:
        `⚠️ *Membros que ainda não se apresentaram:*\n\n` +
        linhas.join("\n") +
        `\n\n🤖 Envie qualquer mensagem para ser liberado(a).\n` +
        `Caso contrário será removido(a) automaticamente quando o prazo expirar!`,
      mentions,
    });
  },
};
