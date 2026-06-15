/*
  TM COM SUPORTE ESTÁVEL A IMAGEM
  Nova base ESM (takeshi-bot)

  Uso:
    - Só texto:   /tm Sua mensagem
    - Com imagem: cite uma imagem e escreva /tm Sua mensagem

  @author Dev VaL
*/

import fs from "fs";
import path from "path";
import { downloadContentFromMessage } from "baileys";

import { PREFIX, OWNER_LID, BOT_NAME, DATABASE_DIR } from "../../config.js";
import { errorLog } from "../../utils/logger.js";

const DB_PATH = path.join(DATABASE_DIR, "tm-ignore-list.json");

function loadIgnoreList() {
  if (!fs.existsSync(DB_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  } catch {
    return {};
  }
}

async function downloadImageBuffer(imageMessage) {
  const stream = await downloadContentFromMessage(imageMessage, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default {
  name: "tm",
  description: "Broadcast profissional com imagem",
  commands: ["tm", "broadcast-tm"],
  usage: `${PREFIX}tm <mensagem>  |  cite uma imagem + ${PREFIX}tm <mensagem>`,

  handle: async ({
    socket,
    sendReact,
    sendReply,
    sendErrorReply,
    args,
    userLid,
    webMessage,
  }) => {
    try {
      if (userLid !== OWNER_LID) {
        return sendErrorReply("❌ Apenas o desenvolvedor pode usar este comando");
      }

      if (!args.length) {
        return sendErrorReply(
          `📋 *Uso correto:*\n` +
          `• Só texto: ${PREFIX}tm <mensagem>\n` +
          `• Com imagem: cite uma imagem e escreva ${PREFIX}tm <mensagem>`
        );
      }

      // ── Detecta imageMessage no quoted ──────────────────────────────────────
      const msg = webMessage?.message;
      const imageMessage =
        msg?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ?? null;

      let imageBuffer = null;

      if (imageMessage) {
        await sendReply("🖼️ Baixando imagem...");
        try {
          imageBuffer = await downloadImageBuffer(imageMessage);
        } catch (err) {
          errorLog(`[TM] Erro ao baixar imagem: ${err.message}`);
          return sendErrorReply("❌ Falha ao baixar imagem. Tente citar novamente.");
        }
      }

      // ── Texto ────────────────────────────────────────────────────────────────
      const text    = args.join(" ");
      const botName = BOT_NAME || "DeadBoT";

      const now = new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });

      const professionalMessage =
`*📡 𝕀ℕ𝔽𝕆ℝ𝕄𝔼 ${botName.toUpperCase()}™*

📧 ᴍᴇɴsᴀɢᴇᴍ:
${text}

> _📤 ᴇɴᴠɪᴀᴅᴏ ᴘᴏʀ: VaL (ᴅᴇᴠ)_
> _⏰ ${now}_`;

      // ── Grupos ───────────────────────────────────────────────────────────────
      const ignoreList   = loadIgnoreList();
      const groupsMeta   = await socket.groupFetchAllParticipating();
      const allGroups    = Object.values(groupsMeta);
      const groups       = allGroups.filter((g) => !ignoreList[g.id]);
      const ignoredCount = allGroups.length - groups.length;

      let successCount = 0;
      let errorCount   = 0;

      await sendReact("📡");
      await sendReply(
`📡 *Iniciando informe...*

⏳ Enviando para ${groups.length} grupos...
🚫 Ignorados: ${ignoredCount}

🖼️ Imagem:
${imageBuffer ? "✅ Sim" : "❌ Não"}`
      );

      // ── Envio ────────────────────────────────────────────────────────────────
      for (const group of groups) {
        try {
          const mentions = group.participants.map((p) => p.id);

          if (imageBuffer) {
            await socket.sendMessage(group.id, {
              image: imageBuffer,
              caption: professionalMessage,
              mentions,
            });
          } else {
            await socket.sendMessage(group.id, {
              text: professionalMessage,
              mentions,
            });
          }

          successCount++;
          await new Promise((r) => setTimeout(r, 1500));
        } catch (error) {
          errorCount++;
          errorLog(`[TM] Erro em ${group.id}: ${error.message}`);
        }
      }

      await sendReply(
`📊 *RELATÓRIO DO INFORME*

✅ Enviado: ${successCount} grupos
❌ Falhas: ${errorCount} grupos
🚫 Ignorados: ${ignoredCount} grupos

📡 Status: Concluído com sucesso!`
      );

    } catch (error) {
      errorLog(error);
      await sendErrorReply("❌ Erro interno no sistema TM.");
    }
  },
};
