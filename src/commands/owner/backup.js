/**
 * DEADBOT - Comando de Backup
 * Arquivo: src/commands/owner/backup.js
 *
 * #backup         -> Cria backup e envia no WhatsApp e Telegram
 * #backup status  -> Lista os backups salvos
 * #backup 1       -> Ativa os backups automáticos
 * #backup 0       -> Desativa os backups automáticos
 */

import { PREFIX } from "../../config.js";
import { runBackup, setOwnerJid, isBackupAtivo, setBackupAtivo } from "../../services/autoBackup.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// database fica em: takeshi-bot/database/
const DATABASE_DIR = path.resolve(__dirname, "..", "..", "..", "database");
const BACKUP_DIR = path.resolve(__dirname, "..", "..", "..", "backups");

export default {
  name: "backup",
  description: "Gerencia os backups do bot",
  commands: ["backup"],
  usage: `${PREFIX}backup | ${PREFIX}backup status | ${PREFIX}backup 1 | ${PREFIX}backup 0`,

  /**
   * @param {CommandHandleProps} props
   * @returns {Promise<void>}
   */
  handle: async ({ args, sendReply, sendSuccessReply, sendErrorReply, sendReact, sendSuccessReact, socket, userLid }) => {
    const subCommand = args[0]?.toLowerCase();

    // ATIVAR / DESATIVAR
    if (subCommand === "1" || subCommand === "0") {
      const ativar = subCommand === "1";
      setBackupAtivo(ativar);
      await sendSuccessReact();
      return await sendSuccessReply(
        ativar
          ? `✅ *Backup automático ATIVADO!*\n\n⏰ Horários: 00:00 | 06:00 | 12:00 | 18:00`
          : `⏸️ *Backup automático DESATIVADO!*\n\nUse *${PREFIX}backup 1* para reativar.`
      );
    }

    // STATUS
    if (subCommand === "status") {
      const ativo = isBackupAtivo();
      const files = fs.existsSync(BACKUP_DIR)
        ? fs.readdirSync(BACKUP_DIR).filter((f) => f.includes("_backup_") && f.endsWith(".tar.gz")).sort().reverse()
        : [];

      let lastInfo = null;
      const lastJsonPath = path.join(BACKUP_DIR, "last_backup.json");
      if (fs.existsSync(lastJsonPath)) {
        try { lastInfo = JSON.parse(fs.readFileSync(lastJsonPath, "utf-8")); } catch (_) {}
      }

      const lista = files.length > 0
        ? files.slice(0, 4).map((f, i) => `  ${i + 1}. ${f}`).join("\n")
        : "Nenhum backup encontrado.";

      return await sendReply(
        `🛡️ *DEADBOT - STATUS DE BACKUPS*\n\n` +
        `${ativo ? "✅ Automático: *Ativo*" : "⏸️ Automático: *Inativo*"}\n` +
        `📦 *Total salvo:* ${files.length}/1\n` +
        (lastInfo ? `🕐 *Último:* ${lastInfo.timestamp}\n💾 *Tamanho:* ${lastInfo.size}\n` : "") +
        `\n📋 *Arquivos:*\n${lista}\n\n` +
        `_Horários: 00:00 | 06:00 | 12:00 | 18:00_`
      );
    }

    // BACKUP MANUAL
    await sendReact("⏳");
    await sendReply("⏳ Criando backup completo, aguarde...");

    try {
      setOwnerJid(userLid);
      const info = await runBackup(socket, userLid);

      if (!info) {
        return await sendErrorReply("❌ Backup criado, mas não foi possível enviar o arquivo.");
      }

      const agora = new Date();
      const data = agora.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const hora = agora.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" });

      await sendSuccessReact();
      return await sendSuccessReply(
        `🛡️ *DEADBOT - AUTO-BACKUP*\n\n` +
        `📦 *Arquivo:* ${info.filename}\n` +
        `🕐 *Gerado em:* ${info.timestamp}\n` +
        `💾 *Tamanho:* ${info.size}\n` +
        `📁 *Backups salvos:* ${info.total}/1\n\n` +
        `✅ *Seu arquivo foi enviado com sucesso*\n\n` +
        `📅 ${data}\n` +
        `⏰ ${hora}`
      );
    } catch (error) {
      console.error("[backup.js] Erro:", error);
      await sendReact("❌");
      return await sendErrorReply("❌ Falha ao criar o backup. Verifique o console para mais detalhes.");
    }
  },
};
