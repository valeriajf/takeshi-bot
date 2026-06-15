import path from "node:path";
import { ASSETS_DIR, PREFIX } from "../../../config.js";
import { InvalidParameterError } from "../../../errors/index.js";
import { onlyNumbers } from "../../../utils/index.js";

export default {
  name: "duelar",
  description: "Desafia alguém para um duelo.",
  commands: ["duelar"],
  usage: `${PREFIX}duelar @usuario`,

  handle: async ({
    sendGifFromFile,
    sendErrorReply,
    userLid,
    replyLid,
    args,
    isReply,
  }) => {
    if (!args.length && !isReply) {
      throw new InvalidParameterError(
        "Você precisa mencionar ou marcar um membro para duelar!"
      );
    }

    const targetLid = isReply
      ? replyLid
      : args[0]
      ? `${onlyNumbers(args[0])}@lid`
      : null;

    if (!targetLid) {
      await sendErrorReply(
        "Você precisa mencionar um usuário ou responder uma mensagem para duelar."
      );
      return;
    }

    const userNumber = onlyNumbers(userLid);
    const targetNumber = onlyNumbers(targetLid);

    const winner =
      Math.random() < 0.5 ? userNumber : targetNumber;

    const loser =
      winner === userNumber
        ? targetNumber
        : userNumber;

    await sendGifFromFile(
      path.resolve(ASSETS_DIR, "images", "funny", "duel.mp4"),
      `⚔️ @${userNumber} desafiou @${targetNumber} para um duelo!\n\n🏆 O vencedor foi @${winner}!\n💀 @${loser} virou estatística.`,
      [userLid, targetLid]
    );
  },
};