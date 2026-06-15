/**
 * Sistema de Rastreamento de Atividade
 * Captura mensagens, figurinhas, comandos e áudios por grupo/usuário
 *
 * @path src/utils/activityTracker.js
 * @author Val (DeadBoT)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, "../../database/activity-stats.json");

class ActivityTracker {
  constructor() {
    this.stats = this.#loadStats();
    this.lastSave = Date.now();
    this.#startAutoSave();
  }

  // ─── I/O ────────────────────────────────────────────────────────────────────

  #loadStats() {
    try {
      if (fs.existsSync(STATS_FILE)) {
        return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
      }
    } catch (error) {
      console.error("❌ [ACTIVITY] Erro ao carregar estatísticas:", error.message);
    }
    return {};
  }

  saveStats() {
    try {
      const dir = path.dirname(STATS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
      this.lastSave = Date.now();
    } catch (error) {
      console.error("❌ [ACTIVITY] Erro ao salvar estatísticas:", error.message);
    }
  }

  #startAutoSave() {
    setInterval(() => {
      if (Date.now() - this.lastSave > 30_000) this.saveStats();
    }, 30_000);
  }

  // ─── INIT ────────────────────────────────────────────────────────────────────

  #initUser(groupJid, userJid, userName = null) {
    if (!this.stats[groupJid]) this.stats[groupJid] = {};

    if (!this.stats[groupJid][userJid]) {
      this.stats[groupJid][userJid] = {
        messages: 0,
        stickers: 0,
        commands: 0,
        audios: 0,
        lastActivity: new Date().toISOString(),
        joinDate: new Date().toISOString(),
        displayName: null,
        lastKnownName: null,
      };
    }

    // Garante campos em registros antigos
    const u = this.stats[groupJid][userJid];
    if (u.commands === undefined) u.commands = 0;
    if (u.audios === undefined) u.audios = 0;

    // Atualiza nome se válido (não só números)
    if (userName && typeof userName === "string" &&
        userName.trim().length > 0 && !/^\+?\d+$/.test(userName)) {
      u.displayName = userName.trim();
      u.lastKnownName = userName.trim();
    }
  }

  // ─── TRACK ───────────────────────────────────────────────────────────────────

  #track(field, groupJid, userJid, userName = null) {
    if (!groupJid || !userJid) return;
    this.#initUser(groupJid, userJid, userName);
    this.stats[groupJid][userJid][field]++;
    this.stats[groupJid][userJid].lastActivity = new Date().toISOString();
  }

  trackMessage(groupJid, userJid, userName = null) {
    this.#track("messages", groupJid, userJid, userName);
  }

  trackSticker(groupJid, userJid, userName = null) {
    this.#track("stickers", groupJid, userJid, userName);
  }

  trackCommand(groupJid, userJid, userName = null) {
    this.#track("commands", groupJid, userJid, userName);
  }

  trackAudio(groupJid, userJid, userName = null) {
    this.#track("audios", groupJid, userJid, userName);
  }

  updateUserName(groupJid, userJid, userName) {
    if (!groupJid || !userJid || !userName) return;
    this.#initUser(groupJid, userJid, userName);
  }

  removeUser(groupJid, userJid) {
    if (this.stats[groupJid]?.[userJid]) {
      delete this.stats[groupJid][userJid];
      this.saveStats();
    }
  }

  // ─── LEITURA ─────────────────────────────────────────────────────────────────

  getUserStats(groupJid, userJid) {
    const u = this.stats[groupJid]?.[userJid];
    if (!u) return { messages: 0, stickers: 0, commands: 0, audios: 0, total: 0, displayName: null };
    const total = (u.messages || 0) + (u.stickers || 0) + (u.commands || 0) + (u.audios || 0);
    return {
      messages: u.messages || 0,
      stickers: u.stickers || 0,
      commands: u.commands || 0,
      audios: u.audios || 0,
      total,
      lastActivity: u.lastActivity,
      joinDate: u.joinDate,
      displayName: u.displayName || u.lastKnownName,
      lastKnownName: u.lastKnownName,
    };
  }

  getGroupStats(groupJid) {
    return this.stats[groupJid] || {};
  }

  getTopUsers(groupJid, limit = 5) {
    const groupStats = this.getGroupStats(groupJid);
    return Object.entries(groupStats)
      .map(([userJid, u]) => ({
        userJid,
        messages: u.messages || 0,
        stickers: u.stickers || 0,
        commands: u.commands || 0,
        audios: u.audios || 0,
        total: (u.messages || 0) + (u.stickers || 0) + (u.commands || 0) + (u.audios || 0),
        lastActivity: u.lastActivity,
        displayName: u.displayName || u.lastKnownName,
        lastKnownName: u.lastKnownName,
      }))
      .filter(u => u.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  }

  getGeneralStats() {
    let totalGroups = 0, totalUsers = 0;
    let totalMessages = 0, totalStickers = 0, totalCommands = 0, totalAudios = 0;

    for (const groupJid of Object.keys(this.stats)) {
      totalGroups++;
      for (const u of Object.values(this.stats[groupJid])) {
        totalUsers++;
        totalMessages  += u.messages  || 0;
        totalStickers  += u.stickers  || 0;
        totalCommands  += u.commands  || 0;
        totalAudios    += u.audios    || 0;
      }
    }

    return {
      totalGroups, totalUsers,
      totalMessages, totalStickers, totalCommands, totalAudios,
      totalInteractions: totalMessages + totalStickers + totalCommands + totalAudios,
    };
  }

  getDisplayName(groupJid, userJid) {
    const { displayName } = this.getUserStats(groupJid, userJid);
    if (displayName) return displayName;

    const phone = userJid.replace(/@s\.whatsapp\.net|@c\.us/, "");
    if (phone.startsWith("55") && phone.length >= 12) {
      const ddd  = phone.slice(2, 4);
      const part1 = phone.slice(4, 9);
      const part2 = phone.slice(9);
      return `📱 (${ddd}) ${part1}-${part2}`;
    }
    return `📱 +${phone}`;
  }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

const activityTracker = new ActivityTracker();

process.on("SIGINT",  () => { activityTracker.saveStats(); process.exit(0); });
process.on("SIGTERM", () => { activityTracker.saveStats(); process.exit(0); });

export default activityTracker;

// Named exports para uso direto (ex: stickerHandler)
export const {
  trackMessage,
  trackSticker,
  trackCommand,
  trackAudio,
  updateUserName,
  removeUser,
  getUserStats,
  getGroupStats,
  getTopUsers,
  getGeneralStats,
  getDisplayName,
  saveStats,
} = new Proxy(activityTracker, {
  get: (target, prop) =>
    typeof target[prop] === "function"
      ? target[prop].bind(target)
      : target[prop],
});
