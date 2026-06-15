// @author: 𝓗𝓮𝓷𝓻𝓲𝓺𝓾𝓮 𝓳𝓸𝓼𝓮 </>

import { PREFIX } from "../../config.js";

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Edita uma mensagem já enviada pelo bot via protocolo nativo do Baileys.
 * Não depende de nenhum import externo — usa apenas o socket já injetado.
 */
async function editMessage(socket, remoteJid, messageId, newText) {
  await socket.relayMessage(
    remoteJid,
    {
      protocolMessage: {
        key: {
          remoteJid,
          fromMe: true,
          id: messageId,
        },
        type: 14, // MESSAGE_EDIT
        editedMessage: {
          conversation: newText,
        },
      },
    },
    {}
  );
}

export default {
  name: "beck",
  description: "O bot fuma um beck e pode até ter uma overdose 🍁💨",
  commands: ["fumar", "beck", "420"],
  usage: `${PREFIX}beck`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendReply, socket, remoteJid }) => {
    const brisaNormal = [
      `🚬💨 *Acendendo o beck...*`,
      `🍁🔥 *Primeira tragada...* 😶‍🌫️`,
      `🍁💨 *Chapandoooo* 🌀`,
      `🤯 *Efeito bateu...*`,
      `😵 *Vish... to travado*`,
      `🍃💭 *Refletindo sobre a existência do bot...*`,
      `🛸 *Tô na brisa... indo pra Netuno*`,
      `😮‍💨 *A última tragada...*`,
      `✨ *Brisa finalizada. Voltando ao código...*`,
    ];

    const overdoseFinal = [
      `☠️ *Opa... acho que exagerei na dose*`,
      `💀 *Sistema travado... Reboot forçado em 3...2...1...*`,
      `😵‍💫 *Maconha adulterada... entrando em coma digital*`,
      `🧠 *Stack Overflow de brisa detectado*`,
      `🔥 *Erro 420: Bot queimou a mente*`,
    ];

    const chanceDeOverdose = Math.random() < 0.75; // 75% de chance

    // Envia a primeira mensagem da brisa
    const sentMsg = await sendReply(brisaNormal[0]);
    const messageId = sentMsg.key.id;

    // Executa a sequência da brisa até a penúltima
    for (let i = 1; i < brisaNormal.length - 1; i++) {
      await delay(1300);
      await editMessage(socket, remoteJid, messageId, brisaNormal[i]);
    }

    await delay(1600);

    if (chanceDeOverdose) {
      const finalOverdose = overdoseFinal[Math.floor(Math.random() * overdoseFinal.length)];
      await editMessage(socket, remoteJid, messageId, finalOverdose);
    } else {
      await editMessage(socket, remoteJid, messageId, brisaNormal[brisaNormal.length - 1]);
    }
  },
};
