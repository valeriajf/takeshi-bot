/**
 * Sistema de gerenciamento de aluguéis e chaves
 * Utilitário central — leitura/escrita via fs
 *
 * @author Dev VaL (DeadBoT)
 * @version 3.0 - ESM
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALUGUEIS_FILE = join(__dirname, "..", "..", "database", "alugueis.json");
const CHAVES_FILE   = join(__dirname, "..", "..", "database", "chaves-aluguel.json");

function garantir(file) {
  const dir = dirname(file);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(file)) writeFileSync(file, "{}", "utf-8");
}

function ler(file) {
  try {
    garantir(file);
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch (_) { return {}; }
}

function salvar(file, data) {
  try {
    garantir(file);
    writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.error("[ALUGUEL] Erro ao salvar:", e.message);
  }
}

function gerarId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function formatarData(data) {
  const br  = new Date(data.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(br.getDate())}/${pad(br.getMonth() + 1)}/${br.getFullYear()}, ${pad(br.getHours())}:${pad(br.getMinutes())}:${pad(br.getSeconds())}`;
}

function calcularExpiracao(quantidade, tipo) {
  const agora = new Date();
  if (tipo === "minutos") agora.setMinutes(agora.getMinutes() + quantidade);
  else if (tipo === "horas") agora.setHours(agora.getHours() + quantidade);
  else agora.setDate(agora.getDate() + quantidade);
  return agora;
}

function formatarDuracao(quantidade, tipo) {
  if (tipo === "minutos") {
    return `${String(Math.floor(quantidade / 60)).padStart(2, "0")}:${String(quantidade % 60).padStart(2, "0")}`;
  }
  if (tipo === "horas") return `${String(quantidade).padStart(2, "0")}:00`;
  return `${quantidade} dias`;
}

export function calcularTempoRestante(expiraTimestamp) {
  const diff = expiraTimestamp - Date.now();
  if (diff <= 0) return "EXPIRADO";
  const dias  = Math.floor(diff / 86400000);
  const horas = Math.floor((diff % 86400000) / 3600000);
  const mins  = Math.floor((diff % 3600000) / 60000);
  if (dias > 0) return `${dias} dia${dias !== 1 ? "s" : ""}`;
  return `${String(horas).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// ─── ALUGUÉIS ────────────────────────────────────────────────────────────────

export function registrarAluguel(groupId, quantidade, tipo, nomeGrupo = "Grupo sem nome") {
  const alugueis      = ler(ALUGUEIS_FILE);
  const id            = gerarId();
  const dataExpiracao = calcularExpiracao(quantidade, tipo);

  alugueis[groupId] = {
    id, groupId, nomeGrupo, quantidade, tipo,
    duracao        : formatarDuracao(quantidade, tipo),
    expira         : formatarData(dataExpiracao),
    expiraTimestamp: dataExpiracao.getTime(),
    registradoEm   : new Date().toISOString(),
  };

  salvar(ALUGUEIS_FILE, alugueis);
  return alugueis[groupId];
}

export function listarAlugueis() {
  return ler(ALUGUEIS_FILE);
}

export function obterAluguelDoGrupo(groupId) {
  return ler(ALUGUEIS_FILE)[groupId] || null;
}

export function temAluguelAtivo(groupId) {
  const a = ler(ALUGUEIS_FILE)[groupId];
  return !!(a && a.expiraTimestamp > Date.now());
}

export function apagarAluguelPorId(id) {
  const alugueis = ler(ALUGUEIS_FILE);
  for (const groupId in alugueis) {
    if (alugueis[groupId].id === id) {
      delete alugueis[groupId];
      salvar(ALUGUEIS_FILE, alugueis);
      return true;
    }
  }
  return false;
}

export function verificarExpirados() {
  return Object.values(ler(ALUGUEIS_FILE)).filter((a) => a.expiraTimestamp <= Date.now());
}

// ─── CHAVES ──────────────────────────────────────────────────────────────────

export function criarChave(groupId, quantidade, tipo, nomeGrupo = "Grupo sem nome") {
  const chaves = ler(CHAVES_FILE);
  const chave  = gerarId();

  chaves[chave] = {
    chave, groupId, nomeGrupo, quantidade, tipo,
    usada   : false,
    criadaEm: new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    usadaEm : null,
  };

  salvar(CHAVES_FILE, chaves);
  return chaves[chave];
}

export function obterChave(chave) {
  return ler(CHAVES_FILE)[chave.toUpperCase()] || null;
}

export function usarChave(chave) {
  const chaves = ler(CHAVES_FILE);
  const key    = chave.toUpperCase();
  if (!chaves[key] || chaves[key].usada) return false;
  chaves[key].usada   = true;
  chaves[key].usadaEm = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  salvar(CHAVES_FILE, chaves);
  return true;
}

export function removerChave(chave) {
  const chaves = ler(CHAVES_FILE);
  const key    = chave.toUpperCase();
  if (!chaves[key]) return false;
  delete chaves[key];
  salvar(CHAVES_FILE, chaves);
  return true;
}

export function listarChaves() {
  return ler(CHAVES_FILE);
}
