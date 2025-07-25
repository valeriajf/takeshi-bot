const path = require("path");
const fs = require("fs");
const { PREFIX, ASSETS_DIR } = require(`${BASE_DIR}/config`);
const { menuMessage } = require(`${BASE_DIR}/menu`);

module.exports = {
  name: "menu",
  description: "Menu de comandos",
  commands: ["menu", "help"],
  usage: `${PREFIX}menu`,
  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ sendImageFromFile, sendGifFromFile, sendSuccessReact }) => {
    await sendSuccessReact();

    const menuBasePath = path.join(ASSETS_DIR, "images");
    const menuFileName = fs
      .readdirSync(menuBasePath)
      .find((file) => file.startsWith("takeshi-bot"));

    if (!menuFileName) {
      throw new Error("Arquivo de menu não encontrado.");
    }

    const fullPath = path.join(menuBasePath, menuFileName);
    const isGifOrMp4 = /\.(gif|mp4)$/i.test(menuFileName);
    const caption = `\n\n${menuMessage()}`;

    if (isGifOrMp4) {
      await sendGifFromFile(fullPath, caption);
    } else {
      await sendImageFromFile(fullPath, caption);
    }
  },
};