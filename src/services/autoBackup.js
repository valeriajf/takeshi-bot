// ================================================================
// 🤖 DEADBOT - AUTO-BACKUP SERVICE (ESM)
// Arquivo: src/services/autoBackup.js
//
// Faz backup apenas de: takeshi-bot/database/
// Horários: 00:00 | 06:00 | 12:00 | 18:00
// ================================================================

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Raiz do projeto: takeshi-bot/
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const BACKUP_DIR = path.join(ROOT_DIR, "backups");
const LAST_BACKUP_JSON = path.join(BACKUP_DIR, "last_backup.json");
const STATE_FILE = path.join(BACKUP_DIR, "backup_state.json");
const BACKUP_SCRIPT = path.join(ROOT_DIR, "backup-takeshi-bot.sh");

const MAX_BACKUPS = 1;
const BACKUP_HOURS = [0, 6, 12, 18];

let timeoutAtivo = null;
let ownerJidReal = null;

export function setOwnerJid(jid) {
  if (!ownerJidReal) {
    ownerJidReal = jid;
    console.log(`✅ [AutoBackup] JID do dono registrado.`);
  }
}

// ── ESTADO ATIVO/INATIVO ───────────────────────────────────────
export function isBackupAtivo() {
  try {
    if (!fs.existsSync(STATE_FILE)) return true;
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
    return state.ativo !== false;
  } catch (_) {
    return true;
  }
}

export function setBackupAtivo(valor) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ativo: valor }));
}

// ── CALCULA MS ATÉ O PRÓXIMO HORÁRIO (Brasília) ───────────────
function msParaProximoBackup() {
  const agoraBrasilia = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const horaAtual = agoraBrasilia.getHours();
  const minutoAtual = agoraBrasilia.getMinutes();
  const segundoAtual = agoraBrasilia.getSeconds();
  const msAtual = agoraBrasilia.getMilliseconds();

  let proximaHora = BACKUP_HOURS.find((h) => h > horaAtual);
  if (proximaHora === undefined) proximaHora = BACKUP_HOURS[0] + 24;

  return (
    (proximaHora - horaAtual) * 60 * 60 * 1000 -
    minutoAtual * 60 * 1000 -
    segundoAtual * 1000 -
    msAtual
  );
}

// ── AGENDADOR RECURSIVO ────────────────────────────────────────
function agendarProximoBackup(socket, ownerNumber) {
  const ms = msParaProximoBackup();
  const proxima = new Date(Date.now() + ms);

  console.log(`⏰[AutoBackup] Próximo backup: ${proxima.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);

  timeoutAtivo = setTimeout(async () => {
    if (!isBackupAtivo()) {
      console.log("⏸️  [AutoBackup] Backup desativado, pulando horário.");
    } else {
      console.log(`🕐 [AutoBackup] Iniciando backup...`);
      try {
        await runBackup(socket, ownerNumber);
      } catch (e) {
        console.error("❌ [AutoBackup] Falha no backup agendado:", e.message);
      }
    }
    agendarProximoBackup(socket, ownerNumber);
  }, ms);
}

// ── EXECUTA O SCRIPT DE BACKUP ────────────────────────────────
export function runBackup(socket, ownerNumber) {
  return new Promise((resolve, reject) => {
    exec(`bash "${BACKUP_SCRIPT}"`, async (error) => {
      if (error) {
        console.error("❌ [AutoBackup] Erro ao executar backup:", error.message);
        reject(error);
        return;
      }

      console.log("✅ [AutoBackup] Backup concluído com sucesso!");

      try {
        const info = JSON.parse(fs.readFileSync(LAST_BACKUP_JSON, "utf-8"));
        const backupFilePath = path.join(BACKUP_DIR, info.filename);

        await sendBackupToWhatsApp(socket, ownerNumber, info, backupFilePath);

        // Delay aleatório de 5-30s para evitar flood quando múltiplos bots disparam juntos
        const delay = Math.floor(Math.random() * 25000) + 5000;
        await new Promise((r) => setTimeout(r, delay));

        const { enviarBackupTelegram } = await import("./telegramBackup.js");
        await enviarBackupTelegram(info, backupFilePath);

        resolve(info);
      } catch (e) {
        console.error("⚠️  [AutoBackup] Erro ao enviar backup:", e.message);
        resolve(null);
      }
    });
  });
}

// ── ENVIA NO WHATSAPP ─────────────────────────────────────────
async function sendBackupToWhatsApp(socket, ownerNumber, info, backupFilePath) {
  if (!socket || !ownerNumber) return;

  const { OWNER_LID } = await import("../config.js");
  const jid = ownerJidReal || OWNER_LID;

  try {
    await socket.sendMessage(jid, {
      document: { stream: fs.createReadStream(backupFilePath) },
      fileName: info.filename,
      mimetype: "application/octet-stream",
      caption:
        `🛡️ *DEADBOT - AUTO-BACKUP*\n\n` +
        `📦 *Arquivo:* ${info.filename}\n` +
        `🕐 *Gerado em:* ${info.timestamp}\n` +
        `💾 *Tamanho:* ${info.size}\n` +
        `📁 *Backups salvos:* ${info.total}/${MAX_BACKUPS}\n\n` +
        `💡 Mantenha este arquivo para restauração rápida.`,
    });

    console.log("📩 [AutoBackup] Arquivo enviado no WhatsApp com sucesso!");
  } catch (e) {
    console.error("❌ [AutoBackup] Falha ao enviar no WhatsApp:", e.message);
  }
}

// ── INICIA O AGENDADOR ─────────────────────────────────────────
export function startAutoBackup(socket, ownerNumber) {
  if (timeoutAtivo) {
    clearTimeout(timeoutAtivo);
    timeoutAtivo = null;
  }

  const ativo = isBackupAtivo();
  console.log(`📁[AutoBackup] Backup iniciado. Status: ${ativo ? "✅ Ativo" : "⏸️  Inativo"}`);
  agendarProximoBackup(socket, ownerNumber);
}
