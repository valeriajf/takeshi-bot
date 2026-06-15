/**
 * afkDatabase.js
 * Persistência do sistema AFK em JSON
 * Estrutura: { [groupJid]: { [userLid]: { reason, timestamp, startTime } } }
 *
 * @author Val (DeadBoT)
 */

import fs from "fs";
import path from "path";
import { DATABASE_DIR } from "../config.js";
import { errorLog } from "../utils/logger.js";

const AFK_FILE = path.join(DATABASE_DIR, "afk-users.json");

// ─── Estado em memória ────────────────────────────────────────────────────────

/** @type {Record<string, Record<string, { reason: string, timestamp: string, startTime: number }>>} */
let afkData = {};

// ─── Persistência ─────────────────────────────────────────────────────────────

function loadAFKData() {
  try {
    if (fs.existsSync(AFK_FILE)) {
      const raw = fs.readFileSync(AFK_FILE, "utf8");
      afkData = JSON.parse(raw);
      console.log("✅ [AFK] Dados carregados do disco.");
    }
  } catch (err) {
    errorLog(`[AFK] Erro ao carregar afk-users.json: ${err.message}`);
    afkData = {};
  }
}

function saveAFKData() {
  try {
    const dir = path.dirname(AFK_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(AFK_FILE, JSON.stringify(afkData, null, 2));
  } catch (err) {
    errorLog(`[AFK] Erro ao salvar afk-users.json: ${err.message}`);
  }
}

// Auto-save a cada 30 segundos
setInterval(saveAFKData, 30_000);

// Salva ao encerrar o processo
process.on("SIGINT", () => { saveAFKData(); process.exit(0); });
process.on("SIGTERM", () => { saveAFKData(); process.exit(0); });

// Carrega imediatamente ao importar o módulo
loadAFKData();

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Define um usuário como AFK em um grupo específico.
 * @param {string} groupJid  JID do grupo (ex: "123@g.us")
 * @param {string} userLid   LID do usuário
 * @param {string} reason    Motivo do AFK
 */
export function setAFK(groupJid, userLid, reason = "Sem motivo especificado") {
  const now = Date.now();
  afkData[groupJid] ??= {};
  afkData[groupJid][userLid] = {
    reason,
    timestamp: new Date(now).toISOString(),
    startTime: now,
  };
  saveAFKData();
}

/**
 * Remove o AFK de um usuário em um grupo específico.
 * @returns {object|null} Dados do AFK removido, ou null se não estava AFK
 */
export function removeAFK(groupJid, userLid) {
  const entry = afkData[groupJid]?.[userLid];
  if (!entry) return null;

  delete afkData[groupJid][userLid];
  if (Object.keys(afkData[groupJid]).length === 0) delete afkData[groupJid];

  saveAFKData();
  return entry;
}

/**
 * Verifica se um usuário está AFK em um grupo específico.
 * @returns {boolean}
 */
export function isAFK(groupJid, userLid) {
  return !!afkData[groupJid]?.[userLid];
}

/**
 * Retorna os dados AFK de um usuário em um grupo, ou null.
 */
export function getAFKData(groupJid, userLid) {
  return afkData[groupJid]?.[userLid] ?? null;
}

/**
 * Formata uma duração em milissegundos para texto legível (ex: "1h 23m 45s").
 * @param {number} ms
 * @returns {string}
 */
export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

/**
 * Retorna a duração atual de AFK de um usuário formatada.
 */
export function getAFKDuration(groupJid, userLid) {
  const entry = getAFKData(groupJid, userLid);
  if (!entry) return null;
  return formatDuration(Date.now() - entry.startTime);
}

/**
 * Remove entradas AFK com mais de `daysOld` dias (padrão: 7).
 * @returns {number} Quantidade de entradas removidas
 */
export function cleanOldAFK(daysOld = 7) {
  const cutoff = Date.now() - daysOld * 24 * 60 * 60 * 1000;
  let count = 0;

  for (const [groupJid, users] of Object.entries(afkData)) {
    for (const [lid, entry] of Object.entries(users)) {
      if (entry.startTime < cutoff) {
        delete afkData[groupJid][lid];
        count++;
      }
    }
    if (Object.keys(afkData[groupJid]).length === 0) delete afkData[groupJid];
  }

  if (count > 0) {
    saveAFKData();
    console.log(`🧹 [AFK] Limpou ${count} entradas antigas.`);
  }

  return count;
}

// Limpeza automática diária
setInterval(() => cleanOldAFK(7), 24 * 60 * 60 * 1000);
