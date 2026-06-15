/**
 * Comando: roleta-russa (VERSÃO TEATRAL)
 * Mensagem única que se edita em cada ato • Suspense real • Chance 1/6
 * Suporte a LID • Áudio • Frases Deadpool
 *
 * DeadBoT Cinematic Universe 🎬
 * Dev VaL
 */

import fs from "fs";
import { PREFIX } from "../../config.js";
import { onlyNumbers } from "../../utils/index.js";
import activityTracker from "../../utils/activityTracker.js";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  name: "roletarussa",
  description: "Versão teatral da roleta-russa (inativos 0 mensagens).",
  commands: ["roletarussa", "roleta-russa", "roleta"],
  usage: `${PREFIX}roletarussa`,

  handle: async ({
    socket,
    remoteJid,
    userLid,
    sendReply,
    groupMetadata,
    isGroup,
  }) => {
    try {
      if (!isGroup || !remoteJid.endsWith("@g.us")) {
        return await sendReply("❌ Apenas grupos podem presenciar esse espetáculo.");
      }

      let metadata = groupMetadata;
      if (!metadata || !Array.isArray(metadata.participants)) {
        try {
          metadata = await socket.groupMetadata(remoteJid);
        } catch (e) {
          console.error("Erro ao obter groupMetadata:", e?.message || e);
        }
      }

      if (!metadata || !Array.isArray(metadata.participants)) {
        return await sendReply("❌ Não foi possível obter os dados do grupo.");
      }


      const groupStats = activityTracker.getGroupStats(remoteJid);

      // Montar lista de inativos ignorando admins e bot
      // O tracker salva por JID (ex: 5511999@s.whatsapp.net), nao por LID
      const botJid = socket?.authState?.creds?.me?.id || socket?.user?.id || "";

      const inativos = [];
      for (const p of metadata.participants) {
        // Baileys 7.x: id = LID interno, phoneNumber = JID real
        const lid = p.id || "";
        const jid = p.phoneNumber || "";

        if (!lid) continue;
        if (p.admin === "admin" || p.admin === "superadmin") continue;
        if (lid.endsWith("@g.us")) continue;
        if (botJid && jid === botJid) continue;

        // Busca no tracker por JID real (phoneNumber) primeiro, depois LID
        const data = groupStats[jid] || groupStats[lid] || {};
        const total =
          (data?.messages || 0) +
          (data?.stickers || 0) +
          (data?.commands || 0) +
          (data?.audios || 0);

        if (total === 0) inativos.push({ ...p, _resolvedJid: jid, _resolvedLid: lid });
      }

      if (!inativos.length) {
        return await sendReply(
          `🎭 *TEATRO ENCERRADO*\n\nNão há inativos hoje.\nO elenco está participativo.`
        );
      }

      const alvoParticipant = inativos[Math.floor(Math.random() * inativos.length)];
      const alvoJid = alvoParticipant._resolvedJid || "";
      const alvoLid = alvoParticipant._resolvedLid || alvoJid;

      // Resolver JID real para remoção
      const jidParaRemover = alvoJid || alvoLid;

      const numero = Math.floor(Math.random() * 6) + 1;
      const sobrevive = numero === 6;

      const nomeDisplay = `@${(alvoJid || alvoLid).split("@")[0]}`;

      // mentions precisa do phoneNumber (@s.whatsapp.net) para o WhatsApp resolver o nome
      const mentionJid = alvoJid || alvoLid;

      const atos = [
        `🎭 *ROLETA RUSSA*\n\n🕯️ *O silêncio ecoava pelo grupo...*`,
        `🎭 *ROLETA RUSSA*\n\n🎻 *Uma música dramática começa a tocar ao fundo...*`,
        `🎭 *ROLETA RUSSA*\n\n🎲 *O destino foi lançado ao acaso...*`,
        `🎭 *ROLETA RUSSA*\n\n👀 *Todos observam em absoluto suspense...*`,
        `🎭 *ROLETA RUSSA*\n\n🔫 *O tambor gira lentamente...*`,
      ];

      const atosFinaisEliminado = [
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} era tão invisível que o grupo só percebeu quando sumiu.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} participava do grupo igual planta: só ocupava espaço.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} deve ter achado que curtir story contava como mensagem. Não conta.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} confundiu grupo de WhatsApp com modo avião.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} tinha 0 mensagens. ZERO. Nem "oi" esse ser mandou.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} era tão ativo quanto Wi-Fi de aeroporto.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\nA roleta escolheu ${nomeDisplay}. Honestamente? Nem surpresa.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} foi pro grupo, viu as mensagens, e decidiu que não era com ele. Tá bom então.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} achou que silêncio era estratégia. A estratégia falhou.`,
        `☠️ *ATO FINAL*\n\n🎲 Número: ${numero}\n${nomeDisplay} foi removido com honras. Ser inativo desse nível exige talento.`,
      ];

      const frasesPosBan = [
        `💀 *Plot twist!*\n*${nomeDisplay} estava tão inativo que o WhatsApp já tinha declarado como peça de museu.*\n*A roleta só fez o que precisava ser feito. 🔫✨*`,
        `🎯 *Missão cumprida!*\n*${nomeDisplay} passou tanto tempo sem falar que achei que era NPC bugado.*\n*Atualização concluída: removido com sucesso.*`,
        `🔫 *A roleta girou...*\n*E adivinha?*\n*${nomeDisplay} perdeu até sem jogar.*\n*Isso que eu chamo de talento raro. 👏*`,
        `☠️ *Silêncio absoluto detectado.*\n*${nomeDisplay} estava treinando pra ser fantasma no grupo.*\n*Resultado: promovido a lenda urbana. 👻*`,
        `🧃 *${nomeDisplay} ficou tão quieto que achei que estava carregando 1% há três meses.*\n*A bateria social acabou. Desinstalando...*`,
        `🎪 *Bem-vindos ao circo!*\n*Hoje o número principal foi:*\n*${nomeDisplay} desaparecendo magicamente.*\n*Palmas, plateia. 👏*`,
        `🕵️ *Investigação concluída:*\n*${nomeDisplay} tinha 0 mensagens. ZERO.*\n*Nem um "oi sumida". Isso é dedicação ao silêncio.*`,
        `💣 *Spoiler alert:*\n*A roleta não gosta de plantas ornamentais.*\n*${nomeDisplay} foi regado demais pela inatividade.*`,
        `🎮 *Modo difícil ativado.*\n*${nomeDisplay} tentou zerar o grupo sem enviar mensagens.*\n*Conquista desbloqueada: Expulsão Aleatória™*`,
        `🧠 *Pensei em dar uma segunda chance…*\n*Mentira.*\n*A roleta não tem coração.*\n*${nomeDisplay} agora faz parte do multiverso dos removidos.*`,
      ];

      const atoFinalTexto =
        atosFinaisEliminado[Math.floor(Math.random() * atosFinaisEliminado.length)];
      const fraseFinalTexto =
        frasesPosBan[Math.floor(Math.random() * frasesPosBan.length)];
      const atoFinalSobreviveu = `🎉 *ATO FINAL*\n\n🎲 Número: ${numero}\n😮‍💨 ${nomeDisplay} sobreviveu!\nO público vai à loucura!`;

      // Enviar primeira mensagem e guardar key para edições
      const sentMsg = await sendReply(atos[0]);
      const msgKey = sentMsg?.key;

      // Editar mensagem a cada ato
      for (let i = 1; i < atos.length; i++) {
        await delay(2000);
        try {
          await socket.relayMessage(
            remoteJid,
            {
              protocolMessage: {
                key: msgKey,
                type: 14,
                editedMessage: { conversation: atos[i] },
              },
            },
            {}
          );
        } catch (e) {
          console.error(`[roleta] Erro ao editar ato ${i + 1}:`, e?.message || e);
        }
      }

      await delay(2500);

      // SOBREVIVEU
      if (sobrevive) {
        try {
          await socket.relayMessage(
            remoteJid,
            {
              protocolMessage: {
                key: msgKey,
                type: 14,
                editedMessage: {
                  extendedTextMessage: {
                    text: atoFinalSobreviveu,
                    contextInfo: { mentionedJid: [mentionJid] },
                  },
                },
              },
            },
            {}
          );
        } catch (e) {
          await sendReply(atoFinalSobreviveu);
        }
        return;
      }

      // ELIMINADO — áudio do tiro
      const audioPath = "/storage/emulated/0/takeshi-bot/assets/audios/tiro.ogg";
      if (fs.existsSync(audioPath)) {
        try {
          await socket.sendMessage(remoteJid, {
            audio: fs.readFileSync(audioPath),
            mimetype: "audio/mp4",
            ptt: true,
          });
        } catch (e) {
          console.error("[roleta] Erro ao enviar áudio:", e?.message || e);
        }
      }

      await delay(1500);

      // ATO FINAL com menção
      await socket.sendMessage(remoteJid, {
        text: atoFinalTexto,
        mentions: [mentionJid],
      });

      await delay(1000);

      // BAN — usa JID real para remoção
      try {
        await socket.groupParticipantsUpdate(remoteJid, [jidParaRemover], "remove");
      } catch (removeErr) {
        console.error("Erro ao remover participante:", removeErr?.message || removeErr);
        return await sendReply(
          `❌ Não foi possível remover ${nomeDisplay}. Verifique se sou admin.`
        );
      }

      await delay(500);

      // Frase sarcástica pós-ban
      await socket.sendMessage(remoteJid, {
        text: fraseFinalTexto,
        mentions: [mentionJid],
      });

      // Remove do tracker
      try {
        if (typeof activityTracker.removeUser === "function") {
          activityTracker.removeUser(remoteJid, alvoLid);
        }
      } catch (e) {
        console.error("Erro ao atualizar activityTracker:", e?.message || e);
      }
    } catch (err) {
      console.error("Erro teatral:", err);
      await sendReply("❌ O teatro enfrentou problemas técnicos.");
    }
  },
};
