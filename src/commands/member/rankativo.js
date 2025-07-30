// @author: VaL

const { PREFIX } = require(`${BASE_DIR}/config`);
const { getRanking } = require(`${BASE_DIR}/utils/atividade`);

module.exports = {
  name: "rankativo",
  description: "Exibe os 10 membros mais ativos do grupo, divididos por medalhas",
  commands: ["rankativo", "topativos"],
  usage: `${PREFIX}rankativo`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendText, remoteJid }) => {
    const ranking = getRanking(remoteJid, 10);

    let texto = "🏆 *Ranking dos mais ativos do grupo (mensal)*\n\n";

    for (let i = 0; i < 10; i++) {
      const membro = ranking[i];

      let medalha = "🔹";
      if (i === 0) medalha = "🥇";
      else if (i === 1) medalha = "🥈";
      else if (i === 2) medalha = "🥉";

      if (membro) {
        texto += `${medalha} *${membro.nome}* — ${membro.mensagens} mensagens\n`;
      } else {
        texto += `${medalha} *N/A* — 0 mensagens\n`;
      }
    }

    await sendText(texto);
  },
};