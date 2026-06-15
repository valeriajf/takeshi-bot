import { PREFIX } from "../../../config.js";
import {
  InvalidParameterError,
  WarningError,
} from "../../../errors/index.js";
import { download } from "../../../services/spider-x-api.js";

export default {
  name: "yt-music",
  description: "Baixo músicas do YouTube Music",
  commands: ["yt-music", "youtube-music", "music-mp3"],
  usage: `${PREFIX}yt-music https://music.youtube.com/watch?v=xxxx`,

  /**
   * @param {CommandHandleProps} props
   */
  handle: async ({
    fullArgs,
    sendAudioFromURL,
    sendImageFromURL,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
  }) => {
    if (!fullArgs.length) {
      throw new InvalidParameterError(
        "Você precisa enviar um link do YouTube Music!"
      );
    }

    if (!fullArgs.includes("music.youtube.com")) {
      throw new WarningError(
        "O link informado não é do YouTube Music!"
      );
    }

    await sendWaitReact();

    try {
      const youtubeURL = fullArgs.replace(
        "music.youtube.com",
        "www.youtube.com"
      );

      const data = await download(
        "yt-mp3",
        youtubeURL
      );

      if (!data) {
        await sendErrorReply(
          "Nenhum resultado encontrado!"
        );
        return;
      }

      let title = data.title || "Título desconhecido";
      let artist = data.channel?.name || "Desconhecido";

      if (title.includes(" - ")) {
        const parts = title.split(" - ");

        artist = parts[0].trim();
        title = parts.slice(1).join(" - ").trim();
      }

      const albumMatch = title.match(/\((.*?)\)/);

      const album = albumMatch
        ? albumMatch[1]
        : "YouTube Music";

      await sendImageFromURL(
        data.thumbnail,
        `🎶 *${title}*

🎤 *Artista:* ${artist}
💿 *Álbum:* ${album}
⏱️ *Duração:* ${data.total_duration_in_seconds || 0}s

«── « ♫ 𝐏𝐋𝐀𝐘𝐈𝐍𝐆 ♫ » ──»
💚 *By DeadBoT*`
      );

      await sendAudioFromURL(data.url);

      await sendSuccessReact();
    } catch (error) {
      console.log(error);

      await sendErrorReply(
        error?.message ||
          "Ocorreu um erro ao baixar a música."
      );
    }
  },
};