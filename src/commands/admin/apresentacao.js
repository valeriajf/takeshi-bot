/**
 * Comando de apresentação obrigatória
 * Ativa/desativa o sistema que remove membros que não se apresentarem no prazo
 *
 * @author Dev VaL (DeadBoT)
 */
import { PREFIX } from "../../config.js";
import { InvalidParameterError, WarningError } from "../../errors/index.js";
import { ativar, desativar, isAtivo, getConfig } from "../../utils/apresentacao-database.js";
import { onSistemaDesativado } from "../../utils/apresentacao-monitor.js";

export default {
  name: "apresentacao",
  description: "Ativa/desativa o sistema de apresentação obrigatória no grupo",
  commands: ["apresentacao"],
  usage: `${PREFIX}apresentacao on [minutos] | ${PREFIX}apresentacao off`,

  handle: async ({
    sendReply,
    sendSuccessReply,
    fullArgs,
    remoteJid,
    isGroup,
  }) => {
    if (!isGroup) {
      throw new WarningError("Esse comando só pode ser usado em grupos!");
    }

    // fullArgs ex: "on 5" | "on / 5" | "off" | ""
    const partes = (fullArgs || "")
      .replace(/\//g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const subcomando = partes[0]?.toLowerCase();

    // Sem argumento → status atual
    if (!subcomando) {
      const config = getConfig(remoteJid);

      if (config?.ativo) {
        return await sendReply(
          `📋 *Status da apresentação:* ATIVO\n` +
          `⏱️ Prazo: *${config.minutos} minuto(s)*\n\n` +
          `Para desativar: *${PREFIX}apresentacao off*`
        );
      }

      return await sendReply(
        `📋 *Status da apresentação:* INATIVO\n\n` +
        `Para ativar: *${PREFIX}apresentacao on [minutos]*`
      );
    }

    if (subcomando === "off") {
      if (!isAtivo(remoteJid)) {
        throw new WarningError("O sistema de apresentação já está desativado!");
      }

      desativar(remoteJid);
      onSistemaDesativado(remoteJid);

      return await sendSuccessReply(
        "Sistema de apresentação *desativado*.\n" +
        "Agora pode entrar mudo que não tem problema... por enquanto. 😏"
      );
    }

    if (subcomando === "on") {
      const minutos = parseInt(partes[1]);

      if (!minutos || isNaN(minutos) || minutos < 1) {
        throw new InvalidParameterError(
          `Uso correto: *${PREFIX}apresentacao on [minutos]*\n` +
          `Exemplo: *${PREFIX}apresentacao on 5*`
        );
      }

      if (isAtivo(remoteJid)) {
        const config = getConfig(remoteJid);
        if (config.minutos === minutos) {
          throw new WarningError(
            `O sistema já está ativo com prazo de *${minutos} minuto(s)*!`
          );
        }
      }

      ativar(remoteJid, minutos);

      return await sendSuccessReply(
        `🤖 *Configuração de apresentação ativada com sucesso!*\n\n` +
        `Membros que entrarem no grupo e não enviarem uma mensagem ` +
        `em até *${minutos} minuto(s)* serão removidos automaticamente.`
      );
    }

    throw new InvalidParameterError(
      `Subcomando inválido!\n` +
      `Uso: *${PREFIX}apresentacao on [minutos]* ou *${PREFIX}apresentacao off*`
    );
  },
};
