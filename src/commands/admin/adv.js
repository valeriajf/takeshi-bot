// @author: Dev VaL

import { PREFIX } from "../../config.js";
import { InvalidParameterError } from "../../errors/index.js";
import { addWarn, getAllWarns, getWarnLimit } from "../../utils/warnSystem.js";

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
  name: "adv",
  description: "Dá advertência a um membro (ban com 3). Só admins podem usar.",
  commands: ["adv"],
  usage: `${PREFIX}adv @usuario | respondendo | número`,

  handle: async ({
    socket,
    remoteJid,
    userLid,
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
        `• Mencionando: ${PREFIX}adv @usuario\n` +
        `• Com número: ${PREFIX}adv 5541987761506`
      );
    }

    if (targetInput === userLid) {
      throw new InvalidParameterError("Você não pode se advertir.");
    }

    const { phone: realPhone, lid: realLid } = await resolveParticipant(socket, remoteJid, targetInput);

    // Usa o lid como chave (padrão do warnSystem.js)
    const count = addWarn(remoteJid, realLid, "Advertência manual");
    const limit = getWarnLimit(remoteJid);

    if (count >= limit) {
      await sendReply(
        `🚫 @${realPhone.split("@")[0]} atingiu ${limit} advertências e será removido do grupo.`,
        [realPhone]
      );
      try {
        await socket.groupParticipantsUpdate(remoteJid, [realLid], "remove");
      } catch {
        await sendReply("❌ Erro ao remover o usuário. O bot é administrador?");
      }
    } else {
      await sendReply(
        `⚠️ Advertência aplicada em @${realPhone.split("@")[0]}.\n🔢 Total: ${count}/${limit}.`,
        [realPhone]
      );
    }
  },
};
