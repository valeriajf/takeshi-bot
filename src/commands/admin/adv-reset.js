// @author: Dev VaL

import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { getAllWarns, revokeWarnByIndex } from "../../utils/warnSystem.js";

/**
 * Busca o participante por LID, phoneNumber ou número limpo.
 * Retorna { phone, lid }
 */
async function resolveParticipant(socket, remoteJid, input) {
  try {
    const metadata = await socket.groupMetadata(remoteJid);
    const inputClean = input.replace(/\D/g, "");

    for (const p of metadata.participants) {
      const pidClean = p.id.replace(/\D/g, "");
      const phoneClean = p.phoneNumber ? p.phoneNumber.replace(/\D/g, "") : "";

      if (
        p.id === input ||
        p.lid === input ||
        p.phoneNumber === input ||
        pidClean === inputClean ||
        phoneClean === inputClean
      ) {
        return { phone: p.phoneNumber || p.id, lid: p.id };
      }
    }
  } catch {}

  return { phone: input, lid: input };
}

export default {
  name: "advreset",
  description: "Reseta as advertências de um usuário.",
  commands: ["advreset", "adv-reset"],
  usage: `${PREFIX}adv-reset @usuario | respondendo | número`,

  handle: async ({
    socket,
    remoteJid,
    isGroup,
    sendReply,
    mentionedLid,
    args,
    isReply,
    replyLid,
  }) => {
    if (!isGroup) {
      throw new InvalidParameterError("Esse comando só funciona em grupos.");
    }

    let targetInput = null;

    if (isReply && replyLid) {
      targetInput = replyLid;
    } else if (mentionedLid?.length > 0) {
      targetInput = mentionedLid[0];
    } else if (args.length > 0) {
      let numero = args.join("").replace(/\D/g, "");
      if (!numero.startsWith("55") && numero.length <= 11) numero = "55" + numero;
      targetInput = numero + "@s.whatsapp.net";
    }

    if (!targetInput) {
      throw new InvalidParameterError(
        `Use o comando de uma das formas:\n` +
        `• Respondendo à mensagem do usuário\n` +
        `• Mencionando: ${PREFIX}adv-reset @usuario\n` +
        `• Com número: ${PREFIX}adv-reset 5541987761506`
      );
    }

    const { phone: realPhone, lid: realLid } = await resolveParticipant(socket, remoteJid, targetInput);

    // Busca advertências válidas pelo lid (padrão do warnSystem.js)
    const warns = getAllWarns(remoteJid, realLid);
    const validWarns = warns.filter(w => w.valid);

    if (validWarns.length === 0) {
      await sendReply(
        `ℹ️ @${realPhone.split("@")[0]} não possui advertências registradas.`,
        [realPhone]
      );
      return;
    }

    // Revoga todas as advertências válidas (do último para o primeiro)
    let removed = 0;
    for (let i = validWarns.length - 1; i >= 0; i--) {
      revokeWarnByIndex(remoteJid, realLid, i);
      removed++;
    }

    await sendReply(
      `✅ Advertências de @${realPhone.split("@")[0]} foram resetadas.\n📊 Removidas: ${removed}/${validWarns.length}.`,
      [realPhone]
    );
  },
};
