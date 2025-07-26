const { PREFIX } = require(`${BASE_DIR}/config`);
const {
  updateIsActiveGroupRestriction,
} = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "unmuteall",
  description: "Reativa o grupo e desativa o modo apenas figurinhas.",
  commands: ["unmuteall"],
  usage: `${PREFIX}unmuteall`,
  handle: async ({ client, message, sendMessage }) => {
    const groupId = message.chatId;

    try {
      await client.groupSettingUpdate(groupId, "not_announcement");

      // Desativa modo apenas figurinhas
      updateIsActiveGroupRestriction(groupId, "onlySticker", false);

      await sendMessage(groupId, "🔊 Grupo reativado. Todos os membros podem enviar mensagens novamente.");
    } catch (err) {
      console.error("Erro no comando /unmuteall:", err.message);
      await sendMessage(groupId, "❌ Não consegui reativar o grupo.");
    }
  },
};