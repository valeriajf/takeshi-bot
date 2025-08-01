/**
 * Menu do bot
 *
 * @author Dev Gui
 */
const { BOT_NAME, PREFIX } = require("./config");
const packageInfo = require("../package.json");
const { readMore } = require("./utils");

exports.menuMessage = () => {
  const date = new Date();

  return `━━⪩ BEM VINDO! ⪨━━${readMore()}

 • ${BOT_NAME}
 • Data: ${date.toLocaleDateString("pt-br")}
 • Hora: ${date.toLocaleTimeString("pt-br")}
 • Prefixo: ${PREFIX}
 • Versão: ${packageInfo.version}

━━─「🪐」─━━

━━⪩ DONO ⪨━━

 • ${PREFIX}exec
 • ${PREFIX}get-id
 • ${PREFIX}off
 • ${PREFIX}on
 • ${PREFIX}set-menu-image

━━─「🌌」─━━

━━⪩ ADMINS ⪨━━

 • ${PREFIX}abrir
 • ${PREFIX}adv
 • ${PREFIX}adv-reset
 • ${PREFIX}agendar-mensagem
 • ${PREFIX}anti-audio (1/0)
 • ${PREFIX}anti-document (1/0)
 • ${PREFIX}anti-event (1/0)
 • ${PREFIX}anti-image (1/0)
 • ${PREFIX}anti-link (1/0)
 • ${PREFIX}anti-product (1/0)
 • ${PREFIX}anti-sticker (1/0)
 • ${PREFIX}anti-video (1/0)
 • ${PREFIX}auto-responder (1/0)
 • ${PREFIX}ban
 • ${PREFIX}delete
 • ${PREFIX}exit (1/0)
 • ${PREFIX}fechar
 • ${PREFIX}fumar
 • ${PREFIX}hidetag
 • ${PREFIX}limpar
 • ${PREFIX}link-grupo
 • ${PREFIX}motivar
 • ${PREFIX}mute
 • ${PREFIX}only-admin (1/0)
 • ${PREFIX}parabens
 • ${PREFIX}promover
 • ${PREFIX}rankativo 
 • ${PREFIX}rebaixar
 • ${PREFIX}revelar
 • ${PREFIX}unmute
 • ${PREFIX}welcome (1/0)

━━─「⭐」─━━

━━⪩ PRINCIPAL ⪨━━

 • ${PREFIX}attp
 • ${PREFIX}cep
 • ${PREFIX}exemplos-de-mensagens
 • ${PREFIX}fake-chat
 • ${PREFIX}gerar-link
 • ${PREFIX}get-lid
 • ${PREFIX}google-search
 • ${PREFIX}perfil
 • ${PREFIX}ping
 • ${PREFIX}raw-message
 • ${PREFIX}rename
 • ${PREFIX}sticker
 • ${PREFIX}to-image
 • ${PREFIX}ttp
 • ${PREFIX}yt-search

━━─「🚀」─━━

━━⪩ DOWNLOADS ⪨━━

 • ${PREFIX}play-audio
 • ${PREFIX}play-video
 • ${PREFIX}tik-tok
 • ${PREFIX}yt-mp3
 • ${PREFIX}yt-mp4

━━─「🎶」─━━

━━⪩ BRINCADEIRAS ⪨━━

 • ${PREFIX}abracar
 • ${PREFIX}beijar
 • ${PREFIX}dado
 • ${PREFIX}jantar
 • ${PREFIX}lutar
 • ${PREFIX}matar
 • ${PREFIX}socar

━━─「🎡」─━━

━━⪩ IA ⪨━━

 • ${PREFIX}gemini
 • ${PREFIX}ia-sticker
 • ${PREFIX}pixart
 • ${PREFIX}stable-diffusion-turbo

━━─「🚀」─━━

━━⪩ CANVAS ⪨━━

 • ${PREFIX}blur
 • ${PREFIX}bolsonaro
 • ${PREFIX}cadeia
 • ${PREFIX}contraste
 • ${PREFIX}espelhar
 • ${PREFIX}gray
 • ${PREFIX}inverter
 • ${PREFIX}pixel
 • ${PREFIX}rip

━━─「❇」─━━`;
};
