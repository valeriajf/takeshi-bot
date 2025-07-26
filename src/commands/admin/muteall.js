const { PREFIX } = require(`${BASE_DIR}/config`);
const {
  updateIsActiveGroupRestriction,
} = require(`${BASE_DIR}/utils/database`);

module.exports = {
  name: "muteall",
  description: "Silencia o grupo e ativa o modo apenas figurinhas.",
  commands: ["muteall"],
  usage: `${PREFIX}muteall`,
  handle: async ({ client, message, sendMessage }) => {
    const groupId = message.chatId;

    try {
      await client.groupSettingUpdate(groupId, "announcement");

      // Ativa modo apenas figurinhas no banco
      updateIsActiveGroupRestriction(groupId, "onlySticker", true);

      await sendMessage(groupId, "🔇 Grupo silenciado. Apenas *figurinhas* são permitidas temporariamente.");
    } catch (err) {
      console.error("Erro no comando /muteall:", err.message);
      await sendMessage(groupId, "❌ Não consegui silenciar o grupo.");
    }
  },
};