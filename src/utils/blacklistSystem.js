/**
 * Sistema de lista negra
 *
 * @author Dev VaL
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(
  __dirname,
  "../../database/blacklist.json"
);

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    console.log("[BLACKLIST] Criando blacklist.json...");

    const dbDir = path.dirname(DB_PATH);

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));

    return {};
  }

  const content = fs.readFileSync(DB_PATH, "utf8");

  if (!content.trim()) {
    return {};
  }

  const parsed = JSON.parse(content);

  if (Array.isArray(parsed)) {
    console.log(
      "[BLACKLIST] Convertendo blacklist.json inválido para objeto..."
    );

    fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));

    return {};
  }

  return parsed;
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function normalizeBlacklistId(value) {
  if (!value) {
    return "";
  }

  return value.replace(/\D/g, "");
}

/**
 * Adiciona um usuário à lista negra.
 *
 * @param {string} groupId
 * @param {string} userLid
 * @returns {boolean}
 */
export function addBlacklist(groupId, userLid) {
  const db = loadDB();

  const normalizedId = normalizeBlacklistId(userLid);

  if (!db[groupId]) {
    db[groupId] = [];
  }

  if (db[groupId].includes(normalizedId)) {
    return false;
  }

  db[groupId].push(normalizedId);

  saveDB(db);

  return true;
}

/**
 * Remove um usuário da lista negra.
 *
 * @param {string} groupId
 * @param {string} userLid
 * @returns {boolean}
 */
export function removeBlacklist(groupId, userLid) {
  const db = loadDB();

  const normalizedId = normalizeBlacklistId(userLid);

  if (!db[groupId]) {
    return false;
  }

  const index = db[groupId].indexOf(normalizedId);

  if (index === -1) {
    return false;
  }

  db[groupId].splice(index, 1);

  if (db[groupId].length === 0) {
    delete db[groupId];
  }

  saveDB(db);

  return true;
}

/**
 * Verifica se um usuário está na lista negra.
 *
 * @param {string} groupId
 * @param {string} userLid
 * @returns {boolean}
 */
export function isBlacklisted(groupId, userLid) {
  const db = loadDB();

  const normalizedId = normalizeBlacklistId(userLid);

  return (
    db[groupId]?.includes(normalizedId) ||
    false
  );
}

/**
 * Retorna todos os usuários da lista negra do grupo.
 *
 * @param {string} groupId
 * @returns {string[]}
 */
export function getBlacklist(groupId) {
  const db = loadDB();

  return db[groupId] || [];
}

/**
 * Retorna a blacklist completa.
 *
 * @returns {Object}
 */
export function getAllBlacklists() {
  return loadDB();
}