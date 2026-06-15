import {
  InvalidParameterError,
  WarningError,
} from "../../../errors/index.js";

export default {
  name: "twitter",
  description: "Faço o download de vídeos e imagens do Twitter/X!",
  commands: ["twitter", "tt", "x"],
  usage: "/twitter https://x.com/user/status/123456",

  handle: async ({
    sendVideoFromURL,
    sendImageFromURL,
    sendWaitReact,
    sendSuccessReact,
    sendErrorReply,
    fullArgs,
  }) => {
    if (!fullArgs?.trim()) {
      throw new InvalidParameterError(
        "Você precisa enviar uma URL do Twitter/X!\n\nExemplo:\n/twitter https://x.com/user/status/123456"
      );
    }

    const url = fullArgs.trim();

    const twitterUrlRegex =
      /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/[A-Za-z0-9_]+\/status\/[0-9]+/;

    if (!twitterUrlRegex.test(url)) {
      throw new WarningError(
        "URL inválida!\n\nFormatos aceitos:\n• https://twitter.com/user/status/123456\n• https://x.com/user/status/123456"
      );
    }

    await sendWaitReact();

    try {
      const apiUrl = `https://corex-brasil.onrender.com/api/twitter?url=${encodeURIComponent(
        url
      )}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/91.0.4472.124 Safari/537.36",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Erro HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data?.success) {
        throw new Error(
          data?.data || "Falha ao processar o tweet."
        );
      }

      if (!data?.data?.url) {
        throw new Error(
          "Nenhuma mídia encontrada neste tweet."
        );
      }

      await sendSuccessReact();

      const mediaUrls = data.data.url;

      // Vídeos
      if (Array.isArray(mediaUrls)) {
        const hdVideo = mediaUrls.find(
          (item) => typeof item === "object" && item.hd
        );

        const sdVideo = mediaUrls.find(
          (item) => typeof item === "object" && item.sd
        );

        const videoUrl =
          hdVideo?.hd ||
          sdVideo?.sd ||
          mediaUrls[0];

        if (typeof videoUrl === "string") {
          await sendVideoFromURL(
            videoUrl,
            "🎬 *Vídeo do Twitter/X*\n💚 by *DeadBoT*"
          );
          return;
        }
      }

      // Imagens
      const imageUrl =
        typeof mediaUrls === "string"
          ? mediaUrls
          : mediaUrls[0];

      await sendImageFromURL(
        imageUrl,
        "🖼️ *Imagem do Twitter/X*\n💚 by *DeadBoT*"
      );
    } catch (error) {
      console.error("[TWITTER]", error);

      let message =
        "Falha ao processar o link do Twitter/X.";

      if (
        error.message?.includes("401") ||
        error.message?.includes("privado")
      ) {
        message +=
          "\n\n🔒 O tweet pode estar privado, protegido ou removido.";
      } else if (
        error.message?.includes("HTTP") ||
        error.message?.includes("fetch")
      ) {
        message +=
          "\n\n🌐 Problema de conexão com a API.";
      } else {
        message += `\n\n❌ ${error.message}`;
      }

      message +=
        "\n\n💡 Verifique se:\n• O tweet é público\n• A URL está correta\n• O conteúdo não foi removido";

      await sendErrorReply(message);
    }
  },
};