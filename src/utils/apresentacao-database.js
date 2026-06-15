/**
 * Database do sistema de apresentação obrigatória
 * Persistência da configuração por grupo e dos membros pendentes
 *
 * @author Dev VaL (DeadBoT)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.resolve(__dirname, "..", "..", "database");

const GROUPS_FILE = "apresentacao-groups";
const PENDENTES_FILE = "apresentacao-pendentes";

function createIfNotExists(fullPath, defaultValue = {}) {
  if (!fs.existsSync(fullPath)) {
    fs.writeFileSync(fullPath, JSON.stringify(defaultValue, null, 2));
  }
}

function readJSON(jsonFile) {
  const fullPath = path.resolve(databasePath, `${jsonFile}.json`);
  createIfNotExists(fullPath, {});
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function writeJSON(jsonFile, data) {
  const fullPath = path.resolve(databasePath, `${jsonFile}.json`);
  createIfNotExists(fullPath, {});
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), "utf8");
}

// ── CONFIGURAÇÃO POR GRUPO ─────────────────────────

export function getConfig(groupJid) {
  const data = readJSON(GROUPS_FILE);
  return data[groupJid] || null;
}

export function ativar(groupJid, minutos) {
  const data = readJSON(GROUPS_FILE);
  data[groupJid] = { ativo: true, minutos };
  writeJSON(GROUPS_FILE, data);
}

export function desativar(groupJid) {
  const data = readJSON(GROUPS_FILE);
  data[groupJid] = { ativo: false, minutos: 0 };
  writeJSON(GROUPS_FILE, data);
}

export function isAtivo(groupJid) {
  return getConfig(groupJid)?.ativo === true;
}

export function getMinutos(groupJid) {
  return getConfig(groupJid)?.minutos || 1;
}

// ── PENDENTES ──────────────────────────────────────

export function getPendentes() {
  return readJSON(PENDENTES_FILE);
}

export function addPendente(chave, entry) {
  const data = getPendentes();
  data[chave] = entry;
  writeJSON(PENDENTES_FILE, data);
}

export function removePendente(chave) {
  const data = getPendentes();
  delete data[chave];
  writeJSON(PENDENTES_FILE, data);
}

export function clearPendentesDoGrupo(groupJid) {
  const data = getPendentes();
  for (const chave of Object.keys(data)) {
    if (chave.startsWith(`${groupJid}||`)) delete data[chave];
  }
  writeJSON(PENDENTES_FILE, data);
}
